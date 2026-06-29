import { useRef, useState } from 'react'

const INTENT = 10
const SWIPE_THRESHOLD = 50
const SWIPE_MAX = 75

export const useSwipeReply = (onReply) =>
{
    const [offset, setOffset] = useState(0)
    const [dragging, setDragging] = useState(false)
    const stateRef = useRef(null)

    const onPointerDown = (event) =>
    {
        if (event.pointerType === 'mouse' && event.button !== 0) return

        stateRef.current = {
            id: event.pointerId,
            x0: event.clientX,
            y0: event.clientY,
            active: false,
            offset: 0
        }
    }

    const onPointerMove = (event) =>
    {
        const state = stateRef.current
        if (!state || event.pointerId !== state.id) return

        const dx = event.clientX - state.x0
        const dy = event.clientY - state.y0

        if (!state.active)
        {
            if (Math.abs(dx) < INTENT && Math.abs(dy) < INTENT) return

            if (Math.abs(dx) <= Math.abs(dy))
            {
                stateRef.current = null
                return
            }

            state.active = true
            setDragging(true)
            try { event.currentTarget.setPointerCapture(state.id) } catch (err) {}
        }

        const next = Math.max(0, Math.min(SWIPE_MAX, -dx))
        state.offset = next
        setOffset(next)
    }

    const onPointerUp = (event) =>
    {
        const state = stateRef.current
        if (!state) return
        stateRef.current = null

        const reached = state.active && state.offset >= SWIPE_THRESHOLD
        setDragging(false)
        setOffset(0)

        if (reached) onReply()
    }

    return {
        offset,
        dragging,
        progress: Math.min(1, offset / SWIPE_THRESHOLD),
        reached: offset >= SWIPE_THRESHOLD,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp
        }
    }
}
