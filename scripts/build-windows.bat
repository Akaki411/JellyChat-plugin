@echo off

cd ../web-src
call npm install --verbose
if errorlevel 1 (
    echo [ERROR] Dependency List error
    pause
    pause & exit /b 1
)

call npm run build
if errorlevel 1 (
    echo [ERROR] The frontend build failed with an error
    pause
    pause & exit /b 1
)
cd ..

call mise exec dotnet@9.0 -- dotnet publish Jellyfin.Plugin.JellyChat/Jellyfin.Plugin.JellyChat.csproj -c Release
if errorlevel 1 (
    echo [ERROR] The plugin build failed with an error
    pause
    pause & exit /b 1
)