#!/bin/bash

# TODO grab app names from turbo
exec adb logcat -T 1 | grep -E "(RustStdoutStderr|DearDiary|MeStreamm)"
