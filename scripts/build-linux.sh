#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/../web-src"
npm install
npm run build
cd ..

mise exec dotnet@9.0 -- dotnet publish Jellyfin.Plugin.JellyChat/Jellyfin.Plugin.JellyChat.csproj -c Release
