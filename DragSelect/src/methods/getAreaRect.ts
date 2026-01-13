import { DSArea, DSBoundingRect } from '../types'
/**
 * Returns the top/left/bottom/right/width/height
 * values of an area. If area is document then everything
 * except the sizes will be nulled.
 */

export const getAreaRect = (
  area: DSArea,
  zoom: number,
  containerSelector?: Element | null,
  containerOffset?: Element | null
): DSBoundingRect => {
  if (area instanceof Document)
    return {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }

  const rect = area.getBoundingClientRect()

  const areaSelectorHeight =
    containerSelector && containerOffset
      ? containerSelector?.clientHeight - containerOffset?.clientHeight - 3
      : null

  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: (area.clientWidth || rect.width) * zoom,
    height: (areaSelectorHeight || area.clientHeight || rect.height) * zoom,
  }
}
