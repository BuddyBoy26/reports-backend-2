#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

# Execute the original command
exec "$@"
