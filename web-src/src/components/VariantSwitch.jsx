import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowsExchange, IconCheck } from '@tabler/icons-react'

export const VariantSwitch = ({
    variants = {},
    current = "",
    accent = "#FFFFFF",
    background = "#20202020",
    onSelect = () => {}
}) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    useEffect(() =>
    {
        if (!open) return undefined

        const onPointerDown = (event) =>
        {
            if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open])

    const handleSelect = (key) =>
    {
        onSelect(key)
        setOpen(false)
    }

    return (
        <div className="syncplay-switch" ref={rootRef}>
            <div className="syncplay-switch__button" aria-label={t('actions.switchLayout')} title={t('actions.switchLayout')} onClick={() => setOpen((prev) => !prev)}>
                <IconArrowsExchange size={18} />
            </div>
            {open && (
                <div className="syncplay-switch__menu" style={{background: background}}>
                    {Object.entries(variants).map(([key, variant]) => (
                        <Button key={key} accent={accent} isActive={key === current} label={t('variants.' + key, variant.label)} onClick={handleSelect} value={key}/>
                    ))}
                </div>
            )}
        </div>
    )
}

const Button = ({
    label = "variant",
    value = "value",
    accent = "#FFFFFF",
    isActive= false,
    onClick = () => {}
}) => {
    return (
        <div>
            <button type="button" className="syncplay-switch__item" onClick={() => onClick(value)}>
                <span style={{color: isActive ? accent : ""}}>{label}</span>
                {isActive && <IconCheck size={15} color={accent}/>}
            </button>
        </div>
    )
}
