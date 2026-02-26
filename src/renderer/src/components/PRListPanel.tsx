// [PR 목록 패널] PR 목록 표시 (상태 포함)
import { PullRequest } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

interface Props {
    prs: PullRequest[];
    onSelect: (pr: PullRequest) => void;
}

export default function PRListPanel({ prs, onSelect }: Props) {
    const { t } = useTranslation()

    if (prs.length === 0) {
        return <div className="pr-empty" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>{t('dashboard.noProjects') || '요청 내역이 없습니다.'}</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#22c55e'; // Green
            case 'rejected': return '#ef4444'; // Red
            default: return '#fbbf24'; // Amber (Pending)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return '✅';
            case 'rejected': return '⛔';
            default: return '⏳';
        }
    }

    return (
        <div className="pr-list">
            {prs.map(pr => (
                <div
                    key={pr.id}
                    className="pr-item"
                    onClick={() => onSelect(pr)}
                    style={{
                        padding: '12px',
                        borderBottom: '1px solid #333',
                        cursor: 'pointer',
                        backgroundColor: '#1e1e1e',
                        opacity: pr.status === 'pending' ? 1 : 0.8
                    }}
                >
                    <div className="pr-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="pr-file" style={{ fontWeight: 'bold', color: '#e0e0e0' }}>📄 {pr.filePath.split(/[\\/]/).pop()}</span>
                        <span className="pr-status" style={{ color: getStatusColor(pr.status), fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {getStatusIcon(pr.status)} {pr.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="pr-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>
                        <span className="pr-author">👤 {pr.guestEmail}</span>
                        <span className="pr-time">{formatDistanceToNow(pr.timestamp, { addSuffix: true, locale: ko })}</span>
                    </div>
                    <div className="pr-message" style={{ fontSize: '0.9rem', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        💬 {pr.message || '(내용 없음)'}
                    </div>
                    {pr.status === 'rejected' && pr.review && (
                        <div className="pr-review" style={{ marginTop: '8px', fontSize: '0.85rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px' }}>
                            📝 <b>{t('pr.rejectLabel')}:</b> {pr.review}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// 간단한 스타일 (나중에 CSS로 이동 가능)
// .pr-item { padding: 10px; border-bottom: 1px solid #333; cursor: pointer; }
// .pr-item:hover { background: #2a2d3e; }
