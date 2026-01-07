// [타입 정의] Main Process에서 사용하는 공통 인터페이스 (Project, User, ServerInstance)

import express from 'express'
import http from 'http'
import {Server} from 'socket.io'

export interface Project {
  id: number,
  name: string,
  path: string,
  port: number,
  lastUsed: string
}

export interface ServerInstance {
  app: express.Express,
  http: http.Server,
  io: Server
}

export interface User {
  email: string,
  password: string,
  status: 'pending' | 'approved' | 'rejected';
}

