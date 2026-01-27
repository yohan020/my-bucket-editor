// [인증 라우트] 게스트 로그인 API (/api/login) - 유저 인증 및 승인 요청 처리
import { Router } from 'express'
import { projectUsers } from '../index'
import { User } from '../../types'
import { generateToken } from '../utils/jwt'
import { isApprovedUser } from '../../utils/userStore'

export function createAuthRouter(port: number): Router {
    const router = Router()

    router.post('/api/login', async (req, res) => {
        const {email, password} = req.body

        // 영구 저장된 유저인지 확인 (해당 프로젝트/포트)
        if (await isApprovedUser(port, email, password)) {
            const token = generateToken({ email, port })
            return res.json({ success: true, token })
        }

        const users = projectUsers.get(port) || [];
        const existingUser = users.find(u => u.email === email)

        // A. 이미 등록된 유저인 경우
        if (existingUser) {
          if (existingUser.password !== password) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸습니다'})
          }

          if (existingUser.status === 'pending') {
            return res.status(202).json({ success: false, message: '⏳ 호스트의 승인을 기다리는 중입니다.'})
          }

          if (existingUser.status === 'rejected') {
            return res.status(403).json({ success: false, message: '⛔ 접속이 거절되었습니다.'})
          }
        }

        // B. 등록되지 않은 유저인 경우
        const newUser: User = { email, password, status: 'pending'}
        users.push(newUser)
        projectUsers.set(port, users);


        // 기존 알림 코드 제거 - UserManageModal에서 대기 목록으로 대체됨


        return res.status(201).json({success: false, message: '📨 승인 요청을 보냈습니다. 호스트가 수락하면 다시 로그인하세요.'})
    })
    return router
}