import asyncio
import json
import os
import logging
import re
from typing import AsyncIterator, List, Dict, Any, Optional
from quart import Quart, render_template, request, jsonify, Response
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, BaseMessage
from mcp_client import MCPHttpClient

# Configure logging
logging.basicConfig(level=logging.INFO)

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL") or os.environ.get("MCP_BASE_URL") or "http://localhost:8080/mcp"
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower() # openai, ollama, or none

# OpenAI Config
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Ollama Config
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434/v1")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

class MCPAgent:
    def __init__(self, mcp_url: str, provider: str = "openai"):
        self.client = MCPHttpClient(mcp_url)
        self.provider = provider
        self.tools_metadata: List[Dict[str, Any]] = []
        
        self.llm: Optional[ChatOpenAI] = None
        if provider == "openai":
            if OPENAI_API_KEY:
                self.llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY)
        elif provider == "ollama":
            self.llm = ChatOpenAI(
                base_url=OLLAMA_BASE_URL, 
                api_key="ollama", # Placeholder for Ollama
                model=OLLAMA_MODEL
            )

    async def initialize(self):
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
            logging.error(f"Failed to initialize tools: {e}")

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
                
                messages: List[BaseMessage] = [
                    SystemMessage(content="You are a helpful assistant with access to tools. Use them to provide accurate answers."),
                    HumanMessage(content=user_message)
                ]

                # 1. First LLM pass
                ai_msg = await llm_with_tools.ainvoke(messages)
                messages.append(ai_msg)

                if ai_msg.tool_calls:
                    for tool_call in ai_msg.tool_calls:
                        tool_name = tool_call["name"]
                        tool_args = tool_call["args"]
                        
                        yield f"🔧 {self.provider.upper()}: Executing {tool_name}...\n"
                        
                        # Find and call the matching tool
                        result = "Tool not found"
                        for t in tools:
                            if t.name == tool_name:
                                result = await t.ainvoke(tool_args)
                                break
                        
                        messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))

                    # 2. Final response pass
                    async for chunk in self.llm.astream(messages):
                        if chunk.content:
                            yield str(chunk.content)
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
                yield f"⚠️ {self.provider.upper()} unavailable via LangChain. Falling back...\n"

        # Fallback: Rule-based
        tool_name, args = self.decide_tool(user_message)
        if tool_name:
            yield f"🔧 Fallback: Executing {tool_name}...\n"
            result = await self._call_mcp_tool(tool_name, args)
            yield result
        else:
            yield "I don't know how to help with that. Try 'add 5 and 10' or 'show schedules'."

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
        "provider": LLM_PROVIDER,
        "langchain_enabled": True
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)


