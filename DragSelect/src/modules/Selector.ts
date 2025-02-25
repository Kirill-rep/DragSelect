import DragSelect from '../DragSelect'
import { createSelectorElement } from '../methods/createSelectorElement'
import { getSelectorPosition } from '../methods/getSelectorPosition'
import updateElementStylePos from '../methods/updateElementStylePos'
import { vect2rect } from '../methods/vect2'
import { DSSettings } from '../stores/SettingsStore'
import { AreaSize, DSBoundingRect, DSInputElement } from '../types'
import PubSub from './PubSub'

export default class Selector<E extends DSInputElement> {
  private _rect?: DSBoundingRect
  private DS: DragSelect<E>
  private PS: PubSub<E>
  private Settings: DSSettings<E>
  private ContainerSize?: AreaSize
  public HTMLNode: HTMLElement

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this.HTMLNode = this.Settings.selector // to make TS happy, will be replaced in `attachSelector`

    this.PS.subscribe('Settings:updated:selectorClass', ({ settings }) => {
      this.HTMLNode.classList.remove(settings['selectorClass:pre'])
      this.HTMLNode.classList.add(settings.selectorClass)
    })
    this.PS.subscribe('Settings:updated:selector', this.attachSelector)
    this.PS.subscribe('Settings:updated:customStyles', this.attachSelector)
    this.attachSelector()

    this.PS.subscribe('Interaction:start', this.start)
    this.PS.subscribe('Interaction:update', this.update)
    this.PS.subscribe('Interaction:end', this.stop)
  }

  private attachSelector = () => {
    if (this.HTMLNode && this.DS.SelectorArea?.HTMLNode)
      this.DS.SelectorArea.HTMLNode.removeChild(this.HTMLNode)
    this.HTMLNode =
      this.Settings.selector ||
      createSelectorElement(this.Settings.customStyles)
    this.HTMLNode.classList.add(this.Settings.selectorClass)
    if (this.HTMLNode && this.DS.SelectorArea?.HTMLNode)
      this.DS.SelectorArea.HTMLNode.appendChild(this.HTMLNode)
  }

  private start = ({ isDragging }: { isDragging?: boolean }) => {
    if (isDragging) return
    const {
      stores: { PointerStore },
      Area: { HTMLNode },
    } = this.DS
    if (HTMLNode.nodeName === '#document') return

    const pPos = PointerStore.initialValArea
    updateElementStylePos(this.HTMLNode, vect2rect(pPos, 1))
    this.HTMLNode.style.display = 'block'
    if (this.DS.SelectorArea.HTMLNodeSize) {
      this.ContainerSize = {
        top: this.DS.SelectorArea.HTMLNodeSize.top,
        left: this.DS.SelectorArea.HTMLNodeSize.left,
        width: this.DS.SelectorArea.HTMLNodeSize.width,
        height: this.DS.SelectorArea.HTMLNodeSize.height,
      }
    }
    this._rect = undefined
  }

  public stop = () => {
    this.HTMLNode.style.width = '0'
    this.HTMLNode.style.height = '0'
    this.HTMLNode.style.display = 'none'
  }

  /** Moves the selection to the correct place */
  private update = ({ isDragging }: { isDragging?: boolean }) => {
    if (isDragging || this.DS.continue) return
    const {
      stores: { ScrollStore, PointerStore },
    } = this.DS
    const { x, y } = this.DS.getCurrentCursorPosition()
    const { x: initX, y: initY } = this.DS.getInitialCursorPosition()
    const initPointerPos = {
      x: initX,
      y: initY,
    }
    const pointerPos = {
      x: x + window.scrollX,
      y: y + window.scrollY,
    }
    const pos = getSelectorPosition({
      scrollAmount: ScrollStore.scrollAmount,
      initialPointerPos: initPointerPos,
      pointerPos: pointerPos,
      containerSize: this.ContainerSize,
    })

    if (pos) updateElementStylePos(this.HTMLNode, pos)

    this._rect = undefined
  }

  public get rect() {
    if (this._rect) return this._rect
    return (this._rect = this.HTMLNode.getBoundingClientRect())
  }
}
