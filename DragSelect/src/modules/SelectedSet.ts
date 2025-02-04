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
  private firstOfElement: boolean
  private currentOfElement: DSInputElement | null

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    super()
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this.firstOfElement = false
    this.currentOfElement = null
  }

  public add(element?: E) {
    if (!element || super.has(element)) return this
    const publishData = {
      items: this.elements,
      item: element,
    }
    this.PS.publish('Selected:added:pre', publishData)
    super.add(element)

    if (!this.firstOfElement) {
      this.firstOfElement = true
      element.classList.add('selectedFirst')
    } else if (this.currentOfElement) {
      this.currentOfElement.classList.remove('selectedLast')
      if (!this.currentOfElement.classList.contains('selectedFirst')) {
        this.currentOfElement.classList.add('selectedIntermediate')
      }
    }

    this.currentOfElement = element
    element.classList.add('selectedLast')

    element.classList.add(this.Settings.selectedClass)

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

    element.classList.remove(
      this.Settings.selectedClass,
      'selectedFirst',
      'selectedIntermediate',
      'selectedLast'
    )

    if (this.elements.length === 0) {
      this.firstOfElement = false
      this.currentOfElement = null
    } else if (this.elements.length === 1) {
      const remainingElement = this.elements[0]
      remainingElement.classList.add('selectedLast')
      this.currentOfElement = remainingElement
    } else {
      const elementsArray = Array.from(this.elements)
      this.currentOfElement = elementsArray[elementsArray.length - 1]

      this.currentOfElement.classList.remove('selectedIntermediate')
      this.currentOfElement.classList.add('selectedLast')
    }

    if (this.Settings.useLayers)
      element.style.zIndex = `${(parseInt(element.style.zIndex) || 0) - 1}`
    this.PS.publish('Selected:removed', publishData)
    return deleted
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
