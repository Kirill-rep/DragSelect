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
  private isSelecting = false
  private autoScroll = false
  public scrollSelector = false
  public HTMLNode: HTMLElement

  private scrollIntervalId: number | null = null
  private readonly scrollSpeed = 20
  private readonly scrollInterval = 50
  private readonly edgeThreshold = -15

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
    this.PS.subscribe('Interaction:scroll:pre', ({ isDragging }) => {
      setTimeout(() => this.updateWithScroll({ isDragging }), 0)
    })
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
    this.scrollSelector = false
    this.stopAutoScroll()
    if (this.isSelecting) {
      this.isSelecting = false
      setTimeout(() => {
        document.removeEventListener('click', this.captureClick, true)
      }, 0)
    }
  }

  /** Moves the selection to the correct place */
  private update = ({ isDragging }: { isDragging?: boolean }) => {
    if (isDragging || this.DS.continue) return
    const {
      stores: { ScrollStore, PointerStore },
    } = this.DS
    const { x, y } = this.DS.getCurrentCursorPosition()
    const { x: initX, y: initY } = this.DS.getInitialCursorPosition()

    if (Math.abs(x - initX) <= 5 && Math.abs(y - initY) <= 5) {
      return
    }
    this.scrollSelector = true
    this.DS.SelectorArea.updatePos()
    this.scroll()

    if (!this.isSelecting) {
      this.isSelecting = true
      document.addEventListener('click', this.captureClick, true)
    }

    if (this.HTMLNode.style.display !== 'block') {
      this.HTMLNode.style.display = 'block'
    }

    const initPointerPos = {
      x: initX,
      y: initY,
    }
    const pointerPos = {
      x: x + window.scrollX,
      y: y + window.scrollY,
    }

    const pos = getSelectorPosition({
      scrollAmount: ScrollStore.scrollAmountWin,
      initialPointerPos: initPointerPos,
      pointerPos: pointerPos,
      containerSize: this.ContainerSize,
    })

    if (pos) updateElementStylePos(this.HTMLNode, pos)

    this._rect = undefined

    this.checkForAutoScroll({ x, y })
  }

  private updateWithScroll = ({ isDragging }: { isDragging?: boolean }) => {
    if (isDragging || this.DS.continue) return
    const {
      stores: { ScrollStore },
    } = this.DS
    const { x, y } = this.DS.getCurrentCursorPosition()
    const { x: initX, y: initY } = this.DS.getInitialCursorPosition()

    if (!this.scrollSelector) {
      return
    }
    this.DS.SelectorArea.updatePos()
    this.scroll()

    if (!this.isSelecting) {
      this.isSelecting = true
      document.addEventListener('click', this.captureClick, true)
    }

    if (this.HTMLNode.style.display !== 'block') {
      this.HTMLNode.style.display = 'block'
    }

    const initPointerPos = {
      x: initX,
      y: initY,
    }
    const pointerPos = {
      x: x + window.scrollX,
      y: y + window.scrollY,
    }

    const pos = getSelectorPosition({
      scrollAmount: ScrollStore.scrollAmountWin,
      initialPointerPos: initPointerPos,
      pointerPos: pointerPos,
      containerSize: this.ContainerSize,
    })

    if (pos) updateElementStylePos(this.HTMLNode, pos)

    this._rect = undefined
  }

  private captureClick(event: MouseEvent) {
    event.stopPropagation()
  }

  // private handleEventDown = () => {
  //   this.start({ isDragging: this.DS.Interaction.isDragging })
  // }

  // private setAreaSelectorEventListeners = (area = this.DS.Area.HTMLNode) => {
  //   if (this.Settings.usePointerEvents)
  //     area.addEventListener('pointerdown', this.handleEventDown, {
  //       passive: false,
  //     })
  //   else area.addEventListener('mousedown', this.handleEventDown)
  //   area.addEventListener('touchstart', this.handleEventDown, {
  //     passive: false,
  //   })
  // }

  // removeAreaSelectorEventListeners = (area = this.DS.Area.HTMLNode) => {
  //   if (this.Settings.usePointerEvents) {
  //     area.removeEventListener('pointerdown', this.handleEventDown, {
  //       // @ts-ignore
  //       passive: false,
  //     })
  //   } else area.removeEventListener('mousedown', this.handleEventDown)
  //   area.removeEventListener('touchstart', this.handleEventDown, {
  //     // @ts-ignore
  //     passive: false,
  //   })
  // }

  // private setDocEventListeners = (area = this.DS.Area.HTMLNode) => {
  //   if (this.Settings.usePointerEvents) {
  //     area.addEventListener('pointerup', this.stop)
  //     area.addEventListener('pointercancel', this.stop)
  //   } else area.addEventListener('mouseup', this.stop)
  //   area.addEventListener('touchend', this.stop)
  // }
  // private removeDocEventListeners = (area = this.DS.Area.HTMLNode) => {
  //   if (this.Settings.usePointerEvents) {
  //     area.removeEventListener('pointerup', this.stop)
  //     area.removeEventListener('pointercancel', this.stop)
  //   } else area.removeEventListener('mouseup', this.stop)
  //   area.removeEventListener('touchend', this.stop)
  // }

  private scroll() {
    if (this.DS?.SelectorArea.HTMLNodeSize) {
      this.ContainerSize = {
        top: this.DS.SelectorArea.HTMLNodeSize.top,
        left: this.DS.SelectorArea.HTMLNodeSize.left,
        width: this.DS.SelectorArea.HTMLNodeSize.width,
        height: this.DS.SelectorArea.HTMLNodeSize.height,
      }
    }
  }

  public get rect() {
    if (this._rect) return this._rect
    return (this._rect = this.HTMLNode.getBoundingClientRect())
  }

  private startAutoScroll = (direction: 'up' | 'down') => {
    if (this.autoScroll) return
    this.autoScroll = true
    // this.stopAutoScroll()

    const scroll = () => {
      if (direction === 'up') {
        document.body.scrollBy(0, -this.scrollSpeed)
      } else {
        document.body.scrollBy(0, this.scrollSpeed)
      }
    }

    this.scrollIntervalId = setInterval(
      scroll,
      this.scrollInterval
    ) as unknown as number
  }

  private stopAutoScroll = () => {
    if (this.scrollIntervalId !== null) {
      clearInterval(this.scrollIntervalId)
      this.scrollIntervalId = null
    }
  }

  private checkForAutoScroll = (pointerPos: { x: number; y: number }) => {
    const { innerHeight } = window

    if (pointerPos.y < this.edgeThreshold) {
      this.startAutoScroll('up')
    } else if (pointerPos.y > innerHeight - this.edgeThreshold) {
      this.startAutoScroll('down')
    } else {
      this.stopAutoScroll()
      this.autoScroll = false
    }
  }
}
