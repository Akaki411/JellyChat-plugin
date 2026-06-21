import {
    normalizeId,
    logDebug,
    getCurrentUserIds,
    getCurrentUserName,
    getCurrentDeviceId,
    fetchJson,
    postJson
} from './api.js';

const extractSyncPlayGroupId = (session) =>
{
    const playState = session && session.PlayState;
    const groupId = (session && session.PlayState && session.PlayState.SyncPlayGroupId)
        || (session && session.PlayState && session.PlayState.SyncPlayGroup)
        || (session && session.SyncPlayGroupId)
        || (session && session.SyncPlayGroup)
        || (session && session.SyncPlayGroup && session.SyncPlayGroup.Id)
        || (playState && playState.SyncPlayGroup && playState.SyncPlayGroup.Id)
        || (playState && playState.SyncPlayInfo && playState.SyncPlayInfo.GroupId)
        || (session && session.AdditionalData && session.AdditionalData.SyncPlayGroupId)
        || '';

    return typeof groupId === 'string' ? groupId : '';
};

const hasSyncPlayGroup = session => extractSyncPlayGroupId(session).length > 0;

const collectStringValues = (value, output) =>
{
    if (value === null || value === undefined) return

    if (typeof value === 'string')
    {
        output.push(value)
        return
    }

    if (Array.isArray(value))
    {
        value.forEach((item) => {collectStringValues(item, output)})
        return
    }

    if (typeof value === 'object')
    {
        Object.keys(value).forEach((key) => {
            collectStringValues(value[key], output)
        })
    }
}

const normalizeSessionsResponse = (response) =>
{
    if (Array.isArray(response)) return response
    if (response && Array.isArray(response.Items)) return response.Items
    if (response && Array.isArray(response.Sessions)) return response.Sessions
    return []
}

const normalizeGroupsResponse = (response) =>
{
    if (Array.isArray(response)) return response
    if (response && Array.isArray(response.Groups)) return response.Groups
    if (response && Array.isArray(response.Items)) return response.Items
    return []
}

const objectContainsString = (value, expectedLowerValue) =>
{
    if (!value || !expectedLowerValue) return false

    if (typeof value === 'string')
    {
        const normalizedActual = normalizeId(value)
        const normalizedExpected = normalizeId(expectedLowerValue)
        if (!normalizedActual || !normalizedExpected) return false
        return normalizedActual === normalizedExpected
    }

    if (Array.isArray(value))
    {
        return value.some((item) => objectContainsString(item, expectedLowerValue))
    }

    if (typeof value === 'object')
    {
        return Object.keys(value).some(key => objectContainsString(value[key], expectedLowerValue))
    }

    return false
}

const buildSessionsPaths = () =>
{
    const userIds = getCurrentUserIds()
    const paths = ['Sessions']

    for (const id of userIds)
    {
        const path = 'Sessions?UserId=' + encodeURIComponent(id)
        if (paths.indexOf(path) === -1)
        {
            paths.push(path)
        }
    }

    return paths
}

const matchesCurrentUser = (session) =>
{
    const currentUserIds = getCurrentUserIds()
    if (!currentUserIds.length) return true

    const sessionUserId = (session && session.UserId) || (session && session.User && session.User.Id) || ''
    const normalizedSessionUserId = normalizeId(sessionUserId)

    return currentUserIds.some((id) => normalizeId(id) === normalizedSessionUserId)
}

function getCurrentSessionIds(sessions)
{
    return sessions
        .filter(matchesCurrentUser)
        .map((session) => session && session.Id)
        .filter((id) => typeof id === 'string' && id.length > 0)
}

const getCurrentSession = (sessions) =>
{
    const currentDeviceId = normalizeId(getCurrentDeviceId())
    const matchingUserSessions = sessions.filter(matchesCurrentUser)

    if (currentDeviceId)
    {
        const exactDeviceSession = matchingUserSessions.find(session => normalizeId(session && session.DeviceId) === currentDeviceId)
        if (exactDeviceSession) return exactDeviceSession
    }

    return matchingUserSessions.length > 0 ? matchingUserSessions[0] : null
}

const mapKnownSessionIds = (sessions) =>
{
    const map = {}
    for (const session of sessions)
    {
        const sessionId = session && session.Id
        if (typeof sessionId === 'string' && sessionId.length > 0)
        {
            map[normalizeId(sessionId)] = sessionId
        }
    }
    return map
}

const filterSessionIdsToKnownSessions = (sessionIds, sessions) =>
{
    const knownSessionIds = mapKnownSessionIds(sessions)
    const filtered = []

    for (const id of sessionIds)
    {
        const knownId = knownSessionIds[normalizeId(id)]
        if (knownId && filtered.indexOf(knownId) === -1)
        {
            filtered.push(knownId)
        }
    }
    return filtered
}

const isLikelySessionId = (value) =>
{
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    return /^[a-f0-9]{32}$/i.test(trimmed) || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)
}

const resolveSyncPlayGroupId = (group) =>
{
    const direct = (group && group.Id)
        || (group && group.GroupId)
        || (group && group.Group && group.Group.Id)
        || (group && group.GroupInfo && group.GroupInfo.Id)
        || ''

    if (typeof direct === 'string' && direct.length > 0) return direct

    const values = []
    collectStringValues(group, values)
    const possibleGroupId = values.find(value => isLikelySessionId(value))

    return possibleGroupId || ''
}

const extractLikelySessionIdsFromGroup = (group) =>
{
    const fromSessionKeys = []

    const walk = value =>
    {
        if (value === null || value === undefined) return

        if (Array.isArray(value))
        {
            value.forEach(walk)
            return
        }

        if (typeof value !== 'object') return

        Object.keys(value).forEach((key) =>
        {
            const child = value[key]
            const normalizedKey = normalizeId(key)
            if ((normalizedKey === 'sessionid' || normalizedKey.indexOf('sessionid') !== -1) && typeof child === 'string' && child.length > 0)
            {
                fromSessionKeys.push(child)
            }
            walk(child)
        })
    }

    walk(group)

    const values = []
    collectStringValues(group, values)

    const unique = []
    for (const value of fromSessionKeys)
    {
        if (typeof value !== 'string' || value.length === 0) continue
        if (unique.indexOf(value) === -1) unique.push(value)
    }

    for (const value of values)
    {
        if (!isLikelySessionId(value)) continue
        if (unique.indexOf(value) === -1) unique.push(value)
    }

    return unique
}

const fetchSyncPlayGroupDetails = async (groups) =>
{
    const detailGroups = []

    for (let i = 0; i < groups.length; i += 1)
    {
        const group = groups[i]
        const groupId = resolveSyncPlayGroupId(group)
        if (!groupId) continue

        try
        {
            const details = await fetchJson('SyncPlay/' + encodeURIComponent(groupId))
            if (details) detailGroups.push(details)
        }
        catch (err)
        {
            logDebug('Failed to fetch SyncPlay group details', { groupId: groupId, error: err })
        }
    }

    return detailGroups
}

const getGroupIdsForCurrentUserSessions = (sessions) =>
{
    const groupIds = []
    sessions
        .filter(matchesCurrentUser)
        .forEach((session) => {
            const groupId = extractSyncPlayGroupId(session);
            if (groupId && groupIds.indexOf(groupId) === -1)
            {
                groupIds.push(groupId);
            }
        })

    return groupIds
};

const findGroupsByGroupIds = (groups, groupIds) =>
{
    if (!groups.length || !groupIds.length) return []
    const normalizedGroupIds = groupIds.map(normalizeId).filter(Boolean);
    return groups.filter(group => normalizedGroupIds.indexOf(normalizeId(resolveSyncPlayGroupId(group))) !== -1)
}

const buildCurrentIdentityTokens = (sessions) =>
{
    const tokens = []

    for (const id of getCurrentUserIds())
    {
        if (id && tokens.indexOf(id) === -1)
        {
            tokens.push(id)
        }
    }

    const currentUserName = getCurrentUserName()
    if (currentUserName && tokens.indexOf(currentUserName) === -1)
    {
        tokens.push(currentUserName)
    }

    for (const sessionId of getCurrentSessionIds(sessions))
    {
        if (sessionId && tokens.indexOf(sessionId) === -1)
        {
            tokens.push(sessionId)
        }
    }

    for (const session of sessions.filter(matchesCurrentUser))
    {
        const userName = (session && session.UserName) || (session && session.User && session.User.Name) || ''
        if (userName && tokens.indexOf(userName) === -1)
        {
            tokens.push(userName)
        }
    }

    return tokens
}

const payloadContainsAnyIdentity = (payload, identityTokens) =>
{
    if (!payload || !identityTokens.length) return false
    return identityTokens.some(token => objectContainsString(payload, token))
}

const hasIntersection = (left, right) =>
{
    if (!left.length || !right.length) return false

    const rightLookup = {};
    right.forEach(value => {
        rightLookup[normalizeId(value)] = true
    })

    return left.some(value => !!rightLookup[normalizeId(value)])
}

const groupsContainCurrentUser = (groups, sessions) =>
{
    const identityTokens = buildCurrentIdentityTokens(sessions)
    if (identityTokens.length === 0) return false

    return groups.some(group => payloadContainsAnyIdentity(group, identityTokens))
}

const isCurrentUserInGroupsViaDetails = async (groups, sessions) =>
{
    const localSessionIds = getCurrentSessionIds(sessions)
    const identityTokens = buildCurrentIdentityTokens(sessions)
    if (!localSessionIds.length || !groups.length) return false

    const groupIds = getGroupIdsForCurrentUserSessions(sessions)
    const scopedGroups = findGroupsByGroupIds(groups, groupIds)
    const groupsForLookup = scopedGroups.length > 0 ? scopedGroups : groups
    const groupDetailPayloads = await fetchSyncPlayGroupDetails(groupsForLookup)

    const sessionIdsFromGroupDetails = []
    let matchedIdentityInDetails = false
    for (const groupDetail of groupDetailPayloads)
    {
        if (!matchedIdentityInDetails && payloadContainsAnyIdentity(groupDetail, identityTokens))
        {
            matchedIdentityInDetails = true
        }

        for (const id of extractLikelySessionIdsFromGroup(groupDetail))
        {
            if (sessionIdsFromGroupDetails.indexOf(id) === -1)
            {
                sessionIdsFromGroupDetails.push(id)
            }
        }
    }

    const knownSessionIds = filterSessionIdsToKnownSessions(sessionIdsFromGroupDetails, sessions)
    if (hasIntersection(localSessionIds, knownSessionIds)) return true

    return matchedIdentityInDetails
}

const extractParticipantsFromGroups = (groups) =>
{
    const participants = []

    for (const group of groups)
    {
        const groupParticipants = group && group.Participants
        if (!Array.isArray(groupParticipants)) continue

        for (const participant of groupParticipants)
        {
            if (typeof participant === 'string' && participant.length > 0 && participants.indexOf(participant) === -1)
            {
                participants.push(participant)
                continue
            }

            if (participant && typeof participant === 'object')
            {
                const userName = participant.UserName || (participant.User && participant.User.Name) || ''
                const deviceName = participant.DeviceName || participant.Device || ''

                if (typeof userName === 'string' && userName.length > 0 && participants.indexOf(userName) === -1)
                {
                    participants.push(userName);
                }

                if (typeof deviceName === 'string' && deviceName.length > 0 && participants.indexOf(deviceName) === -1)
                {
                    participants.push(deviceName);
                }
            }
        }
    }

    return participants
}

const fetchSessions = async () =>
{
    const paths = buildSessionsPaths()
    const sessionsById = {}
    const sessionsWithoutId = []

    for (let i = 0; i < paths.length; i += 1)
    {
        const path = paths[i]
        try
        {
            const response = await fetchJson(path)
            const sessions = normalizeSessionsResponse(response)
            sessions.forEach((session) =>
            {
                const sessionId = session && session.Id
                if (typeof sessionId === 'string' && sessionId.length > 0)
                {
                    sessionsById[sessionId] = session
                    return
                }

                sessionsWithoutId.push(session)
            })
        }
        catch (err)
        {
            logDebug('Failed to fetch sessions path', { path: path, error: err })
        }
    }

    const dedupedSessions = Object.keys(sessionsById).map(function (id)
    {
        return sessionsById[id]
    })

    if (dedupedSessions.length === 0 && sessionsWithoutId.length > 0)
    {
        return sessionsWithoutId;
    }

    return dedupedSessions
};

const sendMessageViaServer = async (text, senderSessionId, groupId, participants) =>
{
    const response = await postJson('SyncPlayChat/Send', {
        GroupId: groupId || '',
        SenderSessionId: senderSessionId || '',
        Header: 'SyncPlay Chat',
        Text: text,
        TimeoutMs: 4000,
        ParticipantsCsv: (participants || []).join(',')
    }, true)

    let normalized = response
    if (typeof normalized === 'string')
    {
        try
        {
            normalized = JSON.parse(normalized)
        }
        catch (parseError)
        {
            logDebug('Failed to parse server chat send response JSON', {
                response: response,
                error: parseError
            })
            normalized = null
        }
    }

    if (normalized && typeof normalized === 'object' && normalized.responseJSON && typeof normalized.responseJSON === 'object')
    {
        normalized = normalized.responseJSON
    }

    if (!normalized || typeof normalized !== 'object')
    {
        logDebug('Unexpected server chat send response shape', { response: response, normalized: normalized })
        return {
            attempted: 0,
            sent: 0,
            failed: 0
        }
    }

    return {
        attempted: Number(normalized.Attempted) || 0,
        sent: Number(normalized.Sent) || 0,
        failed: Number(normalized.Failed) || 0
    }
}

export const isCurrentUserInSyncPlayGroup = async () =>
{
    if (!window.ApiClient) return false

    const sessions = await fetchSessions()
    const matchingUserSessions = sessions.filter(matchesCurrentUser)
    if (matchingUserSessions.length === 0) return false

    if (matchingUserSessions.some(hasSyncPlayGroup)) return true

    try
    {
        const groupsResponse = await fetchJson('SyncPlay/List')
        const groups = normalizeGroupsResponse(groupsResponse)
        if (groups.length > 0)
        {
            if (groupsContainCurrentUser(groups, sessions)) return true
            if (await isCurrentUserInGroupsViaDetails(groups, sessions)) return true
        }
    }
    catch (err)
    {
        logDebug('SyncPlay list request failed', err)
    }

    logDebug('Current user not in any SyncPlay group', {
        matchingUserSessions: matchingUserSessions.length
    })
    return false
}

export const sendChatMessage = async (chatText) =>
{
    const trimmedText = typeof chatText === 'string' ? chatText.trim() : ''
    if (!trimmedText) return { attempted: 0, sent: 0, failed: 0 }

    const sessions = await fetchSessions()
    const groupsResponse = await fetchJson('SyncPlay/List')
    const groups = normalizeGroupsResponse(groupsResponse)

    const currentSession = getCurrentSession(sessions)
    const senderName = (currentSession && currentSession.UserName)
        || (currentSession && currentSession.User && currentSession.User.Name)
        || getCurrentUserName()
        || 'Someone'
    const messageText = senderName + ': ' + trimmedText

    const groupIds = getGroupIdsForCurrentUserSessions(sessions)
    const groupsBySessionGroupIds = findGroupsByGroupIds(groups, groupIds)
    const relevantGroups = groups.filter(group => groupsContainCurrentUser([group], sessions))
    let groupsForDetailLookup = []

    if (groupsBySessionGroupIds.length > 0)
    {
        groupsForDetailLookup = groupsBySessionGroupIds
    }
    else if (relevantGroups.length > 0)
    {
        groupsForDetailLookup = relevantGroups
    }
    else if (groups.length === 1)
    {
        groupsForDetailLookup = [groups[0]]
    }

    const participantsForSend = extractParticipantsFromGroups(groupsForDetailLookup.length > 0 ? groupsForDetailLookup : groups)
    const preferredGroupId = groupIds.length > 0 ? groupIds[0] : resolveSyncPlayGroupId(groupsForDetailLookup[0] || groups[0])

    const result = await sendMessageViaServer(
        messageText,
        currentSession && currentSession.Id,
        preferredGroupId,
        participantsForSend)

    logDebug('Sync chat send result', result)
    return result
}
