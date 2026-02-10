// [PR 목록 패널] 대기 중인 PR 목록 표시
import { PullRequest } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
    prs: PullRequest[];
    onSelect: (pr: PullRequest) => void;
}

export default function PRListPanel({ prs, onSelect }: Props) {
    if (prs.length === 0) {
        return <div className="pr-empty">대기 중인 요청이 없습니다.</div>;
    }

    return (
        <div className="pr-list">
            {prs.map(pr => (
                <div key={pr.id} className="pr-item" onClick={() => onSelect(pr)}>
                    <div className="pr-header">
                        <span className="pr-file">📄 {pr.filePath.split(/[\\/]/).pop()}</span>
                        <span className="pr-time">{formatDistanceToNow(pr.timestamp, { addSuffix: true, locale: ko })}</span>
                    </div>
                    <div className="pr-message">💬 {pr.message || '(내용 없음)'}</div>
                    <div className="pr-author">👤 {pr.guestEmail}</div>
                </div>
            ))}
        </div>
    );
}

// 간단한 스타일 (나중에 CSS로 이동 가능)
// .pr-item { padding: 10px; border-bottom: 1px solid #333; cursor: pointer; }
// .pr-item:hover { background: #2a2d3e; }
