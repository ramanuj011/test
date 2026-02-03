#!/bin/sh
set -e

if [ "$1" = "server" ] || [ -z "$1" ]; then
  exec python /app/app.py
else
  exec python /app/agent.py "$@"
fi
