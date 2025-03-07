import DragSelect from '../DragSelect'
import PubSub from './PubSub'
import { DSSettings } from '../stores/SettingsStore'
import { DSBoundingRect, DSInputElement } from '../types'

export type DSSelectedPublishEventNames =
  | 'Selected:added:pre'
  | 'Selected:added'
  | 'Selected:removed'
  | 'Selected:removed:pre'

export type DSSelectedPublishEventData<E extends DSInputElement> = {
  items: E[]
  item: E
}

export type DSSelectedPublish<E extends DSInputElement> = {
  [K in DSSelectedPublishEventNames]: DSSelectedPublishEventData<E>
}

export default class SelectedSet<E extends DSInputElement> extends Set<E> {
  private _rects?: Map<E, DSBoundingRect>
  private _timeout?: NodeJS.Timeout
  private DS: DragSelect<E>
  private PS: PubSub<E>
  private Settings: DSSettings<E>
  private selectedElements: E[]

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    super()
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this.selectedElements = []
  }

  public add(element?: E) {
    if (!element || super.has(element)) return this
    const publishData = {
      items: this.elements,
      item: element,
    }
    this.PS.publish('Selected:added:pre', publishData)
    super.add(element)

    element.classList.add(this.Settings.selectedClass)

    if (element.closest('.ds-folder')) {
      this.selectedElements = Array.from(
        document.querySelectorAll('.ds-selected.dsFolderSelection')
      ) as E[]
    } else {
      this.selectedElements = Array.from(
        document.querySelectorAll('.ds-selected:not(.dsFolderSelection)')
      ) as E[]
    }

    this.selectedElements.forEach((el) => {
      el.classList.remove(
        'selectedFirst',
        'selectedIntermediate',
        'selectedLast'
      )
    })

    this.updateSelectedClasses(this.selectedElements, element)

    if (this.Settings.useLayers)
      element.style.zIndex = `${(parseInt(element.style.zIndex) || 0) + 1}`
    this.PS.publish('Selected:added', publishData)
    return this
  }

  public delete(element: E) {
    if (!element || !super.has(element)) return true
    const publishData = {
      items: this.elements,
      item: element,
    }
    this.PS.publish('Selected:removed:pre', publishData)
    const deleted = super.delete(element)

    element.classList.remove(this.Settings.selectedClass)
    const row = element.parentElement
    if (row) {
      row.classList.remove('selection')
    }

    if (element.closest('.ds-folder')) {
      this.selectedElements = Array.from(
        document.querySelectorAll('.ds-selected.dsFolderSelection')
      ) as E[]
    } else {
      this.selectedElements = Array.from(
        document.querySelectorAll('.ds-selected:not(.dsFolderSelection)')
      ) as E[]
    }

    element.classList.remove(
      'selectedFirst',
      'selectedIntermediate',
      'selectedLast'
    )

    this.updateSelectedClasses(this.selectedElements, element, true)

    if (this.Settings.useLayers)
      element.style.zIndex = `${(parseInt(element.style.zIndex) || 0) - 1}`
    this.PS.publish('Selected:removed', publishData)
    return deleted
  }

  private updateSelectedClasses(elementsArr: E[], element: E, del?: boolean) {
    if (elementsArr.length === 1 && !del) {
      if (element) element.classList.add('selectedFirst', 'selectedLast')
    } else {
      if (elementsArr && elementsArr.length > 0) {
        if (elementsArr[0]) {
          elementsArr[0].classList.add('selectedFirst')
        }

        const lastElement = elementsArr[elementsArr.length - 1]
        if (lastElement) {
          lastElement.classList.add('selectedLast')

          if (elementsArr.length > 1) {
            elementsArr[elementsArr.length - 2].classList.remove(
              'selectedIntermediate'
            )
          }
        }
      }

      for (let i = 1; i < elementsArr.length - 1; i++) {
        if (elementsArr[i]) elementsArr[i].classList.add('selectedIntermediate')
      }
    }
  }

  public clear = () => this.forEach((el) => this.delete(el))

  /** Adds/Removes an element. If it is already selected = remove, if not = add. */
  public toggle(element: E) {
    if (this.has(element)) this.delete(element)
    else this.add(element)
    return element
  }

  public addAll = (elements: E[]) => elements.forEach((el) => this.add(el))

  public deleteAll = (elements: E[]) =>
    elements.forEach((el) => this.delete(el))

  get elements() {
    return Array.from(this.values())
  }

  get rects() {
    if (this._rects) return this._rects
    this._rects = new Map()
    this.forEach(
      (element) => this._rects?.set(element, element.getBoundingClientRect())
    )

    // since elements can be moved, we need to update the rects every X ms
    if (this._timeout) clearTimeout(this._timeout)
    this._timeout = setTimeout(
      () => (this._rects = undefined),
      this.Settings.refreshMemoryRate
    )

    return this._rects
  }
}
