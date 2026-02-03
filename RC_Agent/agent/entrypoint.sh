#!/bin/sh
set -e

if [ "$1" = "server" ] || [ -z "$1" ]; then
  exec python /app/mcp_agent.py
else
  exec python /app/mcp_agent.py "$@"
fi
