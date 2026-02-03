# mcp_client.py
import json
import httpx
from typing import AsyncIterator

class MCPHttpClient:
    def __init__(self, url: str):
        self.url = url
        self.client = httpx.AsyncClient(timeout=None)

    async def close(self):
        await self.client.aclose()

    async def stream(self, payload: dict) -> AsyncIterator[dict]:
        """
        Send an MCP request and yield streamed JSON messages.
        Handles both raw JSON and SSE (data: ...) formats.
        """
        buffer = ""

        async with self.client.stream(
            "POST",
            self.url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            },
        ) as resp:
            resp.raise_for_status()

            async for chunk in resp.aiter_text():
                buffer += chunk

                # Split by event separator (double newline for SSE, or single for multiple JSONs)
                # But more generally, we look for individual data: lines or pure JSON lines.
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Handle SSE format: "data: {...}"
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str:
                            try:
                                yield json.loads(data_str)
                            except json.JSONDecodeError:
                                pass # Wait for more data if needed or log error
                        continue
                    
                    # Handle direct JSON format: "{...}"
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        # might be part of a larger buffer, but our logic assumes line-based split is safe for MCP
                        pass

