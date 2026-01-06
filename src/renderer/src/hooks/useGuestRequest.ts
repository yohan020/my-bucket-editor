// [게스트 요청 훅] 게스트 접속 승인 요청 이벤트를 수신하는 커스텀 훅
import { useEffect } from 'react'

export function useGuestRequest(onRequest: (port: number, email: string) => void) {
  useEffect(() => {
    const cleanup = window.api.onGuestRequest((data) => {
      onRequest(data.port, data.email)
    })
    return cleanup
  }, [onRequest])
}