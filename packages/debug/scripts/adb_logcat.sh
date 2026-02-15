#!/bin/bash

# TODO grab app names from turbo
#exec adb logcat -T 1 | grep --color=always -E "(RustStdoutStderr|DearDiary|MeStreamm)"
exec adb logcat -T 1 | grep --color=always -E "RustStdoutStderr"
