// [케밥 메뉴] 프로젝트 설정/삭제 등의 드롭다운 메뉴 컴포넌트
import { useTranslation } from 'react-i18next'

interface Props {
    isOpen: boolean
    onAction: (action: string) => void
}

export default function KebabMenu({ isOpen, onAction }: Props) {
    const { t } = useTranslation()

    if (!isOpen) return null

    return (
        <div className="dropdown-menu">
            <div onClick={() => onAction('settings')}>⚙️ {t('menu.settings')}</div>
            <div onClick={() => onAction('rename')}>✏️ {t('menu.rename')}</div>
            <div onClick={() => onAction('openFolder')}>📂 {t('menu.openFolder')}</div>
            <hr />
            <div className="danger" onClick={() => onAction('delete')}>🗑️ {t('menu.deleteProject')}</div>
        </div>
    )
}