# mcp_agent.py
import asyncio
import json
import os
import logging
from typing import AsyncIterator, List, Dict, Any
from quart import Quart, render_template, request, jsonify, Response
from openai import AsyncOpenAI
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
        self.tools: List[Dict[str, Any]] = []
        
        if provider == "openai":
            self.openai = AsyncOpenAI(api_key=OPENAI_API_KEY)
            self.model = "gpt-4o"
        elif provider == "ollama":
            self.openai = AsyncOpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
            self.model = OLLAMA_MODEL
        else:
            self.openai = None
            self.model = None

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
                    self.tools = msg["result"]["tools"]
            
            logging.info("✅ Tools discovered:")
            for tool in self.tools:
                logging.info(f" - {tool['name']}: {tool.get('description', '')}")
        except Exception as e:
            logging.error(f"Failed to initialize tools: {e}")

    def _get_tools_definition(self):
        """Convert MCP tools to OpenAI function definitions"""
        openai_tools = []
        for tool in self.tools:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("inputSchema", {"type": "object", "properties": {}}),
                }
            })
        return openai_tools

    async def call_tool(self, tool_name: str, arguments: dict) -> str:
        """Call a specific MCP tool and return the output as string"""
        payload = {
            "jsonrpc": "2.0",
            "id": f"call-{tool_name}",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        result_text = []
        try:
            async for msg in self.client.stream(payload):
                if "result" in msg:
                    content = msg["result"].get("content", [])
                    for part in content:
                        if part.get("type") == "text":
                            result_text.append(part["text"])
                elif "error" in msg:
                    result_text.append(f"Error: {msg['error'].get('message', 'Unknown error')}")
        except Exception as e:
            result_text.append(f"Error calling tool: {e}")
        
        return "\n".join(result_text)

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

        # caster_get_system_info
        if any(k in msg for k in ["system", "info", "oslo", "config"]):
            return "caster_get_system_info", {}

        return None, None

    async def stream_chat(self, user_message: str) -> AsyncIterator[str]:
        """Main chat loop with LLM provider logic and rule-based fallback"""
        
        # Try LLM if provider is enabled
        if self.openai and (self.provider != "openai" or OPENAI_API_KEY):
            try:
                messages = [
                    {"role": "system", "content": "You are a helpful assistant with access to various tools. Use them when necessary to answer the user's questions."},
                    {"role": "user", "content": user_message}
                ]

                # 1. LLM decides tool call
                response = await self.openai.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=self._get_tools_definition(),
                    tool_choice="auto" if self.tools else None,
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                if tool_calls:
                    messages.append(response_message)
                    
                    for tool_call in tool_calls:
                        function_name = tool_call.function.name
                        function_args = json.loads(tool_call.function.arguments)
                        
                        yield f"🔧 {self.provider.upper()}: Executing {function_name}...\n"
                        tool_result = await self.call_tool(function_name, function_args)
                        
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": tool_result,
                        })

                    # 2. Get final response
                    final_response = await self.openai.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        stream=True
                    )
                    
                    async for chunk in final_response:
                        content = chunk.choices[0].delta.content
                        if content:
                            yield content
                    return 
                else:
                    if response_message.content:
                        yield response_message.content
                        return 
            except Exception as e:
                logging.warning(f"{self.provider.upper()} Error: {e}")
                yield f"⚠️ {self.provider.upper()} unavailable. Switching to rule-based fallback...\n"

        # Fallback: Rule-based logic
        tool, args = self.decide_tool(user_message)

        if not tool:
            yield "I don't know which tool to use. Try 'add 5 and 10' or 'show schedules'.\n"
            return

        yield f"🔧 Fallback: Executing {tool}...\n"
        tool_result = await self.call_tool(tool, args)
        yield tool_result

# Quart Application Setup
app = Quart(__name__)
agent = MCPAgent(MCP_SERVER_URL, LLM_PROVIDER)

@app.before_serving
async def startup():
    await agent.initialize()

@app.route("/")
async def index():
    return await render_template("index.html")

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
        "tools_count": len(agent.tools),
        "provider": LLM_PROVIDER
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)


