import { logDebug } from './api.js'

const CHAT_HEADER = 'SyncPlay Chat'
const TOAST_MATCH_WINDOW_MS = 8000

const findWebSocket = () =>
{
    const client = window.ApiClient
    if (!client) return null

    return client._webSocket || client.webSocket || (client._serverInfo && client._serverInfo.webSocket) || null
}

const parseReplyTo = (value) =>
{
    let payload = value

    if (typeof value === 'string')
    {
        const trimmed = value.trim()
        if (!trimmed) return null

        try
        {
            payload = JSON.parse(trimmed)
        }
        catch (err)
        {
            return null
        }
    }

    if (!payload || typeof payload !== 'object') return null

    const author = payload.author || payload.Author || ''
    const text = payload.text || payload.Text || ''
    if (!author && !text) return null

    return { author: String(author), text: String(text) }
}

const parseChatLine = (text) =>
{
    const raw = typeof text === 'string' ? text : ''
    const separatorIndex = raw.indexOf(':')
    if (separatorIndex === -1) return { author: 'Someone', text: raw.trim() }

    return {
        author: raw.slice(0, separatorIndex).trim() || 'Someone',
        text: raw.slice(separatorIndex + 1).trim()
    }
}

const extractDisplayMessage = (payload) =>
{
    if (!payload || typeof payload !== 'object') return null
    if (payload.MessageType !== 'GeneralCommand') return null

    const data = payload.Data || {}
    if (data.Name !== 'DisplayMessage') return null

    const args = data.Arguments || data
    if (args.Header !== CHAT_HEADER) return null

    const line = parseChatLine(args.Text)
    return { ...line, raw: typeof args.Text === 'string' ? args.Text.trim() : '', replyTo: parseReplyTo(args.ReplyTo) }
}

const suppressedLines = new Set()
let toastObserver = null

const toastMatches = (node) =>
{
    if (!node || node.nodeType !== 1 || typeof node.matches !== 'function') return false
    if (!node.matches('.toast, .toast-text')) return false

    const text = (node.textContent || '').trim()
    if (!text) return false

    for (const line of suppressedLines)
    {
        if (text === line || text.includes(line)) return true
    }

    return false
}

const removeMatchingToasts = (root) =>
{
    if (!root || typeof root.querySelectorAll !== 'function') return

    const candidates = root.matches && root.matches('.toast') ? [root] : Array.from(root.querySelectorAll('.toast'))
    for (const candidate of candidates)
    {
        if (toastMatches(candidate)) candidate.remove()
    }
}

const ensureToastObserver = () =>
{
    if (toastObserver || !document.body) return

    toastObserver = new MutationObserver((mutations) =>
    {
        for (const mutation of mutations)
        {
            for (const node of mutation.addedNodes)
            {
                if (node.nodeType !== 1) continue
                if (toastMatches(node)) node.remove()
                else removeMatchingToasts(node)
            }
        }
    })

    toastObserver.observe(document.body, { childList: true, subtree: true })
}

const suppressChatToast = (rawLine) =>
{
    if (!rawLine) return

    suppressedLines.add(rawLine)
    ensureToastObserver()
    removeMatchingToasts(document)

    window.setTimeout(() => suppressedLines.delete(rawLine), TOAST_MATCH_WINDOW_MS)
}

export const subscribeIncoming = (onMessage) =>
{
    let socket = null
    let pollId = 0

    const handleEvent = (event) =>
    {
        try
        {
            const payload = JSON.parse(event.data)
            const message = extractDisplayMessage(payload)
            if (!message || !message.text) return

            suppressChatToast(message.raw)
            onMessage({ author: message.author, text: message.text, replyTo: message.replyTo })
        }
        catch (err)
        {
            logDebug('Failed to parse incoming websocket message', err)
        }
    }

    const attach = () =>
    {
        const candidate = findWebSocket()
        if (!candidate || candidate === socket) return

        socket = candidate
        socket.addEventListener('message', handleEvent)
        logDebug('SyncPlay chat incoming listener attached')
    }

    attach()
    if (!socket)
    {
        pollId = window.setInterval(attach, 2000)
    }

    return () =>
    {
        if (pollId) window.clearInterval(pollId)
        if (socket) socket.removeEventListener('message', handleEvent)
    }
}
