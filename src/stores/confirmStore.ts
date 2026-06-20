import { create } from 'zustand'

interface ConfirmState {
  open: boolean
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  resolve?: (result: boolean) => void
}

interface ConfirmStore extends ConfirmState {
  showConfirm: (options: {
    message: string
    title?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }) => Promise<boolean>
  closeConfirm: (result: boolean) => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  message: '',
  title: undefined,
  confirmText: undefined,
  cancelText: undefined,
  danger: false,
  resolve: undefined,

  showConfirm: (options) => {
    return new Promise((resolve) => {
      set({
        open: true,
        message: options.message,
        title: options.title,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        danger: options.danger || false,
        resolve,
      })
    })
  },

  closeConfirm: (result) => {
    const { resolve } = get()
    if (resolve) resolve(result)
    set({ open: false, resolve: undefined })
  },
}))

export function confirm(message: string): boolean {
  // Fallback to window.confirm for synchronous usage
  return window.confirm(message)
}

export function confirmAsync(options: {
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}): Promise<boolean> {
  return useConfirmStore.getState().showConfirm(options)
}
