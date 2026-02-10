import asyncio
import json
import os
import logging
import re
from typing import AsyncIterator, List, Dict, Any, Optional
from quart import Quart, render_template, request, jsonify, Response
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, BaseMessage, AIMessage
from mcp_client import MCPHttpClient

# Configure logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
TIMEOUT = int(os.environ.get("TIMEOUT", "120"))
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))

# Silence chatty loggers even in DEBUG mode
if LOG_LEVEL == "DEBUG":
    for logger_name in ["asyncio", "httpx", "httpcore", "hpack", "quartic", "hypercorn"]:
        logging.getLogger(logger_name).setLevel(logging.INFO)

def format_for_log(data: Any) -> str:
    """Helper to format prompts and responses for readable logs with real newlines."""
    if isinstance(data, list):
        # Format LangChain messages
        lines = []
        for msg in data:
            role = "UNKNOWN"
            if hasattr(msg, "type"):
                role = msg.type.upper()
            content = str(msg.content)
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                content += f"\nTool Calls: {json.dumps(msg.tool_calls, indent=2)}"
            lines.append(f"--- {role} ---\n{content}")
        return "\n" + "\n".join(lines)
    elif hasattr(data, "content"):
        # Single message
        role = getattr(data, "type", "AI").upper()
        content = str(data.content)
        if hasattr(data, "tool_calls") and data.tool_calls:
             content += f"\nTool Calls: {json.dumps(data.tool_calls, indent=2)}"
        return f"\n--- {role} ---\n{content}"
    return f"\n{str(data)}"

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL") or os.environ.get("MCP_BASE_URL") or "http://localhost:8080/mcp"
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower() # openai, ollama, or none

# OpenAI Config
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Ollama Config
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434/v1")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

# print all the environment variables
print("MCP_SERVER_URL", MCP_SERVER_URL)
print("LLM_PROVIDER", LLM_PROVIDER)
print("OLLAMA_BASE_URL", OLLAMA_BASE_URL)
print("OLLAMA_MODEL", OLLAMA_MODEL) 

class MCPAgent:
    def __init__(self, mcp_url: str, provider: str = "openai"):
        self.client = MCPHttpClient(mcp_url)
        self.provider = provider
        self.tools_metadata: List[Dict[str, Any]] = []
        self.prompts_metadata: List[Dict[str, Any]] = []
        self.chat_history: List[BaseMessage] = []
        
        self.llm: Optional[ChatOpenAI] = None
        if provider == "openai":
            if OPENAI_API_KEY:
                self.llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY, request_timeout=TIMEOUT)
        elif provider == "ollama":
            self.llm = ChatOllama(
                base_url=OLLAMA_BASE_URL, 
                api_key="ollama", # Placeholder for Ollama
                model=OLLAMA_MODEL,
                timeout=TIMEOUT
            )

    async def initialize(self):
        """Discover tools and prompts from MCP server"""
        await self.list_tools()
        await self.list_prompts()

    async def list_tools(self):
        """Discover tools from MCP server"""
        payload = {
            "jsonrpc": "2.0",
            "id": "tools-list",
            "method": "tools/list",
        }

        try:
            async for msg in self.client.stream(payload):
                if "result" in msg and "tools" in msg["result"]:
                    self.tools_metadata = msg["result"]["tools"]
            
            logging.info("✅ Tools discovered:")
            for tool_meta in self.tools_metadata:
                logging.info(f" - {tool_meta['name']}: {tool_meta.get('description', '')}")
        except Exception as e:
            logging.error(f"Failed to discover tools: {e}")

    async def list_prompts(self):
        """Discover prompts from MCP server"""
        payload = {
            "jsonrpc": "2.0",
            "id": "prompts-list",
            "method": "prompts/list",
        }

        try:
            async for msg in self.client.stream(payload):
                if "result" in msg and "prompts" in msg["result"]:
                    self.prompts_metadata = msg["result"]["prompts"]
            
            logging.info("✅ Prompts discovered:")
            for prompt_meta in self.prompts_metadata:
                logging.info(f" - {prompt_meta['name']}: {prompt_meta.get('description', '')}")
        except Exception as e:
            logging.error(f"Failed to discover prompts: {e}")

    async def get_prompt(self, prompt_name: str, arguments: dict = None) -> Optional[Dict[str, Any]]:
        """Retrieve a specific prompt from MCP server"""
        payload = {
            "jsonrpc": "2.0",
            "id": f"get-prompt-{prompt_name}",
            "method": "prompts/get",
            "params": {
                "name": prompt_name,
                "arguments": arguments or {},
            },
        }

        try:
            async for msg in self.client.stream(payload):
                if "result" in msg:
                    return msg["result"]
                elif "error" in msg:
                    logging.error(f"Error getting prompt {prompt_name}: {msg['error']}")
        except Exception as e:
            logging.error(f"Failed to get prompt {prompt_name}: {e}")
        return None

    async def _call_mcp_tool(self, tool_name: str, arguments: dict) -> str:
        """Helper to call an MCP tool via the HTTP client"""
        payload = {
            "jsonrpc": "2.0",
            "id": f"call-{tool_name}",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        result_parts = []
        try:
            async for msg in self.client.stream(payload):
                if "result" in msg:
                    content = msg["result"].get("content", [])
                    for part in content:
                        if part.get("type") == "text":
                            result_parts.append(part["text"])
                elif "error" in msg:
                    result_parts.append(f"Error: {msg['error'].get('message', 'Unknown error')}")
        except Exception as e:
            result_parts.append(f"Error calling tool {tool_name}: {e}")
        
        return "\n".join(result_parts)

    def _get_langchain_tools(self):
        """Dynamic tool creation for LangChain"""
        from langchain_core.tools import StructuredTool

        lc_tools = []
        for meta in self.tools_metadata:
            # We create a closure to capture the tool name
            def create_tool_func(name):
                async def func(**kwargs):
                    return await self._call_mcp_tool(name, kwargs)
                return func

            lc_tools.append(StructuredTool.from_function(
                coroutine=create_tool_func(meta["name"]),
                name=meta["name"],
                description=meta.get("description", f"Call {meta['name']} tool"),
                args_schema=None # Derived from inputSchema if needed
            ))
        return lc_tools

    def decide_tool(self, user_message: str):
        """
        Simple rule-based planner tailored to your MCP server (fallback).
        """
        msg = user_message.lower()

        # calculate_sum
        if any(k in msg for k in ["add", "sum", "plus"]):
            import re
            numbers = list(map(int, re.findall(r"\d+", msg)))
            if len(numbers) >= 2:
                return "calculate_sum", {
                    "a": numbers[0],
                    "b": numbers[1],
                }

        # caster_get_schedules
        if "schedule" in msg:
            return "caster_get_schedules", {}

        # Domains
        if any(k in msg for k in ["domains", "list domains"]):
            return "get_domains", {}
        if any(k in msg for k in ["my workspace", "myworkspace", "workspace"]):
            return "get_myworkspace", {}
        if any(k in msg for k in ["recent", "recents"]):
            return "get_recents", {}

        # Health/Status
        if any(k in msg for k in ["health", "status", "rcaster status"]):
            return "get_rcaster_status", {}
        if any(k in msg for k in ["system info", "caster info"]):
            return "caster_get_system_info", {}

        # Messaging
        if any(k in msg for k in ["messaging profiles", "profiles"]):
            return "get_messaging_profiles", {}
        if "google chat" in msg:
            return "test_google_chat_connection", {}

        # Access/Groups
        if any(k in msg for k in ["user groups", "groups list"]):
            return "get_user_group_lists", {}
        if any(k in msg for k in ["access lists", "accesslist"]):
            return "get_access_lists", {}

        # Logs
        if any(k in msg for k in ["delete logs", "remove logs"]):
            return "delete_job_logs", {"logIds": []} # Template args

        # Features
        if any(k in msg for k in ["features", "feature list"]):
            return "get_feature_list", {}

        return None, None

    async def stream_chat(self, user_message: str) -> AsyncIterator[str]:
        """Main chat loop using LangChain with rule-based fallback"""
        
        if self.llm:
            try:
                tools = self._get_langchain_tools()
                llm_with_tools = self.llm.bind_tools(tools)
                
                if not self.chat_history:
                    sys_content = "You are a helpful assistant with access to tools. Use them to provide accurate answers."
                    if self.provider == "ollama":
                        sys_content += (
                            "\n\nTo use a tool, you MUST output a tool call in the following format:\n"
                            "{\"name\": \"tool_name\", \"arguments\": {\"arg1\": \"value\"}}\n"
                            "USE ONLY 'name' and 'arguments' as keys. Do not use 'tool_name' as a key. "
                            "Output only the tool call when you need information."
                        )
                    self.chat_history.append(SystemMessage(content=sys_content))
                
                self.chat_history.append(HumanMessage(content=user_message))
                import time
                start_time = time.time()
                logging.info(f"🚀 Invoking {self.provider.upper()} LLM...")
                logging.debug(f"🔍 {self.provider.upper()} Prompt: {format_for_log(self.chat_history)}")

                # 1. First LLM pass
                ai_msg = await llm_with_tools.ainvoke(self.chat_history)
                logging.info(f"⏱️ {self.provider.upper()} first pass took {time.time() - start_time:.2f}s")
                logging.debug(f"🔍 {self.provider.upper()} First Pass Response: {format_for_log(ai_msg)}")
                self.chat_history.append(ai_msg)

                if not ai_msg.tool_calls and self.provider == "ollama":
                    # Try manual parsing for models like phi4-mini using balanced brace matching
                    content = ai_msg.content
                    potential_blocks = []
                    for i in range(len(content)):
                        if content[i] == '{':
                            count = 0
                            for j in range(i, len(content)):
                                if content[j] == '{':
                                    count += 1
                                elif content[j] == '}':
                                    count -= 1
                                if count == 0:
                                    potential_blocks.append(content[i:j+1])
                                    break
                    
                    found_calls = []
                    valid_blocks = []
                    for block in potential_blocks:
                        try:
                            potential_call = json.loads(block)
                            if isinstance(potential_call, dict):
                                # Support both 'name' and 'tool_name' (model hallucination)
                                t_name = potential_call.get("name") or potential_call.get("tool_name")
                                t_args = potential_call.get("arguments") or potential_call.get("args") or {}
                                
                                # Shorthand support: {"tool_name": {...}}
                                if not t_name and len(potential_call) == 1:
                                    first_key = list(potential_call.keys())[0]
                                    if isinstance(potential_call[first_key], dict):
                                        t_name = first_key
                                        t_args = potential_call[first_key]
                                
                                if t_name:
                                    found_calls.append({
                                        "name": t_name,
                                        "args": t_args,
                                        "id": f"manual-{len(found_calls)}"
                                    })
                                    valid_blocks.append(block)
                        except:
                            continue
                    
                    if found_calls:
                        ai_msg.tool_calls = found_calls
                        # Remove the JSON blocks from content so they aren't yielded
                        for block in valid_blocks:
                            ai_msg.content = ai_msg.content.replace(block, "")
                        ai_msg.content = ai_msg.content.strip()

                if ai_msg.tool_calls:
                    for tool_call in ai_msg.tool_calls:
                        tool_name = tool_call["name"]
                        tool_args = tool_call["args"]
                        
                        yield f"🔧 WebFOCUS Assistant: Executing {tool_name}...\n"
                        
                        # Find and call the matching tool
                        result = "Tool not found"
                        for t in tools:
                            if t.name == tool_name:
                                result = await t.ainvoke(tool_args)
                                break
                        
                        self.chat_history.append(ToolMessage(content=str(result), tool_call_id=tool_call.get("id", "manual-id")))

                    # 2. Final response pass
                    if self.provider == "ollama":
                        # Hint to help smaller models summarize rather than repeat tools
                        self.chat_history.append(HumanMessage(content="Use the tool results above to answer my original question. Do not call any more tools."))

                    logging.info(f"🚀 Invoking {self.provider.upper()} for final summary...")
                    logging.debug(f"🔍 {self.provider.upper()} Summary Prompt: {format_for_log(self.chat_history)}")
                    start_summary = time.time()
                    full_response = ""
                    async for chunk in self.llm.astream(self.chat_history):
                        if chunk.content:
                            full_response += str(chunk.content)
                            yield str(chunk.content)
                    
                    logging.debug(f"🔍 {self.provider.upper()} Summary Response: {format_for_log(full_response)}")
                    
                    if full_response:
                        logging.info(f"⏱️ {self.provider.upper()} summary took {time.time() - start_summary:.2f}s")
                        self.chat_history.append(AIMessage(content=full_response))
                    return
                else:
                    if ai_msg.content:
                        yield str(ai_msg.content)
                        return

            except asyncio.CancelledError:
                logging.info("Stream cancelled by client")
                raise
            except Exception as e:
                logging.warning(f"LangChain {self.provider.upper()} Error: {e}")
                yield f"⚠️ WebFOCUS Assistant unavailable via LangChain. Falling back...\n"

        # Fallback: Rule-based
        tool_name, args = self.decide_tool(user_message)
        if tool_name:
            yield f"🔧 WebFOCUS Assistant: Executing {tool_name}...\n"
            result = await self._call_mcp_tool(tool_name, args)
            self.chat_history.append(AIMessage(content=result))
            yield result
        else:
            msg = "I don't know how to help with that. Try 'add 5 and 10' or 'show schedules'."
            self.chat_history.append(AIMessage(content=msg))
            yield msg

# Quart Application Setup
app = Quart(__name__)
agent = MCPAgent(MCP_SERVER_URL, LLM_PROVIDER)

@app.before_serving
async def startup():
    await agent.initialize()

@app.route("/")
async def index():
    # Dynamically generate suggestions from tool metadata if available
    suggestions = []
    if agent.tools_metadata:
        # Pick top 5 tools or specific ones
        for tool in agent.tools_metadata[:6]:
            name = tool['name'].replace('_', ' ').capitalize()
            suggestions.append(name)
    else:
        # Fallback to defaults
        suggestions = [
            "Show available domains",
            "Check ReportCaster status",
            "List messaging profiles",
            "Get system info",
            "Show user groups"
        ]
    return await render_template("index.html", suggestions=suggestions)

@app.route("/api/chat", methods=["POST"])
async def chat():
    data = await request.get_json()
    user_message = data.get("message", "")
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    if LLM_PROVIDER == "openai" and not OPENAI_API_KEY:
        return jsonify({"error": "OPENAI_API_KEY not configured"}), 500

    return Response(agent.stream_chat(user_message), mimetype="text/plain")

@app.route("/api/status")
async def status():
    return jsonify({
        "connected": True, 
        "tools_count": len(agent.tools_metadata),
        "prompts_count": len(agent.prompts_metadata),
        "provider": LLM_PROVIDER,
        "langchain_enabled": True
    })

@app.route("/api/prompts")
async def list_prompts():
    return jsonify(agent.prompts_metadata)

@app.route("/api/prompt/<name>")
async def get_prompt_details(name):
    args = request.args.to_dict()
    prompt_data = await agent.get_prompt(name, args)
    if not prompt_data:
        return jsonify({"error": "Prompt not found or error retrieving it"}), 404
    return jsonify(prompt_data)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)


