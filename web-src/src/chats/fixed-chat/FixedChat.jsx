import { useEffect, useRef, useState} from 'react'
import { useTranslation } from 'react-i18next'
import { IconSend, IconMoodSmile, IconArrowBackUp, IconX, IconPalette, IconCheck, IconMinus } from '@tabler/icons-react'
import { VariantSwitch } from '../../components/VariantSwitch.jsx'
import { EmojiKeyboard } from '../../components/EmojiKeyboard.jsx'
import { useComposer } from '../../hooks/useComposer.js'
import { useAutoScroll } from '../../hooks/useAutoScroll.js'
import { useSwipeReply } from '../../hooks/useSwipeReply.js'
import { getNickColor } from '../../lib/colors.js'
import './fixed-chat.css'

const SCHEMES = {
    jellyfin: {accent: '#7376C5', input: "#292929", background: '#202020'},
    blue:     {accent: '#4aa3df', input: "#242F3D", background: '#17212b'},
    orange:   {accent: '#f0823c', input: "#413E39", background: '#2F2B28'},
    purple:   {accent: '#9a6bef', input: "#252525", background: '#191919'},
    green:    {accent: '#4fae6c', input: "#252525", background: '#191919'},
    azure:    {accent: '#3FC1B0', input: "#3D444B", background: '#282E33'},
    vine:     {accent: '#A82227', input: "linear-gradient(75deg, #211B1D, #201A1C)", background: 'linear-gradient(45deg, #2A191F, #301B22)'}
}

export const FixedChat = ({ chat, variants, currentVariant, onSelectVariant, onCollapse }) =>
{
    const { t } = useTranslation()
    const {messages, sendMessage, replyingTo, setReplyingTo} = chat
    const [width, setWidth] = useState(320)
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [scheme, setScheme] = useState(localStorage.getItem("fixed-chat_scheme") || "jellyfin")
    const [schemeMenuOpen, setSchemeMenuOpen] = useState(false)
    const composer = useComposer({onSend: sendMessage})
    const scrollRef = useAutoScroll(messages)
    const draggingRef = useRef(false)

    const handleReply = (message) =>
    {
        setReplyingTo(message)
        composer.focusInput()
    }

    useEffect(() =>
    {
        localStorage.setItem("fixed-chat_scheme", scheme)
    }, [scheme])

    useEffect(() =>
    {
        const root = document.documentElement
        root.style.setProperty('--syncplay-chat-width', `${width}px`)
        root.classList.add('syncplay-chat-pushed')
        root.classList.add('jellychat-mobile-docked')

        return () =>
        {
            root.classList.remove('syncplay-chat-pushed')
            root.classList.remove('jellychat-mobile-docked')
            root.style.removeProperty('--syncplay-chat-width')
        }
    }, [width])

    useEffect(() =>
    {
        const onMove = (event) =>
        {
            if (!draggingRef.current) return
            const next = Math.min(500, Math.max(200, window.innerWidth - event.clientX))
            setWidth(next)
        }

        const onUp = () =>
        {
            if (!draggingRef.current) return
            draggingRef.current = false
            document.body.classList.remove('syncplay-chat-resizing')
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)

        return () =>
        {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
    }, [])

    const startResize = (event) =>
    {
        event.preventDefault()
        draggingRef.current = true
        document.body.classList.add('syncplay-chat-resizing')
    }

    const handleEmojiPick = (emoji) =>
    {
        composer.insertEmoji(emoji)
        setEmojiOpen(emoji !== "")
    }

    const handleSchemeSelect = (id) =>
    {
        setScheme(id)
        setSchemeMenuOpen(false)
    }

    return (
        <div className="fixed-chat" style={{ width: `${width}px` }} data-scheme={scheme}>
            <div
                className="fixed-chat__resizer"
                onPointerDown={startResize}
                role="separator"
                aria-orientation="vertical"
                aria-label={t('actions.resize')}
            />

            <div className="fixed-chat__header">
                <div className="fixed-chat__header-actions">
                    <div className="fixed-chat__scheme">
                        <div
                            className="fixed-chat__icon-btn"
                            aria-label={t('actions.colorScheme')}
                            title={t('actions.colorScheme')}
                            onClick={() => setSchemeMenuOpen((prev) => !prev)}
                        >
                            <IconPalette size={18} />
                        </div>
                        {schemeMenuOpen && (
                            <div className="fixed-chat__scheme-menu">
                                {Object.keys(SCHEMES).map((item) => (
                                    <div key={item}>
                                        <button
                                            type="button"
                                            className="fixed-chat__scheme-item"
                                            style={{background: item === scheme ? "#FFFFFF20" : ""}}
                                            onClick={() => handleSchemeSelect(item)}
                                        >
                                            <span className="fixed-chat__swatch" style={{background: SCHEMES[item].accent}} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <VariantSwitch accent={SCHEMES[scheme]?.accent} background={SCHEMES[scheme]?.input} variants={variants} current={currentVariant} onSelect={onSelectVariant} />
                    <button
                        type="button"
                        className="fixed-chat__icon-btn"
                        aria-label={t('actions.collapse')}
                        title={t('actions.collapse')}
                        onClick={onCollapse}
                    >
                        <IconMinus size={18} />
                    </button>
                </div>
            </div>

            <div className="fixed-chat__messages" ref={scrollRef}>
                {messages.map((message) => {
                    return <Message key={message.id} message={message} onReply={handleReply}/>
                })}
            </div>

            <div className="fixed-chat__composer">
                {replyingTo && (
                    <div className="fixed-chat__reply-bar">
                        <div className="fixed-chat__reply-bar-body">
                            <span className="fixed-chat__reply-author">{replyingTo.author}</span>
                            <span className="fixed-chat__reply-text">{replyingTo.text}</span>
                        </div>
                        <button
                            type="button"
                            className="fixed-chat__icon-btn"
                            aria-label={t('actions.cancelReply')}
                            onClick={() => setReplyingTo(null)}
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                )}

                {emojiOpen && (
                    <div className="fixed-chat__emoji">
                        <EmojiKeyboard onPick={handleEmojiPick} bgColor={SCHEMES[scheme]?.background} />
                    </div>
                )}

                <div className="fixed-chat__input-row">
                    <div className="fixed-chat__icon-btn" aria-label={t('actions.emoji')} title={t('actions.emoji')} onClick={() => setEmojiOpen((prev) => !prev)}>
                        <IconMoodSmile size={20} />
                    </div>
                    <textarea
                        ref={composer.inputRef}
                        className="fixed-chat__input"
                        rows={1}
                        placeholder={t('input.placeholderLong')}
                        aria-label={t('input.aria')}
                        value={composer.value}
                        onChange={(event) => composer.setValue(event.target.value)}
                        onKeyDown={composer.onKeyDown}
                        onKeyUp={(event) => event.stopPropagation()}
                    />
                    <div className="fixed-chat__icon-btn fixed-chat__icon-btn--send" aria-label={t('actions.send')} title={t('actions.send')} onClick={composer.submit}>
                        <IconSend size={20} color={SCHEMES[scheme]?.accent || "#FFFFFF"}/>
                    </div>
                </div>
            </div>
        </div>
    )
}

const Message = ({
    message,
    onReply = () => {}
}) => {
    const sizes = {1: "64px", 2: "48px", 3: "48px", 4: "32px", 5: "24px", 6: "24px", 7: "20px"};
    const {t} = useTranslation()
    const swipe = useSwipeReply(() => onReply(message))
    const segments = [...new Intl.Segmenter().segment(message.text.trim().replace(" ", ""))];
    const isEmoji = segments.every(segment => (/\p{Emoji}+/u.test(segment.segment)))
    if (isEmoji) message.text = message.text.trim().replace(" ", "")

    const bubbleStyle = {
        background: isEmoji ? "transparent" : "",
        transform: swipe.offset ? `translateX(-${swipe.offset}px)` : undefined,
        transition: swipe.dragging ? 'none' : 'transform 0.18s ease'
    }

    return (
        <div key={message.id} className={message.self ? 'fixed-chat__msg fixed-chat__msg--self' : 'fixed-chat__msg fixed-chat__msg--friend'} {...swipe.handlers}>
            <span className="fixed-chat__swipe" style={{opacity: swipe.progress, color: swipe.reached ? '#7aa2ff' : undefined}} aria-hidden="true">
                <IconArrowBackUp size={16} />
            </span>
            <div className="fixed-chat__bubble" style={bubbleStyle}>
                {!message.self && (
                    <span className="fixed-chat__author" style={{color: getNickColor(message.author)}}>
                        {message.author}
                    </span>
                )}
                {message.replyTo && (
                    <div className="fixed-chat__reply">
                        <span className="fixed-chat__reply-author">{message.replyTo.author}</span>
                        <span className="fixed-chat__reply-text">{message.replyTo.text}</span>
                    </div>
                )}
                <span className="fixed-chat__text" style={isEmoji ? {fontSize: sizes[segments.length] || "18px", userSelect: "none"} : {}}>{message.text}</span>
            </div>
            <div className="fixed-chat__reply-btn" aria-label={t('actions.reply')} title={t('actions.reply')} onClick={() => onReply(message)}>
                <IconArrowBackUp size={15} />
            </div>
        </div>
    )
}
