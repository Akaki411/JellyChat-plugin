# Syncplay Chat

`Syncplay Chat` adds a chat button during SyncPlay sessions and sends chat messages as Jellyfin toasts to devices in the same SyncPlay group.

https://github.com/user-attachments/assets/69be29fa-b328-45c5-9967-f9582b0dd7d1

The chat UI is a small **React + Vite** app (in [`web-src/`](web-src)) that is
bundled into a single self-contained `sync-chat.js` file. That file is embedded
into the plugin assembly and injected into the Jellyfin web client as one
`<script>` tag. All styling lives in one BEM stylesheet
([`web-src/src/styles/sync-chat.css`](web-src/src/sync-chat.css)) which
Vite inlines into the bundle at build time.

## Pre-requisites

- Jellyfin server compatible with `Jellyfin.Controller` / `Jellyfin.Model` `10.11.8`.
- .NET SDK 9.0 for building the plugin.
- Node.js 18+ and npm for building the React frontend.
- Jellyfin [File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation) plugin installed and enabled.
    - Without File Transformation, `sync-chat.js` will not be injected into the web client.

## Installation

1. In Jellyfin, go to Dashboard > Plugins > Catalog > ⚙️
2. Click ➕ and give the repository a name (e.g., "Jellfin SyncPlay Chat").
3. Set the Repository URL to:
    ```
    https://raw.githubusercontent.com/AbhayVAshokan/jellyfin-syncplay-chat/master/manifest.json
    ```
4. Click Save.
5. Go to the Catalog tab, find `SyncPlay Chat` in the list, and click Install.
6. Restart your Jellyfin server to complete the installation.

## Local Development Deploy

From repository root:

```bash
./scripts/deploy-dev.sh
```

What it does:

- Publishes the solution in Debug.
- Copies publish output to Jellyfin plugin directory.

Environment overrides:

```bash
JELLYFIN_DATA_DIR="$HOME/Library/Application Support/jellyfin" \
PLUGIN_DIR="$HOME/Library/Application Support/jellyfin/plugins/SyncPlayChat" \
./scripts/deploy-dev.sh
```

Notes:

- `PLUGIN_DIR` takes precedence over `JELLYFIN_DATA_DIR`.
- Default `JELLYFIN_DATA_DIR` is `$HOME/Library/Application Support/jellyfin`.
- Restart Jellyfin after deploy.

## Frontend (React + Vite)

The chat UI source lives in [`web-src/`](web-src). Building it regenerates the
embedded bundle at `Jellyfin.Plugin.SyncPlayChat/Web/sync-chat.js`.

Install dependencies once:

```bash
cd web-src
npm install
```

Build the bundle (writes `../Jellyfin.Plugin.SyncPlayChat/Web/sync-chat.js`):

```bash
npm run build
```

Live preview while editing styles/markup (the widget is forced visible because
there is no Jellyfin `ApiClient` outside the web client; sending is disabled):

```bash
npm run dev
```

> Rebuild the frontend whenever you change anything under `web-src/` **before**
> building the .NET plugin — the C# project embeds the already-built
> `sync-chat.js`.

## Manual Build and Install

Build the plugin in two steps — first the frontend bundle, then the .NET plugin:

```bash
# 1. Build the React frontend -> Jellyfin.Plugin.SyncPlayChat/Web/sync-chat.js
cd web-src
npm install
npm run build
cd ..

# 2. Build/publish the .NET plugin (embeds sync-chat.js)
mise exec dotnet@9.0 -- dotnet publish Jellyfin.Plugin.SyncPlayChat/Jellyfin.Plugin.SyncPlayChat.csproj -c Release
```

If you only changed C# (not the frontend) and `Web/sync-chat.js` is already
built, step 2 alone is enough.

Output:

- `Jellyfin.Plugin.SyncPlayChat/bin/Release/net9.0/publish/`

Install manually by copying publish output into a plugin folder such as:

- macOS: `$HOME/Library/Application Support/jellyfin/plugins/SyncPlayChat`
- Linux: `$HOME/.local/share/jellyfin/plugins/SyncPlayChat`
- Windows: `%LOCALAPPDATA%\jellyfin\plugins\SyncPlayChat`

Then restart Jellyfin.

## Releasing a New Version

1. Build the frontend bundle, then publish release output:
    ```bash
    (cd web-src && npm install && npm run build)
    dotnet publish Jellyfin.Plugin.SyncPlayChat/Jellyfin.Plugin.SyncPlayChat.csproj -c Release
    ```
2. Zip the contents of `Jellyfin.Plugin.SyncPlayChat/bin/Release/net9.0/publish/` (not the folder itself):
    ```bash
    cd Jellyfin.Plugin.SyncPlayChat/bin/Release/net9.0/publish
    zip -r Jellyfin.Plugin.SyncPlayChat_<version>.zip .
    ```
3. Create a new GitHub release with tag `v<version>` (e.g., `v1.0.2.0`).
4. Attach the zip file (`Jellyfin.Plugin.SyncPlayChat_<version>.zip`) to the release.
5. Add release notes in the release body describing what changed.
6. Publish the release.

The `release.yaml` workflow will automatically:
- Compute the checksum of the attached zip.
- Prepend a new version entry to `manifest.json`.
- Update `Directory.Build.props` with the new version.
- Commit and push to `master`.

Plugin ID: `a69744cc-2281-48bf-adef-8e451a16ff71`

## Troubleshooting

- Chat button does not appear:
    - Verify user is in an active SyncPlay group.
    - Verify File Transformation plugin is installed and enabled.
    - Restart Jellyfin after plugin deploy/update.
- Messages only appear on one device:
    - Check browser console for `[SyncPlayChat]` send failure logs.
    - Confirm target devices are active sessions visible to Jellyfin.

## License

See `LICENSE`.
