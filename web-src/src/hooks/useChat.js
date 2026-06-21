import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUserName, logDebug } from '../lib/api.js'
import { sendChatMessage } from '../lib/presence.js'
import { subscribeIncoming } from '../lib/incoming.js'

const MAX_MESSAGES = 200

let idCounter = 0
const nextId = () =>
{
    idCounter += 1
    return `m${Date.now()}_${idCounter}`
}

const MOCK_NAMES = ['Alex', 'Marina', 'Dmitry', 'Sofia', 'Leon']
const MOCK_LINES = [
    'Hey, ready to start?', 'This scene is insane', 'lol', 'wait, rewind a bit',
    'who is that actor?', 'best part incoming', 'brb popcorn', 'agreed',
    'turn up the volume', 'plot twist!!', 'I called it', 'such a vibe'
]
const randomItem = (list) => list[Math.floor(Math.random() * list.length)]

const seedMessages = () =>
{
    const now = Date.now()
    return [
        { id: nextId(), author: 'Marina', text: 'starting the movie now', self: false, ts: now - 60000, replyTo: null },
        { id: nextId(), author: 'You', text: 'perfect, I am in!', self: true, ts: now - 50000, replyTo: null },
        { id: nextId(), author: 'Alex', text: 'volume up please', self: false, ts: now - 40000, replyTo: null }
    ]
}

const ECHO_WINDOW_MS = 15000

export const useChat = ({ mock = false } = {}) =>
{
    const [messages, setMessages] = useState(() => (mock ? seedMessages() : []))
    const [replyingTo, setReplyingTo] = useState(null)
    const selfName = useMemo(() => getCurrentUserName() || 'You', [])
    const selfNameRef = useRef(selfName)
    selfNameRef.current = selfName
    const recentSentRef = useRef([])

    const consumeOwnEcho = useCallback((text) =>
    {
        const now = Date.now()
        const recent = recentSentRef.current.filter((entry) => now - entry.ts < ECHO_WINDOW_MS)
        const index = recent.findIndex((entry) => entry.text === text)

        if (index === -1)
        {
            recentSentRef.current = recent
            return false
        }

        recent.splice(index, 1)
        recentSentRef.current = recent
        return true
    }, [])

    const pushMessage = useCallback((message) =>
    {
        setMessages((prev) =>
        {
            const next = prev.length >= MAX_MESSAGES
                ? prev.slice(prev.length - MAX_MESSAGES + 1)
                : prev.slice()
            next.push(message)
            return next
        })
    }, [])

    const sendMessage = useCallback((text) =>
    {
        const trimmed = (text || '').trim()
        if (!trimmed) return

        const reply = replyingTo

        recentSentRef.current.push({ text: trimmed, ts: Date.now() })
        pushMessage({
            id: nextId(),
            author: selfNameRef.current,
            text: trimmed,
            self: true,
            ts: Date.now(),
            replyTo: reply ? { author: reply.author, text: reply.text } : null
        })
        setReplyingTo(null)

        sendChatMessage(trimmed).catch((err) => logDebug('Failed to send chat message', err))
    }, [replyingTo, pushMessage])


    useEffect(() =>
    {
        const unsubscribe = subscribeIncoming(({ author, text }) =>
        {
            if (consumeOwnEcho(text)) return
            pushMessage({ id: nextId(), author, text, self: false, ts: Date.now(), replyTo: null })
        })

        return unsubscribe
    }, [pushMessage, consumeOwnEcho])


    useEffect(() =>
    {
        if (!mock) return undefined

        const timerId = window.setInterval(() =>
        {
            pushMessage({
                id: nextId(),
                author: randomItem(MOCK_NAMES),
                text: randomItem(MOCK_LINES),
                self: false,
                ts: Date.now(),
                replyTo: null
            })
        }, 3500)

        return () => window.clearInterval(timerId)
    }, [mock, pushMessage])

    return { messages, sendMessage, replyingTo, setReplyingTo, selfName }
}
