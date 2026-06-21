export const normalizeId = (value) =>
{
    if (value === null || value === undefined) return ''

    return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export const logDebug = (message, details) =>
{
    if (!window || !window.console || typeof window.console.log !== 'function') return

    if (details === undefined)
    {
        window.console.log('[SyncPlayChat]', message)
        return
    }

    window.console.log('[SyncPlayChat]', message, details)
}

export const getCurrentUserId = () =>
{
    if (!window.ApiClient) return ''

    if (typeof window.ApiClient.getCurrentUserId === 'function') return window.ApiClient.getCurrentUserId() || ''
    if (typeof window.ApiClient.userId === 'function') return window.ApiClient.userId() || ''
    if (typeof window.ApiClient._userId === 'string') return window.ApiClient._userId
    if (window.ApiClient._serverInfo && typeof window.ApiClient._serverInfo.UserId === 'string') return window.ApiClient._serverInfo.UserId

    return ''
}

export const getCurrentUserIds = () =>
{
    const raw = getCurrentUserId()
    const ids = []

    if (raw) ids.push(raw)

    const normalized = normalizeId(raw)
    if (normalized && ids.indexOf(normalized) === -1) ids.push(normalized)

    return ids
}

export const getCurrentUserName = () =>
{
    if (!window.ApiClient) return ''

    const serverInfo = window.ApiClient._serverInfo
    if (serverInfo && typeof serverInfo.UserName === 'string' && serverInfo.UserName.length > 0) return serverInfo.UserName

    if (window.Dashboard && window.Dashboard.getCurrentUser)
    {
        const currentUser = window.Dashboard.getCurrentUser()
        if (currentUser && typeof currentUser.Name === 'string' && currentUser.Name.length > 0) return currentUser.Name
    }

    return ''
}

export const getCurrentDeviceId = () =>
{
    if (!window.ApiClient) return ''

    if (typeof window.ApiClient.deviceId === 'function') return window.ApiClient.deviceId() || ''
    if (typeof window.ApiClient._deviceId === 'string') return window.ApiClient._deviceId

    return ''
}

export const fetchJson = async (path) =>
{
    if (!window.ApiClient) return null

    const normalizedPath = typeof path === 'string' && path.charAt(0) === '/' ? path.slice(1) : path
    const url = typeof window.ApiClient.getUrl === 'function'
        ? window.ApiClient.getUrl(normalizedPath)
        : normalizedPath

    if (typeof window.ApiClient.ajax === 'function')
    {
        return window.ApiClient.ajax({
            type: 'GET',
            url: url,
            dataType: 'json'
        })
    }

    if (typeof window.ApiClient.getJSON === 'function') return window.ApiClient.getJSON(url)

    return null
}

export const postJson = async (path, data, expectJsonResponse) =>
{
    if (!window.ApiClient) return null

    const normalizedPath = typeof path === 'string' && path.charAt(0) === '/' ? path.slice(1) : path
    const url = typeof window.ApiClient.getUrl === 'function'
        ? window.ApiClient.getUrl(normalizedPath)
        : normalizedPath

    if (typeof window.ApiClient.ajax === 'function')
    {
        const request = {
            type: 'POST',
            url: url,
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(data || {})
        }

        if (expectJsonResponse) request.dataType = 'json'

        return window.ApiClient.ajax(request)
    }

    if (typeof window.fetch === 'function')
    {
        const response = await window.fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(data || {})
        })

        if (!response.ok) throw new Error('HTTP ' + response.status)

        if (expectJsonResponse) return response.json()

        return null
    }

    return null
}

export const showLocalToast = (text, title) =>
{
    if (window.toastr && typeof window.toastr.info === 'function')
    {
        window.toastr.info(text, title || 'SyncPlay Chat')
        return
    }

    if (window.Dashboard && typeof window.Dashboard.alert === 'function')
    {
        window.Dashboard.alert({
            title: title || 'SyncPlay Chat',
            message: text
        })
        return
    }

    logDebug('Toast fallback', { title: title || 'SyncPlay Chat', text: text })
}
