import { Vect2 } from '../types'
import { getDocumentScroll } from './getDocumentScroll'

export type GetCurrentScroll = {
  (): Vect2
}

export const getCurrentWindowScroll: GetCurrentScroll = () => {
  return {
    x: getDocumentScroll().x,
    y: getDocumentScroll().y,
  }
}
