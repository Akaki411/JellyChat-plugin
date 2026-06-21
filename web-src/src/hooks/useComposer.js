import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export const useComposer = ({ onSend }) =>
{
    const [value, setValue] = useState('')
    const inputRef = useRef(null)


    useLayoutEffect(() =>
    {
        const input = inputRef.current
        if (!input) return

        input.style.height = 'auto'
        input.style.height = `${Math.min(120, input.scrollHeight)}px`
    }, [value])

    const focusInput = useCallback(() =>
    {
        const input = inputRef.current
        if (input) input.focus()
    }, [])

    const submit = useCallback(() =>
    {
        const trimmed = value.trim()
        if (!trimmed) return

        onSend(trimmed)
        setValue('')
        focusInput()
    }, [value, onSend, focusInput])

    const onKeyDown = useCallback((event) =>
    {
        event.stopPropagation()

        if (event.key === 'Enter' && !event.shiftKey)
        {
            event.preventDefault()
            submit()
        }
    }, [submit])

    const insertEmoji = useCallback((emoji) =>
    {
        setValue((prev) => prev + emoji)
        focusInput()
    }, [focusInput])

    return { value, setValue, inputRef, onKeyDown, submit, insertEmoji, focusInput }
}
