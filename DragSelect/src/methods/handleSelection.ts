import SelectedSet from '../modules/SelectedSet'
import { DSInputElement } from '../types'

type Props<E extends DSInputElement> = {
  element: E
  force?: boolean
  multiSelectionToggle: boolean
  SelectedSet: SelectedSet<E>
  hoverClassName: string
}

/** Logic when an element is selected */
export const handleSelection = <E extends DSInputElement>({
  element,
  force,
  multiSelectionToggle,
  SelectedSet,
  hoverClassName,
}: Props<E>) => {
  if (element.classList.contains(hoverClassName) && !force) return
  const row = element.parentElement

  if (!SelectedSet.has(element)) {
    if (row) row.classList.add('selection')
    SelectedSet.add(element)
  } else if (multiSelectionToggle) {
    SelectedSet.delete(element)
  }

  element.classList.add(hoverClassName)
}
