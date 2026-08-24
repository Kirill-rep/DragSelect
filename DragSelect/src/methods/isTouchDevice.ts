export const isTouchDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined')
    return false

  const userAgent = navigator.userAgent || ''

  if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) return true

  if (/Macintosh|Mac OS X/i.test(userAgent) && navigator.maxTouchPoints > 1)
    return true

  if (window.matchMedia?.('(any-pointer: fine)').matches) return false

  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}
