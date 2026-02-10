// [인증 라우트] 게스트 로그인/회원가입 API - 유저 인증 및 승인 요청 처리
import { Router } from 'express'
import { projectUsers, servers } from '../index'
import { User } from '../../types'
import { generateToken } from '../utils/jwt'
import { isApprovedUser } from '../../utils/userStore'

export function createAuthRouter(projectId: number | string): Router {
    const router = Router()

    // 로그인 API
    router.post('/api/login', async (req, res) => {
        const {email, password} = req.body
        
        // 동적 포트 감지 (Express req.socket.localPort)
        const port = req.socket.localPort || 0
        
        // servers Map에서 projectName 찾기 (projectId 기반)
        // (server.handler.ts에서 넘겨받지 않고 직접 찾음 -> 더 안전)
        let projectName = 'Unknown Project'
        for (const s of servers.values()) {
            if (s.projectId === projectId) {
                projectName = s.projectName
                break
            }
        }

        // 영구 저장된 유저인지 확인 (projectId 기반)
        if (await isApprovedUser(projectId, email, password)) {
            // 토큰에 port와 projectId 모두 포함
            const token = generateToken({ email, port, projectId: Number(projectId) })
            return res.json({ success: true, token, projectName })
        }

        const users = projectUsers.get(Number(projectId)) || [];
        const existingUser = users.find(u => u.email === email)

        // A. 이미 등록된 유저인 경우
        if (existingUser) {
          if (existingUser.password !== password) {
            return res.status(401).json({ success: false, message: 'invalid_credentials' })
          }

          if (existingUser.status === 'pending') {
            return res.status(202).json({ success: false, message: 'pending_approval' })
          }

          if (existingUser.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'access_rejected' })
          }
        }

        // B. 등록되지 않은 유저인 경우 - 에러 반환 (별도 회원가입 필요)
        return res.status(401).json({ success: false, message: 'user_not_found' })
    })

    // 회원가입 (승인 요청) API
    router.post('/api/register', async (req, res) => {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'missing_fields' })
        }

        const numericProjectId = Number(projectId)
        const users = projectUsers.get(numericProjectId) || [];
        const existingUser = users.find(u => u.email === email)

        // 이미 등록된 유저인 경우
        if (existingUser) {
            if (existingUser.status === 'pending') {
                return res.status(409).json({ success: false, message: 'already_pending' })
            }
            if (existingUser.status === 'rejected') {
                return res.status(403).json({ success: false, message: 'access_rejected' })
            }
            // 이미 승인됨 - 로그인 하라고
            return res.status(409).json({ success: false, message: 'already_registered' })
        }

        // 영구 저장된 유저인지 확인
        if (await isApprovedUser(projectId, email, password)) {
            return res.status(409).json({ success: false, message: 'already_registered' })
        }

        // 새 유저 등록 (pending 상태)
        const newUser: User = { email, password, status: 'pending' }
        users.push(newUser)
        projectUsers.set(numericProjectId, users)

        return res.status(201).json({ success: true, message: 'request_sent' })
    })

    return router
}