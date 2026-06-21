import { useEffect, useRef, useState } from 'react';
import { logDebug } from '../lib/api.js';
import { isCurrentUserInSyncPlayGroup } from '../lib/presence.js';

const REFRESH_INTERVAL_MS = 5000;

export const useSyncPlayPresence = (forceShow = false) =>
{
    const [inGroup, setInGroup] = useState(forceShow)
    const refreshInProgress = useRef(false)

    useEffect(() =>
    {
        if (forceShow)
        {
            setInGroup(true)
            return undefined
        }

        let cancelled = false

        const refresh = async () =>
        {
            if (refreshInProgress.current) return

            refreshInProgress.current = true
            try
            {
                const result = await isCurrentUserInSyncPlayGroup()
                if (!cancelled)
                {
                    setInGroup(result)
                }
            }
            catch (err)
            {
                logDebug('Failed to refresh SyncPlay state', err)
            }
            finally
            {
                refreshInProgress.current = false
            }
        }

        const refreshOnVisible = () =>
        {
            if (!document.hidden)
            {
                refresh()
            }
        };

        refresh()
        const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS)
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', refreshOnVisible)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refreshOnVisible)
        }
    }, [forceShow])

    return inGroup
}
