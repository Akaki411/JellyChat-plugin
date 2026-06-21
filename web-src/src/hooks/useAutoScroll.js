import { useEffect, useLayoutEffect, useRef } from 'react'

export const useAutoScroll = (dependency) =>
{
    const scrollRef = useRef(null)
    const pinnedRef = useRef(true)

    const updatePinned = () =>
    {
        const node = scrollRef.current
        if (!node) return

        const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
        pinnedRef.current = distanceFromBottom < 80
    }

    useEffect(() =>
    {
        const node = scrollRef.current
        if (!node) return undefined

        node.addEventListener('scroll', updatePinned, { passive: true })
        return () => node.removeEventListener('scroll', updatePinned)
    }, [])

    useLayoutEffect(() =>
    {
        const node = scrollRef.current
        if (!node || !pinnedRef.current) return undefined

        node.scrollTop = node.scrollHeight

        const rafId = window.requestAnimationFrame(() =>
        {
            if (pinnedRef.current) node.scrollTop = node.scrollHeight
        })

        return () => window.cancelAnimationFrame(rafId)
    }, [dependency])

    return scrollRef
}
