#!/bin/sh
set -e
cd /app
bun install
exec "$@"
