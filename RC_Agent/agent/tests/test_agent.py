import pytest
import os
import sys

# Add parent directory to path to import mcp_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_agent import MCPAgent

def test_agent_initialization():
    agent = MCPAgent("http://localhost:8080/mcp", provider="openai")
    assert agent.client.url == "http://localhost:8080/mcp"
    assert agent.provider == "openai"
    assert len(agent.chat_history) == 0

@pytest.mark.asyncio
async def test_agent_history():
    agent = MCPAgent("http://localhost:8080/mcp", provider="none")
    # provider="none" will trigger rule-based fallback which also updates history
    async for _ in agent.stream_chat("add 5 and 10"):
        pass
    
    assert len(agent.chat_history) > 0
    # Check if history contains the AIMessage from the fallback
    from langchain_core.messages import AIMessage
    assert any(isinstance(m, AIMessage) for m in agent.chat_history)
