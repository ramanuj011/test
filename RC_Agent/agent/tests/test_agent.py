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
