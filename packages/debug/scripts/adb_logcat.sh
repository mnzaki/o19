#!/bin/bash

# TODO grab app names from turbo

if [ "$1" = "-f" ]; then
  exec adb logcat -T 1 | grep --color=always -E "(RustStdoutStderr|DearDiary|MeStreamm)"
else
  exec adb logcat -T 1 | grep --color=always -E "RustStdoutStderr"
fi
