using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Controller.SyncPlay;
using MediaBrowser.Controller.SyncPlay.Requests;
using MediaBrowser.Model.Session;
using MediaBrowser.Model.SyncPlay;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Jellyfin.Plugin.JellyChat.Models;

namespace Jellyfin.Plugin.JellyChat.Api;

[ApiController]
[Route("SyncPlayChat")]
[Authorize]
public class ChatController : ControllerBase
{
    private const int DefaultTimeoutMs = 4000;
    private const string DefaultHeader = "JellyChat";

    private readonly ISessionManager _sessionManager;
    private readonly IUserManager _userManager;
    private readonly ISyncPlayManager _syncPlayManager;

    public ChatController(ISessionManager sessionManager, IUserManager userManager, ISyncPlayManager syncPlayManager)
    {
        _sessionManager = sessionManager;
        _userManager = userManager;
        _syncPlayManager = syncPlayManager;
    }

    [HttpPost("Send")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatResponse>> Send([FromBody, Required] ChatRequest request)
    {
        if (request is null)
        {
            return BadRequest("Request body is required.");
        }

        string text = (request.Text ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(text))
        {
            return BadRequest("Text is required.");
        }

        string header = string.IsNullOrWhiteSpace(request.Header) ? DefaultHeader : request.Header.Trim();
        int timeoutMs = request.TimeoutMs is > 0 ? request.TimeoutMs.Value : DefaultTimeoutMs;
        MessageReply? replyTo = request.ReplyTo;

        Guid userId = ResolveCurrentUserId();
        if (userId == Guid.Empty)
        {
            return BadRequest("Could not resolve current user id.");
        }

        List<SessionInfo> allSessions = _sessionManager.Sessions.ToList();
        SessionInfo? controllingSession = ResolveControllingSession(allSessions, userId, request.SenderSessionId);
        if (controllingSession is null)
        {
            return BadRequest("Current session not found.");
        }

        string controllingSessionId = controllingSession.Id;

        List<GroupInfoDto> visibleGroups = _syncPlayManager.ListGroups(controllingSession, new ListGroupsRequest());

        List<string> participantHints = ParseParticipantHints(request.ParticipantsCsv);
        GroupInfoDto? targetGroup = ResolveTargetGroup(visibleGroups, request.GroupId, participantHints);
        if (targetGroup is null)
        {
            return Ok(new ChatResponse());
        }

        List<string> allowedSessionIds = ResolveAllowedSessionIds(request, allSessions, controllingSessionId, targetGroup);
        if (allowedSessionIds.Count == 0)
        {
            return Ok(new ChatResponse());
        }

        GeneralCommand command = new GeneralCommand
        {
            Name = GeneralCommandType.DisplayMessage
        };
        command.Arguments["Header"] = header;
        command.Arguments["Text"] = text;
        command.Arguments["TimeoutMs"] = timeoutMs.ToString(CultureInfo.InvariantCulture);
        if (replyTo is not null && (!string.IsNullOrWhiteSpace(replyTo.Author) || !string.IsNullOrWhiteSpace(replyTo.Text)))
        {
            command.Arguments["ReplyTo"] = JsonSerializer.Serialize(replyTo);
        }

        int sent = 0;
        int failed = 0;

        foreach (string sessionId in allowedSessionIds)
        {
            try
            {
                await _sessionManager.SendGeneralCommand(
                    controllingSessionId,
                    sessionId,
                    command,
                    CancellationToken.None).ConfigureAwait(false);
                sent++;
            }
            catch
            {
                failed++;
            }
        }

        return Ok(new ChatResponse
        {
            Attempted = allowedSessionIds.Count,
            Sent = sent,
            Failed = failed
        });
    }

    private static List<string> ResolveAllowedSessionIds(ChatRequest request, List<SessionInfo> allSessions, string controllingSessionId, GroupInfoDto targetGroup)
    {
        List<string> result = new List<string>();
        Dictionary<string, SessionInfo> sessionById = allSessions
            .Where(static s => !string.IsNullOrWhiteSpace(s.Id))
            .GroupBy(static s => s.Id, StringComparer.Ordinal)
            .ToDictionary(static g => g.Key, static g => g.First(), StringComparer.Ordinal);

        if (sessionById.TryGetValue(controllingSessionId, out SessionInfo? controllingSession)
            && controllingSession.UserId != Guid.Empty)
        {
            AddSessionsForUser(result, allSessions, controllingSession.UserId);
        }

        if (!string.IsNullOrWhiteSpace(request.SenderSessionId)
            && sessionById.TryGetValue(request.SenderSessionId, out SessionInfo? senderSession)
            && senderSession.UserId != Guid.Empty)
        {
            AddSessionsForUser(result, allSessions, senderSession.UserId);
        }

        HashSet<string> participantSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string participant in targetGroup.Participants)
        {
            if (!string.IsNullOrWhiteSpace(participant))
            {
                participantSet.Add(participant.Trim());
            }
        }

        foreach (string participant in ParseParticipantHints(request.ParticipantsCsv))
        {
            if (!string.IsNullOrWhiteSpace(participant))
            {
                participantSet.Add(participant.Trim());
            }
        }

        if (participantSet.Count > 0)
        {
            foreach (SessionInfo session in allSessions)
            {
                if (string.IsNullOrWhiteSpace(session.Id))
                {
                    continue;
                }

                if (MatchesParticipant(session, participantSet))
                {
                    AddIfMissing(result, session.Id);
                }
            }
        }

        if (result.Count == 0)
        {
            AddIfMissing(result, controllingSessionId);
        }

        return result;
    }

    private static void AddSessionsForUser(List<string> result, List<SessionInfo> allSessions, Guid userId)
    {
        foreach (SessionInfo session in allSessions)
        {
            if (!string.IsNullOrWhiteSpace(session.Id) && session.UserId == userId)
            {
                AddIfMissing(result, session.Id);
            }
        }
    }

    private static GroupInfoDto? ResolveTargetGroup(List<GroupInfoDto> groups, string? requestedGroupId, List<string> participants)
    {
        if (groups.Count == 0) return null;

        if (!string.IsNullOrWhiteSpace(requestedGroupId) && Guid.TryParse(requestedGroupId, out Guid parsedGroupId))
        {
            GroupInfoDto? direct = groups.FirstOrDefault(group => group.GroupId == parsedGroupId);
            if (direct is not null) return direct;
        }

        if (participants.Count > 0)
        {
            HashSet<string> participantSet = new HashSet<string>(participants.Where(static p => !string.IsNullOrWhiteSpace(p)), StringComparer.OrdinalIgnoreCase);
            GroupInfoDto? best = groups.OrderByDescending(group => group.Participants.Count(p => participantSet.Contains(p))).FirstOrDefault();
            if (best is not null) return best;
        }

        return groups[0];
    }

    private static List<string> ParseParticipantHints(string? participantsCsv)
    {
        if (string.IsNullOrWhiteSpace(participantsCsv)) return [];

        return participantsCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(static part => !string.IsNullOrWhiteSpace(part))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
    
    private static bool MatchesParticipant(SessionInfo session, HashSet<string> participants)
    {
        bool IsMatch(string value) => !string.IsNullOrWhiteSpace(value) && participants.Contains(value);
        
        return participants.Count > 0 && (
            IsMatch(session.UserName) || 
            IsMatch(session.DeviceName) || 
            IsMatch(session.DeviceId) || 
            IsMatch(session.Client)
        );
    }

    private static void AddIfMissing(List<string> values, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;

        if (!values.Contains(value, StringComparer.Ordinal))
        {
            values.Add(value);
        }
    }

    private static SessionInfo? ResolveControllingSession(List<SessionInfo> sessions, Guid userId, string? preferredSessionId)
    {
        if (!string.IsNullOrWhiteSpace(preferredSessionId))
        {
            SessionInfo? preferred = sessions.FirstOrDefault(session => string.Equals(session.Id, preferredSessionId, StringComparison.Ordinal) && session.UserId == userId);
            if (preferred is not null)
            {
                return preferred;
            }
        }

        return sessions
            .Where(session => session.UserId == userId)
            .OrderByDescending(session => session.LastActivityDate)
            .FirstOrDefault();
    }

    private Guid ResolveCurrentUserId()
    {
        string? userIdClaim = User.Claims.FirstOrDefault(claim => string.Equals(claim.Type, "Jellyfin-UserId", StringComparison.OrdinalIgnoreCase))?.Value;
        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            return Guid.Empty;
        }

        return Guid.TryParse(userIdClaim, out Guid userId) ? userId : Guid.Empty;
    }
}
