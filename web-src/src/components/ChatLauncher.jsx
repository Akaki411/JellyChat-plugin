import { useTranslation } from 'react-i18next'
import { IconMessageCircle } from '@tabler/icons-react'

export const ChatLauncher = ({
    onExpand = () => {}
}) => {
    const { t } = useTranslation()

    return (
        <div className="syncplay-launcher" aria-label={t('actions.open')} title={t('actions.open')} onClick={onExpand}>
            <IconMessageCircle size={24} />
        </div>
    )
}
