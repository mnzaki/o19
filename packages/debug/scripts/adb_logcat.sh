#!/bin/bash

# TODO grab app names from turbo

set -x
if [ "$1" = "-f" ]; then
  exec adb logcat -T 1 | grep --color=always -E "(RustStdoutStderr|O19-ANDROID|Foundframe|DearDiary|MeStreamm)"
else
  exec adb logcat -T 1 | grep --color=always -E "RustStdoutStderr|O19-ANDROID|Foundframe"
fi
