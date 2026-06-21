import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EMOJI_CATEGORIES } from '../lib/emoji.js'

export const EmojiKeyboard = ({
    bgColor = "#20202020",
    onPick = () => {}
}) => {
    const { t } = useTranslation()
    const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id)
    const category = EMOJI_CATEGORIES.find((item) => item.id === activeCategory) || EMOJI_CATEGORIES[0]

    return (
        <div className="syncplay-emoji" style={{background: bgColor}} role="dialog" aria-label={t('emoji.keyboard')} onMouseLeave={() => {onPick("")}}>
            <div className="syncplay-emoji__tabs">
                {EMOJI_CATEGORIES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={item.id === activeCategory ? 'syncplay-emoji__tab syncplay-emoji__tab--active' : 'syncplay-emoji__tab'}
                        onClick={() => setActiveCategory(item.id)}
                    >
                        {item.tab}
                    </button>
                ))}
            </div>
            <div className="syncplay-emoji__grid">
                {category.emojis.map((emoji, index) => (
                    <button
                        key={`${category.id}-${index}`}
                        type="button"
                        className="syncplay-emoji__item"
                        onClick={() => onPick(emoji)}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}
