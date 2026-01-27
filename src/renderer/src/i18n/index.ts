// [i18n 설정] 다국어 지원 (한국어, 영어, 일본어)
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ko from './locales/ko.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ko: { translation: ko },
            en: { translation: en },
            ja: { translation: ja }
        },
        fallbackLng: 'ko',  // 기본 언어: 한국어
        interpolation: {
            escapeValue: false  // React에서는 XSS 보호가 기본 제공
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    })

export default i18n
