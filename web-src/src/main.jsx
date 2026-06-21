import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatSwitcher } from './components/ChatSwitcher.jsx'
import './i18n/index.js'
import './jelly-chat.css'


const getOrCreateRoot = () =>
{
    const ROOT_ID = 'syncPlayChatRoot'

    let host = document.getElementById(ROOT_ID)
    if (host) return host

    host = document.createElement('div')
    host.id = ROOT_ID
    document.body.appendChild(host)
    return host
}

const start = () =>
{
    if (window.__syncPlayChatLoaded) return
    window.__syncPlayChatLoaded = true

    const forceShow = Boolean(import.meta.env && import.meta.env.DEV)

    const root = createRoot(getOrCreateRoot())
    root.render(
        <StrictMode>
            <ChatSwitcher forceShow={forceShow} />
        </StrictMode>
    )
}

if (document.readyState === 'loading')
{
    document.addEventListener('DOMContentLoaded', start, {once: true})
}
else
{
    start()
}
