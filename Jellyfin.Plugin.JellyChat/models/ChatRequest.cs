namespace Jellyfin.Plugin.JellyChat.Models;

public class ChatRequest
{
    public string? GroupId { get; set; }
    public string? SenderSessionId { get; set; }
    public string? Header { get; set; }
    public string? Text { get; set; }
    public int? TimeoutMs { get; set; }
    public string? ParticipantsCsv { get; set; }
}
