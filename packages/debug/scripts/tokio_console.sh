#!/bin/bash
set -e

if ! command -v tokio-console >/dev/null 2>&1; then
  cargo install tokio-console
fi

exec tokio-console
