// [서버 상태 관리] 실행 중인 서버와 프로젝트별 유저 목록을 전역 Map으로 관리

import {ServerInstance, User} from '../types'

// 전역 서버 상태 관리
export const servers = new Map<number, ServerInstance>()
export const projectUsers = new Map<number, User[]>()