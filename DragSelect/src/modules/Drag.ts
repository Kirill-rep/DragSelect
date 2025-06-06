import DragSelect from '../DragSelect'
import PubSub from './PubSub'
import {
  CustomStyle,
  DSBoundingRect,
  DSDragKeys,
  DSInputElement,
  Vect2,
} from '../types'
import { DSSettings } from '../stores/SettingsStore'
import { calcVect, num2vect, vect2rect } from '../methods/vect2'
import { handleKeyboardDragPosDifference } from '../methods/handleKeyboardDragPosDifference'
import { moveElement } from '../methods/moveElement'
import { limitDirection } from '../methods/limitDirection'
import KeyStore from '../stores/KeyStore'

export default class Drag<E extends DSInputElement> {
  private _prevCursorPos?: Vect2
  private _prevScrollPos?: Vect2
  private _elements: E[] = []
  private _dragKeys?: DSDragKeys
  private _dragKeysFlat: string[] = []
  private _selectionRect: DSBoundingRect = vect2rect(num2vect(0))
  private _draggingElement: DSInputElement | null = null
  private _divElementOne: DSInputElement | null = null
  private _divElementTwo: DSInputElement | null = null
  private _readyDropZone: DSInputElement | undefined = undefined
  private _styles: Partial<CustomStyle> | undefined
  private _MultiSelect: KeyStore<E>
  private startDrag: boolean

  DS: DragSelect<E>
  PS: PubSub<E>
  Settings: DSSettings<E>

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this.startDrag = false
    this._MultiSelect = this.DS.stores.KeyStore
    // this.PS.subscribe('Settings:updated:dragKeys', this.assignDragKeys)
    // this.assignDragKeys()

    this.PS.subscribe('Interaction:start', this.start)
    this.PS.subscribe('Interaction:end', this.stop)
    this.PS.subscribe('Interaction:update', this.update)
    // this.PS.subscribe('KeyStore:down', this.keyboardDrag)
    // this.PS.subscribe('KeyStore:up', this.keyboardEnd)
  }

  // private assignDragKeys = () => {
  //   this._dragKeys = {
  //     up: this.Settings.dragKeys.up.map((k) => k.toLowerCase()),
  //     down: this.Settings.dragKeys.down.map((k) => k.toLowerCase()),
  //     left: this.Settings.dragKeys.left.map((k) => k.toLowerCase()),
  //     right: this.Settings.dragKeys.right.map((k) => k.toLowerCase()),
  //   }
  //   this._dragKeysFlat = [
  //     ...this._dragKeys.up,
  //     ...this._dragKeys.down,
  //     ...this._dragKeys.left,
  //     ...this._dragKeys.right,
  //   ]
  // }

  // private keyboardDrag = ({
  //   event,
  //   key,
  // }: {
  //   event: KeyboardEvent
  //   key: string
  // }) => {

  //   const _key = key.toLowerCase()

  //   if (
  //     !this.Settings.keyboardDrag ||
  //     !this._dragKeysFlat.includes(_key) ||
  //     !this.DS.SelectedSet.size ||
  //     !this.Settings.draggability ||
  //     this.DS.continue
  //   )
  //     return

  //   const publishData = {
  //     event,
  //     isDragging: true,
  //     isDraggingKeyboard: true,
  //     key,
  //   }
  //   this.PS.publish(['Interaction:start:pre', 'Interaction:start'], publishData)

  //   this._elements = this.DS.getSelection()
  //   this._selectionRect = this.DS.Selection.boundingRect
  //   this.handleZIndex(true)

  //   let posDirection = handleKeyboardDragPosDifference({
  //     shiftKey: this.DS.stores.KeyStore.currentValues.includes('shift'),
  //     keyboardDragSpeed: this.Settings.keyboardDragSpeed,
  //     zoom: this.Settings.zoom,
  //     key: _key,
  //     scrollDiff: this._scrollDiff,
  //     dragKeys: this._dragKeys,
  //   })

  //   posDirection = limitDirection({
  //     direction: posDirection,
  //     containerRect: this.DS.SelectorArea.rect,
  //     scrollAmount: this.DS.stores.ScrollStore.scrollAmount,
  //     selectionRect: this._selectionRect,
  //   })

  //   this.moveElements(posDirection)

  //   this.PS.publish(
  //     ['Interaction:update:pre', 'Interaction:update'],
  //     publishData
  //   )
  // }

  // private keyboardEnd = ({
  //   event,
  //   key,
  // }: {
  //   event: KeyboardEvent
  //   key: string
  // }) => {
  //   return
  //   const _key = key.toLowerCase()
  //   if (
  //     !this.Settings.keyboardDrag ||
  //     !this._dragKeysFlat.includes(_key) ||
  //     !this.DS.SelectedSet.size ||
  //     !this.Settings.draggability
  //   )
  //     return
  //   const publishData = {
  //     event,
  //     isDragging: this.Settings.draggability,
  //     isDraggingKeyboard: true,
  //     key,
  //   }
  //   this.PS.publish(['Interaction:end:pre', 'Interaction:end'], publishData)
  // }

  private start = ({
    isDragging,
    isDraggingKeyboard,
  }: {
    isDragging?: boolean
    isDraggingKeyboard?: boolean
  }) => {
    if (!isDragging || isDraggingKeyboard) return

    this._prevCursorPos = undefined
    this._prevScrollPos = undefined
    this._elements = this.DS.getSelection()
    this._selectionRect = this.DS.Selection.boundingRect
    this.handleZIndex(true)
    this.startDrag = true

    if (!this._draggingElement) {
      this._draggingElement = document.createElement('div')
      this._draggingElement.classList.add('drag-ghost')

      const multipleItems = this._elements.length > 1 ? true : false
      this._styles = multipleItems
        ? this.DS.Style.stylesItem.manyElem
        : this.DS.Style.stylesItem.singleElem
      const text = this.DS.Style.text
      const stylesDivManyElWithText = this.DS.Style.stylesItem.divManyElWithText

      if (multipleItems) {
        this._divElementOne = null
        this._divElementTwo = document.createElement('div')
        Object.assign(this._divElementTwo.style, stylesDivManyElWithText)
        this._divElementTwo.textContent = text || null
      } else {
        if (this.DS.Style.picture) {
          this.DS.Style.picture.style.maxWidth = '35ch'
        }
        this._divElementTwo = null
        this._divElementOne = this.DS.Style.picture || null
      }
    }
  }

  public stop = () => {
    this._prevCursorPos = undefined
    this._prevScrollPos = undefined
    this.handleZIndex(false)
    this._elements.forEach((el) => {
      el.classList.remove('isDragging')
    })
    this._readyDropZone?.classList.remove('ds-dropzone-ready-drop')
    this._elements = []
    this._draggingElement?.remove()
    this._draggingElement = null
  }

  private update = ({
    isDragging,
    isDraggingKeyboard,
  }: {
    isDragging?: boolean
    isDraggingKeyboard?: boolean
  }) => {
    if (
      !isDragging ||
      !this._elements.length ||
      isDraggingKeyboard ||
      this.DS.continue
    )
      return

    if (!document.querySelector('.drag-ghost') && this._draggingElement) {
      if (this.startDrag) {
        this.startDrag = false
        this._elements.forEach((el) => {
          el.classList.add('isDragging')
        })

        Object.assign(this._draggingElement.style, this._styles, {
          left: `${this.DS.getCurrentCursorPosition().x - 14}px`,
          top: `${this.DS.getCurrentCursorPosition().y - 15}px`,
        })
      }

      document.body.appendChild(this._draggingElement)
      if (this._divElementOne)
        this._draggingElement.appendChild(this._divElementOne)
      if (this._divElementTwo)
        this._draggingElement.appendChild(this._divElementTwo)
    }

    let posDirection = calcVect(this._cursorDiff, '+', this._scrollDiff)
    this.addReadyDropZone()

    posDirection = limitDirection({
      direction: posDirection,
      containerRect: this.DS.SelectorArea.rect,
      scrollAmount: this.DS.stores.ScrollStore.scrollAmount,
      selectionRect: this._selectionRect,
    })
    this.moveElements(posDirection)
  }

  private handleZIndex = (add: boolean) => {
    if (this.Settings.useLayers) {
      this._elements.forEach(
        (element) =>
          (element.style.zIndex = `${
            (parseInt(element.style.zIndex) || 0) + (add ? 9999 : -9998)
          }`)
      )
    }
  }

  private moveElements = (posDirection: Vect2) => {
    // [PUBLICLY EXPOSED METHOD]
    const { elements, direction } = this.filterDragElements({
      elements: this._elements,
      direction: posDirection,
    })

    moveElement({
      element: this._draggingElement ? this._draggingElement : elements[0],
      posDirection: direction,
      containerRect: this.DS.SelectorArea.rect,
      useTransform: this.Settings.useTransform,
    })
  }

  private get _cursorDiff() {
    const currentPointerVal = this.DS.stores.PointerStore.currentVal
    const cursorDiff = this._prevCursorPos
      ? calcVect(currentPointerVal, '-', this._prevCursorPos)
      : { x: 0, y: 0 }
    this._prevCursorPos = currentPointerVal
    return cursorDiff
  }

  private get _scrollDiff() {
    const currentScrollVal = this.DS.stores.ScrollStore.currentVal
    const scrollDiff = this._prevScrollPos
      ? calcVect(currentScrollVal, '-', this._prevScrollPos)
      : { x: 0, y: 0 }
    this._prevScrollPos = currentScrollVal
    return scrollDiff
  }

  private addReadyDropZone() {
    const { x, y } = this.DS.getCurrentCursorPosition()
    const elementsFromPoint = document.elementsFromPoint(x, y)
    const dropZoneFromPoint = (elementsFromPoint as HTMLElement[]).filter(
      (el) => el.closest('.ds-dropzone-ready')
    )
    const newReadyDropZone = dropZoneFromPoint.find((element) =>
      element.classList.contains('ds-dropzone-ready')
    )

    if (this._readyDropZone && this._readyDropZone !== newReadyDropZone) {
      this._readyDropZone.classList.remove('ds-dropzone-ready-drop')
    }

    this._readyDropZone = newReadyDropZone

    if (this._readyDropZone) {
      this._readyDropZone.classList.add('ds-dropzone-ready-drop')
    }
  }

  ////
  // [PUBLICLY EXPOSED METHODS]

  /**
   * Can be overridden to apply further filtering logic after the items to move are identified but before they actually get moved
   * Is expected to return the elements in the same shape as passed in
   */
  public filterDragElements = ({
    elements,
    direction,
  }: {
    elements: E[]
    direction: Vect2
  }) => ({
    elements,
    direction,
  })
}
