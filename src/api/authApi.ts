import apiClient from './axiosClient'
import type { LoginRequest, RefreshTokenRequest, TokenResponse } from '../types/models'

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
}

export const register = async (request: RegisterRequest): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/auth/register', request)
  return response.data
}

export const login = async (request: LoginRequest): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/auth/login', request)
  return response.data
}

export const refreshToken = async (request: RefreshTokenRequest): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/auth/refresh', request)
  return response.data
}
