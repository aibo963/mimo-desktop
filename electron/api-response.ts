export interface SuccessResponse<T = void> {
  success: true
  data?: T
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse

export function createSuccess<T>(data?: T): SuccessResponse<T> {
  return { success: true, data }
}

export function createError(error: string, code?: string): ErrorResponse {
  return { success: false, error, code }
}

export function wrapHandler<T>(fn: () => T | Promise<T>): Promise<ApiResponse<T>> {
  return Promise.resolve()
    .then(() => fn())
    .then((data) => createSuccess(data))
    .catch((err) => createError(err.message || 'Unknown error'))
}
