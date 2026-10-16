#!/bin/sh
set -e
cd "$(dirname "$0")"
npm ci
npm start
