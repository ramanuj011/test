# agent.py
import asyncio
import re
from mcp_client import MCPHttpClient

MCP_SERVER_URL = "http://localhost:8080/mcp"


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

        async for msg in self.client.stream(payload):
            if "result" in msg and "tools" in msg["result"]:
                self.tools = msg["result"]["tools"]

        print("✅ Tools discovered:")
        for tool in self.tools:
            print(f" - {tool['name']}: {tool.get('description', '')}")

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

    async def call_tool(self, tool_name: str, arguments: dict):
        payload = {
            "jsonrpc": "2.0",
            "id": f"call-{tool_name}",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        async for msg in self.client.stream(payload):
            if "result" in msg:
                content = msg["result"].get("content", [])
                for part in content:
                    if part.get("type") == "text":
                        print("Agent:", part["text"])

    async def run(self):
        await self.initialize()

        print("\n🤖 MCP Agent ready. Type 'exit' to quit.\n")

        while True:
            user_input = input("You: ")
            if user_input.lower() in ("exit", "quit"):
                break

            tool, args = self.decide_tool(user_input)

            if not tool:
                print("Agent: I don't know which tool to use.")
                continue

            print(f"🔧 Calling tool: {tool}")
            await self.call_tool(tool, args)

        await self.client.close()


if __name__ == "__main__":
    asyncio.run(MCPAgent(MCP_SERVER_URL).run())
