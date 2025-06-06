import DragSelect from '../DragSelect'
import PubSub from './PubSub'
import { DSEdges, DSInputElement } from '../types'
import { DSSettings } from '../stores/SettingsStore'
import { handleSelection } from '../methods/handleSelection'
import SelectedSet from './SelectedSet'
import KeyStore from '../stores/KeyStore'
import { getShiftSelectedElements } from '../methods/getShiftSelectedElemets'

export type DSInteractionPublishEventNames =
  | 'Interaction:init:pre'
  | 'Interaction:init'
  | 'Interaction:start:pre'
  | 'Interaction:start'
  | 'Interaction:update:pre'
  | 'Interaction:update'
  | 'Interaction:end:pre'
  | 'Interaction:end'
  | 'Interaction:scroll:pre'
  | 'Interaction:scroll'

export type DSInteractionPublishEventData = {
  event: InteractionEvent | KeyboardEvent
  /** Whether the interaction is a drag or a select */
  isDragging: boolean
  /** Whether or not the drag interaction is via keyboard */
  isDraggingKeyboard?: boolean
  key?: string
  scroll_directions?: DSEdges
  scroll_multiplier?: number
}

export type DSInteractionPublishScrollData = {
  event: InteractionEvent
  isDragging: boolean
  scroll_directions?: DSEdges
  scroll_multiplier?: number
}

export type DSInteractionPublish = {
  'Interaction:init:pre': {}
  'Interaction:init': {}
  'Interaction:start:pre': DSInteractionPublishEventData
  'Interaction:start': DSInteractionPublishEventData
  'Interaction:update:pre': Partial<DSInteractionPublishEventData>
  'Interaction:update': Partial<DSInteractionPublishEventData>
  'Interaction:end:pre': DSInteractionPublishEventData
  'Interaction:end': DSInteractionPublishEventData
  'Interaction:scroll:pre': DSInteractionPublishScrollData
  'Interaction:scroll': DSInteractionPublishScrollData
}

export type InteractionEvent = MouseEvent | PointerEvent | TouchEvent

export default class Interaction<E extends DSInputElement> {
  private isInteracting?: boolean
  public isDragging: boolean = false
  private DS: DragSelect<E>
  private PS: PubSub<E>
  private Settings: DSSettings<E>
  private KeyStore: KeyStore<E>
  private startX = 0
  private startY = 0
  private dragThreshold = 5

  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    this.DS = DS
    this.PS = PS
    this.Settings = this.DS.stores.SettingsStore.s
    this.KeyStore = this.DS.stores.KeyStore
    // not on every modification, just on change of area
    this.PS.subscribe('Settings:updated:area', ({ settings }) => {
      this.removeAreaEventListeners(settings['area:pre'])
      this.setAreaEventListeners(settings['area'])
      this.removeBodyScrollListener()
      this.setBodyScrollListener()
    })
    this.PS.subscribe('PointerStore:updated', ({ event }) =>
      this.update({ event })
    )
    this.PS.subscribe('Selectable:click:pre', (data) => {
      const { event, element, selectableEl } = data as {
        event: MouseEvent
        element: DSInputElement
        selectableEl: boolean
      }
      this.onClick({ event: event, el: element, selectableEl: selectableEl })
    })
    this.PS.subscribe('Selectable:pointer', ({ event }) => this.start(event))
    this.PS.subscribe('Interaction:start:pre', ({ event }) =>
      this._start(event)
    )

    this.PS.subscribe('Interaction:init:pre', this._init)
    this.PS.subscribe('Interaction:end:pre', ({ event }) => this._reset(event))
    this.PS.subscribe('Area:scroll', this.update)
  }

  public init = () => this.PS.publish('Interaction:init:pre', { init: true })

  private _init = () => {
    this.stop()
    this.isInteracting = false
    this.DS.Selector.HTMLNode.style.display = 'none'
    this.setAreaEventListeners()
    this.setBodyScrollListener()
    this.PS.publish('Interaction:init', { init: true })
  }

  private _canInteract(
    event: KeyboardEvent | InteractionEvent,
    forced?: boolean
  ) {
    const isKeyboardClick =
      'clientX' in event &&
      event.clientX === 0 &&
      event.clientY === 0 &&
      event.detail === 0 &&
      event.target
    if (forced) return true
    if (
      ('button' in event && event.button === 2) || // right-clicks
      this.isInteracting || // fix double-click issues
      (event.target && !this.DS.SelectorArea.isInside(event.target as E)) || // fix outside elements issue
      (!isKeyboardClick && !this.DS.SelectorArea.isClicked(event)) // make sure the mouse click is inside the area
    )
      return false

    return true
  }

  private start = (event: Event) =>
    this.PS.publish('Interaction:start:pre', {
      event: event as InteractionEvent, // Event to satisfy event listeners but we know it’s an InteractionEvent
      isDragging: this.isDragging,
    })

  private _start = (event: KeyboardEvent | InteractionEvent) => {
    if ((event.target as DSInputElement).closest('.ds-theader')) return
    if (event.type === 'touchstart') event.preventDefault() // Call preventDefault() to prevent double click issue, see https://github.com/ThibaultJanBeyer/DragSelect/pull/29 & https://developer.mozilla.org/vi/docs/Web/API/Touch_events/Supporting_both_TouchEvent_and_MouseEvent
    if (!this._canInteract(event)) return
    this.isInteracting = true
    this.isDragging = this.isDragEvent(event)

    if ('clientX' in event && 'clientY' in event) {
      this.startX = event.clientX
      this.startY = event.clientY
    }

    this.PS.publish('Interaction:start', {
      event,
      isDragging: this.isDragging,
    })

    this.setDocEventListeners()
  }

  private startScroll = (event: Event) => {
    this.PS.publish('Interaction:scroll:pre', {
      event: event as InteractionEvent,
      isDragging: this.isDragging,
    })
  }

  private isDragEvent = (event: InteractionEvent | KeyboardEvent) => {
    let clickedElement: E | null = null
    let selectionElement: E | null
    if (event.target && 'closest' in event.target) {
      const target = event.target as E

      clickedElement = target.closest(`.${this.Settings.selectableClass}`)
      selectionElement =
        target.parentElement?.closest(`.selection`) ??
        target.closest(`.selection`) ??
        null

      if (!clickedElement && selectionElement) {
        const nestedSelectable = selectionElement.querySelector(
          `.${this.Settings.selectableClass}`
        ) as E | null

        if (nestedSelectable) {
          clickedElement = nestedSelectable
        } else {
          clickedElement = null
        }
      }
    }

    if (
      !this.Settings.draggability ||
      this.DS.stores.KeyStore.isShiftPressed(event) ||
      this.DS.stores.KeyStore.isCtrlOrMetaPressed(event) ||
      !clickedElement
    )
      return false

    if (this.Settings.immediateDrag) {
      if (!this.DS.SelectedSet.size) this.DS.SelectedSet.add(clickedElement)
      else if (!this.DS.SelectedSet.has(clickedElement)) {
        this.DS.SelectedSet.clear()
        this.DS.SelectedSet.add(clickedElement)
      }
    }

    if (this.DS.SelectedSet.has(clickedElement)) return true

    return false
  }

  /**
   * Triggers when a node is actively selected: <button> nodes that are pressed via the keyboard.
   * Making DragSelect accessible for everyone!
   */
  private onClick = ({
    event,
    el,
    selectableEl,
  }: {
    event: MouseEvent
    el: DSInputElement
    selectableEl: boolean
  }) => {
    if (!this._canInteract(event, !selectableEl)) return
    const isCtrl = this.KeyStore.isCtrlOrMetaPressed(event)
    const isShift = this.KeyStore.isShiftPressed(event)

    if (!isCtrl && !isShift) return
    const { SelectedSet, SelectableSet } = this.DS

    if (selectableEl) {
      event.stopPropagation()
      if (isShift) {
        const arrSelectableEl = SelectableSet.elements.filter(
          (el) => el.isConnected
        )
        SelectedSet.addAll(
          getShiftSelectedElements(
            el,
            SelectedSet.elements,
            arrSelectableEl
          ) as E[]
        )
      }

      return
    }
    if ((event.target as HTMLElement).closest('a')) {
      return
    }

    if (isCtrl) {
      const selectedSet = SelectedSet as unknown as SelectedSet<DSInputElement>

      handleSelection({
        element: el,
        force: true,
        multiSelectionToggle: true,
        SelectedSet: selectedSet,
        hoverClassName: this.Settings.hoverClass,
      })
    }
  }

  stop = (area = this.DS.Area.HTMLNode) => {
    this.removeAreaEventListeners(area)
    this.removeBodyScrollListener()
    this.removeDocEventListeners()
  }

  update = ({
    event,
    scroll_directions,
    scroll_multiplier,
  }: {
    event?: InteractionEvent
    scroll_directions?: DSEdges
    scroll_multiplier?: number
  }) => {
    if (!this.isInteracting || !event || !('clientX' in event)) return

    const deltaX = Math.abs(event.clientX - this.startX)
    const deltaY = Math.abs(event.clientY - this.startY)

    if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
      this.PS.publish(['Interaction:update:pre', 'Interaction:update'], {
        event,
        scroll_directions,
        scroll_multiplier,
        isDragging: this.isDragging,
      })
    }
  }

  reset = (event: InteractionEvent) =>
    this.PS.publish('Interaction:end:pre', {
      event,
      isDragging: this.isDragging,
    })

  _reset = (event: InteractionEvent | KeyboardEvent) => {
    const { isDragging } = this
    this.isInteracting = false
    this.isDragging = false
    this.removeDocEventListeners()
    this.PS.publish('Interaction:end', { event, isDragging })
  }

  //////////////////////////////////////////////////////////////////////////////////////
  // Event Listeners

  private setAreaEventListeners = (area = this.DS.Area.HTMLNode) => {
    // @TODO: fix pointer events mixing issue see [PR](https://github.com/ThibaultJanBeyer/DragSelect/pull/128#issuecomment-1154885289)
    const areaParent = area.parentElement
    if (!areaParent) return
    // if (this.Settings.usePointerEvents)
    //   areaParent.addEventListener('pointerdown', this.start, {
    //     passive: false,
    //   })
    else areaParent.addEventListener('mousedown', this.start)
    areaParent.addEventListener('touchstart', this.start, {
      passive: false,
    })
  }
  private removeAreaEventListeners = (area = this.DS.Area.HTMLNode) => {
    const areaParent = area.parentElement
    if (!areaParent) return
    // @TODO: fix pointer events mixing issue see [PR](https://github.com/ThibaultJanBeyer/DragSelect/pull/128#issuecomment-1154885289)
    if (this.Settings.usePointerEvents) {
      areaParent.removeEventListener('pointerdown', this.start, {
        // @ts-ignore
        passive: false,
      })
    } else areaParent.removeEventListener('mousedown', this.start)
    areaParent.removeEventListener('touchstart', this.start, {
      // @ts-ignore
      passive: false,
    })
  }

  private setDocEventListeners = () => {
    // @TODO: fix pointer events mixing issue see [PR](https://github.com/ThibaultJanBeyer/DragSelect/pull/128#issuecomment-1154885289)
    if (this.Settings.usePointerEvents) {
      // document.addEventListener('pointerup', this.reset)
      // document.addEventListener('pointercancel', this.reset)
    } else document.addEventListener('mouseup', this.reset)
    document.addEventListener('touchend', this.reset)
  }
  private removeDocEventListeners = () => {
    // @TODO: fix pointer events mixing issue see [PR](https://github.com/ThibaultJanBeyer/DragSelect/pull/128#issuecomment-1154885289)
    if (this.Settings.usePointerEvents) {
      // document.removeEventListener('pointerup', this.reset)
      // document.removeEventListener('pointercancel', this.reset)
    } else document.removeEventListener('mouseup', this.reset)
    document.removeEventListener('touchend', this.reset)
  }

  private setBodyScrollListener = () => {
    document.body?.addEventListener('scroll', this.startScroll)
  }

  private removeBodyScrollListener = () => {
    document.body?.removeEventListener('scroll', this.startScroll)
  }
}
