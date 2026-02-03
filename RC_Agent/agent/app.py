import re
import os
import asyncio
import logging
from quart import Quart, render_template, request, jsonify
from mcp import ClientSession
from mcp.client.sse import sse_client

from mcp_client import MCPHttpClient

logging.basicConfig(level=logging.INFO)

app = Quart(__name__)

MCP_URL = os.environ.get("MCP_SERVER_URL") or os.environ.get("MCP_BASE_URL") or "http://localhost:8080/mcp"

mcp = MCPHttpClient(MCP_URL)


def decide_tool(user_message: str):
    msg = user_message.lower()

    if "map" in msg or "roads" in msg:
        return {
            "method": "tools/call",
            "params": {
                "name": "get_map_data",
                "arguments": {
                    "layer": "roads",
                    "bbox": [72.8, 18.9, 73.1, 19.2],
                },
            },
        }

    return {
        "method": "tools/list",
        "params": {},
    }

@app.route("/")
async def index():
    return await render_template("index.html")

@app.route("/api/chat", methods=["POST"])
async def chat():
    payload = await request.get_json()  
    user_message = payload.get("message", "")

    mcp_request = {
        "jsonrpc": "2.0",
        "id": "chat-1",
        **decide_tool(user_message),
    }

    async def stream_chat():
        async for msg in mcp.stream(mcp_request):
            if "result" in msg:
                content = msg["result"].get("content", [])
                for part in content:
                    if part["type"] == "text":
                        yield part["text"] + "\n"

    return StreamingResponse(stream_chat(), media_type="text/plain")



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
