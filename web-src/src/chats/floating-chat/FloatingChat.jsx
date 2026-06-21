import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconSend, IconMoodSmile, IconArrowBackUp, IconX, IconGripVertical, IconMinus } from '@tabler/icons-react'
import { VariantSwitch } from '../../components/VariantSwitch.jsx'
import { EmojiKeyboard } from '../../components/EmojiKeyboard.jsx'
import { useComposer } from '../../hooks/useComposer.js'
import { useAutoScroll } from '../../hooks/useAutoScroll.js'
import './floating-chat.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const FloatingChat = ({ chat, variants, currentVariant, onSelectVariant, onCollapse }) =>
{
    const { t } = useTranslation()
    const { messages, sendMessage, replyingTo, setReplyingTo } = chat
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [position, setPosition] = useState(null)
    const rootRef = useRef(null)
    const dragRef = useRef(null)
    const composer = useComposer({ onSend: sendMessage })
    const scrollRef = useAutoScroll(messages)

    useEffect(() =>
    {
        const onMove = (event) =>
        {
            const drag = dragRef.current
            if (!drag) return

            const node = rootRef.current
            const width = node ? node.offsetWidth : 360
            const height = node ? node.offsetHeight : 0
            const left = clamp(event.clientX - drag.offsetX, 0, window.innerWidth - width)
            const top = clamp(event.clientY - drag.offsetY, 0, window.innerHeight - height)
            setPosition({ left, top })
        }

        const onUp = () =>
        {
            if (!dragRef.current) return
            dragRef.current = null
            document.body.classList.remove('syncplay-chat-dragging')
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return () =>
        {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
    }, [])

    const startDrag = (event) =>
    {
        if (event.target.closest('button')) return

        const node = rootRef.current
        if (!node) return

        const rect = node.getBoundingClientRect()
        dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
        document.body.classList.add('syncplay-chat-dragging')
    }

    const handleEmojiPick = (emoji) =>
    {
        composer.insertEmoji(emoji)
        setEmojiOpen(emoji !== "")
    }

    const style = position
        ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' }
        : undefined

    return (
        <div className="floating-chat" ref={rootRef} style={style}>
            <div className="floating-chat__header" onPointerDown={startDrag}>
                <span className="floating-chat__drag" aria-hidden="true">
                    <IconGripVertical size={16} />
                </span>
                <div className="floating-chat__header-actions">
                    <VariantSwitch variants={variants} current={currentVariant} onSelect={onSelectVariant} />
                    <button
                        type="button"
                        className="floating-chat__icon-btn"
                        aria-label={t('actions.collapse')}
                        title={t('actions.collapse')}
                        onClick={onCollapse}
                    >
                        <IconMinus size={18} />
                    </button>
                </div>
            </div>

            <div className="floating-chat__messages" ref={scrollRef}>
                {messages.map((message) => {
                    return <Message key={message.id} message={message} onReply={setReplyingTo}/>
                })}
            </div>

            <div className="floating-chat__composer">
                {replyingTo && (
                    <div className="floating-chat__reply-bar">
                        <div className="floating-chat__reply-bar-body">
                            <span className="floating-chat__reply-author">{replyingTo.author}</span>
                            <span className="floating-chat__reply-text">{replyingTo.text}</span>
                        </div>
                        <button
                            type="button"
                            className="floating-chat__icon-btn"
                            aria-label={t('actions.cancelReply')}
                            onClick={() => setReplyingTo(null)}
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                )}

                {emojiOpen && (
                    <div className="floating-chat__emoji">
                        <EmojiKeyboard onPick={handleEmojiPick} />
                    </div>
                )}

                <div className="floating-chat__input-row">
                    <button
                        type="button"
                        className="floating-chat__icon-btn"
                        aria-label={t('actions.emoji')}
                        title={t('actions.emoji')}
                        onClick={() => setEmojiOpen((prev) => !prev)}
                    >
                        <IconMoodSmile size={20} />
                    </button>
                    <textarea
                        ref={composer.inputRef}
                        className="floating-chat__input"
                        rows={1}
                        placeholder={t('input.placeholder')}
                        aria-label={t('input.aria')}
                        value={composer.value}
                        onChange={(event) => composer.setValue(event.target.value)}
                        onKeyDown={composer.onKeyDown}
                        onKeyUp={(event) => event.stopPropagation()}
                    />
                    <button
                        type="button"
                        className="floating-chat__icon-btn floating-chat__icon-btn--send"
                        aria-label={t('actions.send')}
                        title={t('actions.send')}
                        onClick={composer.submit}
                    >
                        <IconSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}


const Message = ({
    message,
    onReply = () => {}
}) => {
    const sizes = {1: "64px", 2: "48px", 3: "48px", 4: "48px", 5: "32px", 6: "24px", 7: "20px", 8: "20px"};
    const {t} = useTranslation()
    const segments = [...new Intl.Segmenter().segment(message.text.trim().replace(" ", ""))];
    const isEmoji = segments.every(segment => (/\p{Emoji}+/u.test(segment.segment)))
    if (isEmoji) message.text = message.text.trim().replace(" ", "")

    return (
        <div
            key={message.id}
            className={"floating-chat__msg" +  (message.self ? ' floating-chat__msg--self' : ' floating-chat__msg--friend')}
        >
            <div className="floating-chat__bubble" style={isEmoji ? {background: "transparent"} : {}}>
                {message.replyTo && (
                    <div className="floating-chat__reply">
                        <span className="floating-chat__reply-author">{message.replyTo.author}</span>
                        <span className="floating-chat__reply-text">{message.replyTo.text}</span>
                    </div>
                )}
                {!message.self && <span className="floating-chat__author">{message.author}</span>}
                <span className="floating-chat__text" style={isEmoji ? {fontSize: sizes[segments.length] || "18px", userSelect: "none"} : {}}>{message.text}</span>
            </div>
            <button
                type="button"
                className="floating-chat__reply-btn"
                aria-label={t('actions.reply')}
                title={t('actions.reply')}
                onClick={() => onReply(message)}
            >
                <IconArrowBackUp size={15} />
            </button>
        </div>
    )
}
