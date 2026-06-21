import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources.js'
import { logDebug } from '../lib/api.js'

const FALLBACK = 'en'

const detectJellyfinLanguage = () =>
{
    try
    {
        let bare = null
        for (let i = 0; i < localStorage.length; i += 1)
        {
            const key = localStorage.key(i)
            if (!key) continue
            if (/-language$/i.test(key))
            {
                const value = localStorage.getItem(key)
                if (value) return value
            }
            if (key.toLowerCase() === 'language') bare = localStorage.getItem(key)
        }
        if (bare) return bare
    }
    catch (err)
    {
        logDebug('Failed to read Jellyfin language from storage', err)
    }

    const htmlLang = document.documentElement.getAttribute('lang')
    if (htmlLang) return htmlLang

    return (typeof navigator !== 'undefined' && navigator.language) || FALLBACK
}

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: detectJellyfinLanguage(),
        fallbackLng: FALLBACK,
        load: 'languageOnly',
        supportedLngs: [...Object.keys(resources), FALLBACK],
        nonExplicitSupportedLngs: true,
        interpolation: { escapeValue: false },
        returnNull: false,
        react: { useSuspense: false }
    })

const syncLanguage = () =>
{
    const detected = detectJellyfinLanguage()
    const primary = String(detected).toLowerCase().split('-')[0]
    if (primary && primary !== i18n.resolvedLanguage)
    {
        i18n.changeLanguage(detected)
    }
}

window.addEventListener('focus', syncLanguage)

export default i18n
