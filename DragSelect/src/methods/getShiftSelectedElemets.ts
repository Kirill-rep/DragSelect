import { DSInputElement } from '../types'

export const getShiftSelectedElemets = (
  el: DSInputElement,
  selectedElements: DSInputElement[],
  arrSelectableEl: DSInputElement[]
) => {
  const clickedIndex = arrSelectableEl.indexOf(el)
  if (clickedIndex === -1) return []

  if (selectedElements.length === 0) {
    return []
  }

  const selectedIndexes = selectedElements
    .map((el) => arrSelectableEl.indexOf(el))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b)

  const upperSelected = selectedIndexes.filter((idx) => idx < clickedIndex)
  const lowerSelected = selectedIndexes.filter((idx) => idx > clickedIndex)

  let fromIndex = clickedIndex
  let toIndex = clickedIndex

  if (upperSelected.length && lowerSelected.length) {
    fromIndex = upperSelected[upperSelected.length - 1]
    toIndex = lowerSelected[0]
  } else if (upperSelected.length) {
    fromIndex = upperSelected[upperSelected.length - 1]
  } else if (lowerSelected.length) {
    toIndex = lowerSelected[0]
  } else {
    return [el]
  }

  if (fromIndex > toIndex) [fromIndex, toIndex] = [toIndex, fromIndex]

  return arrSelectableEl.slice(fromIndex, toIndex + 1)
}
