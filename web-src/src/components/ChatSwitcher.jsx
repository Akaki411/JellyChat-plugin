import {useEffect, useState} from 'react'
import { useSyncPlayPresence } from '../hooks/useSyncPlayPresence.js'
import { useChat } from '../hooks/useChat.js'
import { ChatLauncher } from './ChatLauncher.jsx'
import { FloatingChat } from '../chats/floating-chat/FloatingChat.jsx'
import { FixedChat } from '../chats/fixed-chat/FixedChat.jsx'

const chats = {
    floating: { label: 'Floating', component: FloatingChat },
    fixed: { label: 'Fixed', component: FixedChat }
}

export const ChatSwitcher = ({ forceShow = false }) =>
{
    const inGroup = useSyncPlayPresence(forceShow)
    const [variant, setVariant] = useState(localStorage.getItem('chat_variant') || "floating")
    const [collapsed, setCollapsed] = useState(localStorage.getItem('is_collapsed') === 'true')
    const chat = useChat({ mock: forceShow })

    useEffect(() => {
        localStorage.setItem('is_collapsed', collapsed ? 'true' : 'false')
    }, [collapsed])

    useEffect(() => {
        localStorage.setItem('chat_variant', variant)
    }, [variant])

    if (!inGroup) return null
    if (collapsed) return <ChatLauncher onExpand={() => setCollapsed(false)}/>

    const ActiveChat = chats[variant].component
    return (
        <ActiveChat
            chat={chat}
            variants={chats}
            currentVariant={variant}
            onSelectVariant={setVariant}
            onCollapse={() => setCollapsed(true)}
        />
    )
}
