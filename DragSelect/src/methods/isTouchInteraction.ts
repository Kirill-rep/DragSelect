import { DSEvent } from '../types'

export const isTouchInteraction = (event?: DSEvent | Event) => {
  if (!event) return false

  if ('touches' in event || 'changedTouches' in event) return true

  if ('pointerType' in event && (event as PointerEvent).pointerType === 'touch')
    return true

  return false
}
