using System;
using System.IO;

namespace Jellyfin.Plugin.JellyChat.Infrastructure;

public static class WebTransformer
{
    private const string MarkerPrefix = "<!-- JellyChat:start";
    private const string MarkerEnd = "<!-- JellyChat:end -->";
    private const string BodyCloseTag = "</body>";
    private const string ScriptResourcePath = "Jellyfin.Plugin.JellyChat.web.interface.js";

    public static string? TransformIndexHtml(string html, string version)
    {
        if (string.IsNullOrEmpty(html))
        {
            return null;
        }

        string startMarker = MarkerPrefix + " v" + version + " -->";
        if (html.Contains(startMarker, StringComparison.Ordinal))
        {
            return null;
        }

        string cleaned = RemoveExistingBlock(html);

        string script = GetSyncChatScript();
        if (string.IsNullOrEmpty(script))
        {
            return null;
        }

        int bodyIndex = cleaned.LastIndexOf(BodyCloseTag, StringComparison.Ordinal);
        if (bodyIndex < 0)
        {
            return null;
        }

        string block = startMarker + "<script>" + script + "</script>" + MarkerEnd;
        return cleaned.Insert(bodyIndex, block);
    }

    public static string GetSyncChatScript()
    {
        using Stream? stream = typeof(WebTransformer).Assembly.GetManifestResourceStream(ScriptResourcePath);
        if (stream is null)
        {
            return string.Empty;
        }

        using StreamReader reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static string RemoveExistingBlock(string html)
    {
        int start = html.IndexOf(MarkerPrefix, StringComparison.Ordinal);
        if (start < 0)
        {
            return html;
        }

        int end = html.IndexOf(MarkerEnd, start, StringComparison.Ordinal);
        if (end < 0)
        {
            return html;
        }

        return html.Remove(start, (end - start) + MarkerEnd.Length);
    }
}
