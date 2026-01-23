// [파일 아이콘 유틸] vscode-icons-js를 사용한 SVG 아이콘
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js'

// CDN URL for vscode-icons SVG files
const ICONS_CDN_BASE = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons'

/**
 * 파일명에 해당하는 SVG 아이콘 URL 반환
 */
export function getFileIconUrl(fileName: string): string {
    const iconName = getIconForFile(fileName)
    if (iconName) {
        return `${ICONS_CDN_BASE}/${iconName}`
    }
    return `${ICONS_CDN_BASE}/default_file.svg`
}

/**
 * 폴더 아이콘 URL 반환
 */
export function getFolderIconUrl(folderName: string, isOpen: boolean): string {
    const iconName = isOpen 
        ? getIconForOpenFolder(folderName)
        : getIconForFolder(folderName)
    if (iconName) {
        return `${ICONS_CDN_BASE}/${iconName}`
    }
    return isOpen 
        ? `${ICONS_CDN_BASE}/default_folder_opened.svg`
        : `${ICONS_CDN_BASE}/default_folder.svg`
}

// 이모지 fallback (네트워크 오류 시 대비)
const iconMapFallback: Record<string, string> = {
    py: '🐍', js: '🟨', ts: '🔷', tsx: '⚛️', jsx: '⚛️',
    c: '🔵', cpp: '🔵', java: '☕', go: '🐹', rs: '🦀',
    html: '🌐', css: '🎨', json: '📋', md: '📝',
}

export function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return iconMapFallback[ext || ''] || '📄'
}

export function getFolderIcon(isOpen: boolean): string {
    return isOpen ? '📂' : '📁'
}

// 사용하지 않는 함수 (호환성)
export function getFileIconClass(_fileName: string): string {
    return ''
}
