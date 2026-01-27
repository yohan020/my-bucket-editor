// [프로젝트 생성 페이지] 새 프로젝트 이름과 경로를 입력받는 폼 화면
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types'

interface Props {
    projectCount: number
    onCreate: (project: Project) => void
    onCancel: () => void
}

export default function CreateProjectPage({ projectCount, onCreate, onCancel }: Props) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [path, setPath] = useState('')

    const handleSelectFolder = async () => {
        const selected = await window.api.selectFolder()
        if (selected) setPath(selected)
    }

    const handleCreate = () => {
        if (!path || !name) {
            alert(t('errors.serverError'))
            return
        }

        const newProject: Project = {
            id: Date.now(),
            name,
            path,
            port: 3000 + projectCount,
            lastUsed: new Date().toDateString()
        }

        onCreate(newProject)
        alert(`${t('common.create')} ✓`)
    }

    return (
        <div className="center-container">
            <div className="create-card">
                <h1>{t('createProject.title')}</h1>

                <div className="input-group">
                    <label>{t('createProject.projectName')}</label>
                    <input type="text" placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="input-group">
                    <label>{t('createProject.projectPath')}</label>
                    <div className="path-select-row">
                        <input type="text" className="path-display" readOnly value={path} placeholder={t('createProject.selectFolder')} />
                        <button className="folder-btn" onClick={handleSelectFolder}>📂</button>
                    </div>
                </div>

                <div className="bottom-btn-group">
                    <button className="secondary-btn half-btn" onClick={onCancel}>{t('common.cancel')}</button>
                    <button className="primary-btn half-btn" onClick={handleCreate}>{t('common.create')}</button>
                </div>
            </div>
        </div>
    )
}