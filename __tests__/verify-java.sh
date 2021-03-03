#!/bin/sh

if [ -z "$1" ]; then
  echo "::error::Must supply java version argument"
  exit 1
fi

java_version="$(java -version 2>&1)"
echo "Found java version: $java_version"
grep_result=$(echo $java_version | grep "^openjdk version \"$1")
if [ -z "$grep_result" ]; then
  echo "::error::Unexpected version"
  exit 1
fi

if [ -z "$2" ]; then
  echo "::error::Must supply java path argument"
  exit 1
fi

if [ "$2" != "$JAVA_HOME" ]; then
  echo "::error::Unexpected path"
  exit 1
fi
