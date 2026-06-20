import { useCallback, useEffect } from 'react'

export function useNotification() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      })
    }
  }, [])

  return { notify }
}
