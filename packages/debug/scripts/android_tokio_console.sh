#!/bin/bash
set -e

adb forward tcp:6669 tcp:6669
exec "$(dirname "$0")/tokio_console.sh"
