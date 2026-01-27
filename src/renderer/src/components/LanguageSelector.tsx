// [언어 선택] 다국어 전환 드롭다운 컴포넌트
import { useTranslation } from 'react-i18next'

const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' }
]

export default function LanguageSelector() {
    const { i18n } = useTranslation()

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        i18n.changeLanguage(e.target.value)
    }

    return (
        <select
            className="language-selector"
            value={i18n.language}
            onChange={handleChange}
        >
            {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                </option>
            ))}
        </select>
    )
}
