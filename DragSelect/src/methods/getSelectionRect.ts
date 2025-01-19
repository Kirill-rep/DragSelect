import SelectableSet from '../modules/SelectableSet'
import SelectedSet from '../modules/SelectedSet'
import { DSBoundingRect, DSInputElement } from '../types'

// @TODO: calculate the difference in all directions based on the mouse position! (since the selection square ratio won’t change we don’t have to re-calculate and re-fetch the position of every element in the square during drag)

/** Returns the compound bounding rect of multiple elements */
export const getSelectionRect = <E extends DSInputElement>(
  SelectedSet: SelectedSet<E>,
  ghostElem?: DSInputElement
): DSBoundingRect => {
  const rect = {
    top: Number.POSITIVE_INFINITY,
    left: Number.POSITIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    width: Number.NEGATIVE_INFINITY,
    height: Number.NEGATIVE_INFINITY,
  }
  if (ghostElem) {
    console.log('ghostElem')
    // const firstValue = SelectedSet.rects.entries().next()
    // let element: DSBoundingRect | undefined = undefined
    // if (firstValue) {
    //   element = firstValue.value
    // }
    rect.top = Math.min(rect.top, element.top || rect.top)
    rect.left = Math.min(rect.left, element.left || rect.left)
    rect.bottom = Math.max(rect.bottom, element.bottom || rect.bottom)
    rect.right = Math.max(rect.right, element.right || rect.right)
  } else {
    // console.log(SelectedSet.rects)
    SelectedSet.rects.forEach((elementRect) => {
      rect.top = Math.min(rect.top, elementRect.top || rect.top)
      rect.left = Math.min(rect.left, elementRect.left || rect.left)
      rect.bottom = Math.max(rect.bottom, elementRect.bottom || rect.bottom)
      rect.right = Math.max(rect.right, elementRect.right || rect.right)
    })
  }
  // console.log(rect)
  rect.height = rect.bottom - rect.top
  rect.width = rect.right - rect.left

  return rect
}
