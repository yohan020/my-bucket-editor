// [프로젝트 생성 페이지] 새 프로젝트 이름과 경로를 입력받는 폼 화면
import { useState } from 'react'
import { Project } from '../types'

interface Props {
    projectCount: number
    onCreate: (project: Project) => void
    onCancel: () => void
}

export default function CreateProjectPage({ projectCount, onCreate, onCancel }: Props) {
    const [name, setName] = useState('')
    const [path, setPath] = useState('')

    const handleSelectFolder = async () => {
        const selected = await window.api.selectFolder()
        if (selected) setPath(selected)
    }

    const handleCreate = () => {
        if (!path || !name) {
            alert('이름과 경로를 모두 입력해주세요.')
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
        alert('프로젝트가 생성되었습니다!')
    }

    return (
        <div className="center-container">
            <div className="create-card">
                <h1>새 프로젝트 생성</h1>

                <div className="input-group">
                    <label>프로젝트 이름</label>
                    <input type="text" placeholder="예: 팀 프로젝트 A" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="input-group">
                    <label>경로</label>
                    <div className="path-select-row">
                        <input type="text" className="path-display" readOnly value={path} placeholder="오른쪽 폴더 아이콘을 눌러 선택하세요" />
                        <button className="folder-btn" onClick={handleSelectFolder}>📂</button>
                    </div>
                </div>

                <div className="bottom-btn-group">
                    <button className="secondary-btn half-btn" onClick={onCancel}>취소</button>
                    <button className="primary-btn half-btn" onClick={handleCreate}>생성</button>
                </div>
            </div>
        </div>
    )
}