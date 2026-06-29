let installed = false

export const installViewportInsets = () =>
{
    if (installed || typeof window === 'undefined' || !document.documentElement) return
    installed = true

    const root = document.documentElement
    const viewport = window.visualViewport

    const update = () =>
    {
        if (!viewport)
        {
            root.style.setProperty('--jellychat-vvh', window.innerHeight + 'px')
            root.style.setProperty('--jellychat-kb', '0px')
            return
        }

        const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        root.style.setProperty('--jellychat-vvh', viewport.height + 'px')
        root.style.setProperty('--jellychat-kb', keyboard + 'px')
    }

    update()

    if (viewport)
    {
        viewport.addEventListener('resize', update)
        viewport.addEventListener('scroll', update)
    }

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
}

let videoInstalled = false

export const installVideoAspectTracking = () =>
{
    if (videoInstalled || typeof window === 'undefined' || !document.body) return
    videoInstalled = true

    const root = document.documentElement
    let current = null

    const apply = (video) =>
    {
        if (!video || !video.videoWidth || !video.videoHeight) return

        const ratio = video.videoWidth / video.videoHeight
        if (ratio > 0) root.style.setProperty('--jellychat-ar', String(ratio))
    }

    const onChange = (event) => apply(event.target)

    const detach = () =>
    {
        if (!current) return
        current.removeEventListener('loadedmetadata', onChange)
        current.removeEventListener('resize', onChange)
        current = null
        root.style.removeProperty('--jellychat-ar')
    }

    const sync = () =>
    {
        const video = document.querySelector('video.htmlvideoplayer') || document.querySelector('video')

        if (!video)
        {
            detach()
            return
        }

        if (video === current)
        {
            apply(video)
            return
        }

        detach()
        current = video
        video.addEventListener('loadedmetadata', onChange)
        video.addEventListener('resize', onChange)
        apply(video)
    }

    sync()

    const observer = new MutationObserver(() => sync())
    observer.observe(document.body, { childList: true, subtree: true })
}
