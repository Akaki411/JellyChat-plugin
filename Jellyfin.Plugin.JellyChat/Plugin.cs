using System;
using Jellyfin.Plugin.JellyChat.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.JellyChat;

public class Plugin : BasePlugin<Configuration.Configuration>
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer) : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "JellyChat";

    public override Guid Id => Guid.Parse("d3e50ec8-d597-488a-828f-db31d69c095a");

    public static Plugin? Instance { get; private set; }
}
