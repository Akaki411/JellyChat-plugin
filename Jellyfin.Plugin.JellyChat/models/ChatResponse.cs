namespace Jellyfin.Plugin.JellyChat.Models;

public class ChatResponse
{
    public int Attempted { get; set; }
    public int Sent { get; set; }
    public int Failed { get; set; }
}
