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
  private _selectedElements: E[]
  private _isSelecteedElementPass?: boolean

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    super()
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this._selectedElements = []
  }

  public add(element?: E, selection?: boolean) {
    if (!element || super.has(element)) return this
    const publishData = {
      items: this.elements,
      item: element,
    }

    const row = element.parentElement
    if (row && selection) row.classList.add('selection')

    this.PS.publish('Selected:added:pre', publishData)
    super.add(element)

    element.classList.add(this.Settings.selectedClass)

    if (element.closest('.ds-folder')) {
      this._selectedElements = Array.from(
        document.querySelectorAll('.ds-selected.dsFolderSelection')
      ) as E[]
      this._isSelecteedElementPass = false
    } else {
      this._selectedElements = Array.from(
        document.querySelectorAll('.ds-selected:not(.dsFolderSelection)')
      ) as E[]
      this._isSelecteedElementPass = true
    }

    this.updateGroups(this._selectedElements, element)

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
    const row = element.parentElement
    if (row) row.classList.remove('selection')
    this.PS.publish('Selected:removed:pre', publishData)
    const deleted = super.delete(element)

    element.classList.remove(this.Settings.selectedClass)

    if (element.closest('.ds-folder')) {
      this._selectedElements = Array.from(
        document.querySelectorAll('.ds-selected.dsFolderSelection')
      ) as E[]
      this._isSelecteedElementPass = false
    } else {
      this._selectedElements = Array.from(
        document.querySelectorAll('.ds-selected:not(.dsFolderSelection)')
      ) as E[]
      this._isSelecteedElementPass = true
    }

    this.updateGroups(this._selectedElements, element, true)

    if (this.Settings.useLayers)
      element.style.zIndex = `${(parseInt(element.style.zIndex) || 0) - 1}`
    this.PS.publish('Selected:removed', publishData)
    return deleted
  }

  private updateGroups(elementsArr: E[], element: E, del?: boolean) {
    if (elementsArr.length === 0) return

    const groups: E[][] = []
    const currentGroup: E[] = []

    elementsArr.forEach((_, i) => {
      const currEl = elementsArr[i]
      const currparentEl = currEl.parentElement
      let isAdjacent: boolean | undefined

      if (currparentEl) {
        if (this._isSelecteedElementPass) {
          isAdjacent =
            currparentEl.nextElementSibling?.classList.contains('selection')
        } else {
          const secondParent =
            currparentEl.parentElement?.nextElementSibling?.querySelectorAll(
              '.selection'
            )
          isAdjacent = !!secondParent?.length
        }
      }

      if (isAdjacent) {
        currentGroup.push(currEl)
      } else {
        groups.push([...currentGroup, currEl])
        currentGroup.length = 0
      }
    })

    groups.forEach((gr) => {
      this.updateSelectedClasses(gr, element, del)
    })
  }

  private updateSelectedClasses(elementsArr: E[], element: E, del?: boolean) {
    const tr = element.parentElement?.closest('tr')
    let elementTd: E | HTMLTableCellElement = element
    let elementsArrTds: E[] | HTMLTableCellElement[] | (E | HTMLElement)[] =
      elementsArr
    if (tr) {
      const tds = Array.from(tr.querySelectorAll('td'))
      const index = tds.indexOf(element as HTMLTableCellElement)
      if (index > 1 && tds[1]) {
        elementTd = tds[1]
        elementsArrTds = elementsArr.map((el) =>
          el.parentElement?.closest('tr')
            ? el.parentElement.querySelectorAll('td')[1]
            : el
        )
      }
    }

    if (del) {
      elementTd.classList.remove(
        'selectedFirst',
        'selectedLast',
        'selectedIntermediate'
      )
    } else if (elementsArrTds.length > 1) {
      elementsArrTds.forEach((el) => {
        el.classList.remove(
          'selectedFirst',
          'selectedLast',
          'selectedIntermediate'
        )
      })
    }
    if (elementsArrTds.length === 1 && !del) {
      if (elementTd) elementTd.classList.add('selectedFirst', 'selectedLast')
    } else {
      if (elementsArrTds && elementsArrTds.length > 0) {
        if (elementsArrTds[0]) {
          elementsArrTds[0].classList.add('selectedFirst')
        }

        const lastElement = elementsArrTds[elementsArrTds.length - 1]
        if (lastElement) {
          lastElement.classList.add('selectedLast')

          if (elementsArrTds.length > 1) {
            elementsArrTds[elementsArrTds.length - 2].classList.remove(
              'selectedIntermediate'
            )
          }
        }
      }

      for (let i = 1; i < elementsArrTds.length - 1; i++) {
        if (elementsArrTds[i])
          elementsArrTds[i].classList.add('selectedIntermediate')
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

  public addAll = (elements: E[]) =>
    elements.forEach((el) => this.add(el, true))

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
