# mcp_agent.py
import asyncio
import re
import os
import logging
from quart import Quart, render_template, request, jsonify, Response
from mcp_client import MCPHttpClient

# Configure logging
logging.basicConfig(level=logging.INFO)

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL") or os.environ.get("MCP_BASE_URL") or "http://localhost:8080/mcp"

class MCPAgent:
    def __init__(self, mcp_url: str):
        self.client = MCPHttpClient(mcp_url)
        self.tools = []

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

    def decide_tool(self, user_message: str):
        """
        Simple rule-based planner tailored to your MCP server.
        """
        msg = user_message.lower()

        # calculate_sum
        if any(k in msg for k in ["add", "sum", "plus"]):
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

    async def stream_chat(self, user_message: str):
        tool, args = self.decide_tool(user_message)

        if not tool:
            yield "I don't know which tool to use for that request. Try 'add 5 and 10' or 'show schedules'.\n"
            return

        payload = {
            "jsonrpc": "2.0",
            "id": f"call-{tool}",
            "method": "tools/call",
            "params": {
                "name": tool,
                "arguments": args,
            },
        }

        try:
            async for msg in self.client.stream(payload):
                if "result" in msg:
                    content = msg["result"].get("content", [])
                    for part in content:
                        if part.get("type") == "text":
                            yield part["text"] + "\n"
                elif "error" in msg:
                    yield f"Error: {msg['error'].get('message', 'Unknown error')}\n"
        except Exception as e:
            yield f"Error calling tool: {e}\n"

# Quart Application Setup
app = Quart(__name__)
agent = MCPAgent(MCP_SERVER_URL)

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

    return Response(agent.stream_chat(user_message), mimetype="text/plain")

@app.route("/api/status")
async def status():
    return jsonify({"connected": True, "tools_count": len(agent.tools)})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)

