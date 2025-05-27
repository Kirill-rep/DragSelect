import DragSelect from '../DragSelect'
import PubSub from '../modules/PubSub'
import { DSInputElement, Settings } from '../types'

export type DSKeyStorePublishEventNames =
  | 'KeyStore:down:pre'
  | 'KeyStore:down'
  | 'KeyStore:up:pre'
  | 'KeyStore:up'

export type DSKeyStorePublishEventData = {
  event: KeyboardEvent
  /** Pressed key (lowercase) */
  key: string
}

export type DSKeyStorePublish = {
  [K in DSKeyStorePublishEventNames]: DSKeyStorePublishEventData
}

type ModifierKey = 'ctrl' | 'meta' | 'shift'

type KeyToModifierMap = {
  ctrl: 'ctrlKey'
  meta: 'metaKey'
  shift: 'shiftKey'
}

export default class KeyStore<E extends DSInputElement> {
  private _currentValues = new Set<string>()
  private _keyMapping: KeyToModifierMap = {
    ctrl: 'ctrlKey',
    shift: 'shiftKey',
    meta: 'metaKey',
  }
  private _keyTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private DS: DragSelect<E>
  private PS: PubSub<E>
  private settings: Required<Settings<E>>

  /**
   * @class KeyStore
   * @constructor KeyStore
   * @ignore
   */
  constructor({ DS, PS }: { DS: DragSelect<E>; PS: PubSub<E> }) {
    this.DS = DS
    this.PS = PS
    this.settings = this.DS.stores.SettingsStore.s
    this.PS.subscribe('Interaction:init', this.init)
  }

  private init = () => {
    document.addEventListener('keydown', this.keydown)
    document.addEventListener('keyup', this.keyup)
    window.addEventListener('blur', this.reset)
  }

  private keydown = (event: KeyboardEvent) => {
    if (!event.key?.toLocaleLowerCase) return
    const key = event.key.toLowerCase()

    this.PS.publish('KeyStore:down:pre', { event, key })
    this._currentValues.add(key)
    this.PS.publish('KeyStore:down', { event, key })

    const isSystemKey = ['meta', 'control', 'alt', 'os'].includes(key)
    if (isSystemKey) {
      const oldTimeout = this._keyTimeouts.get(key)
      if (oldTimeout) clearTimeout(oldTimeout)

      this._keyTimeouts.set(
        key,
        setTimeout(() => {
          this._currentValues.delete(key)
          this._keyTimeouts.delete(key)
        }, 500)
      )
    }
  }

  private keyup = (event: KeyboardEvent) => {
    if (!event.key?.toLocaleLowerCase) return

    const key = event.key.toLowerCase()
    this.PS.publish('KeyStore:up:pre', { event, key })
    this._currentValues.delete(key)
    this.PS.publish('KeyStore:up', { event, key })

    const timeout = this._keyTimeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this._keyTimeouts.delete(key)
    }
  }

  public stop = () => {
    document.removeEventListener('keydown', this.keydown)
    document.removeEventListener('keyup', this.reset)
    window.removeEventListener('blur', this.reset)
    this.reset()
  }

  private reset = () => this._currentValues.clear()

  private isMultiSelectKeyPressed(
    key: ModifierKey,
    event?: KeyboardEvent | MouseEvent | PointerEvent | TouchEvent
  ) {
    if (this.settings.multiSelectMode) return true

    const modifierKey = this._keyMapping[key]
    const keyNameForGetModifierState =
      key.charAt(0).toUpperCase() + key.slice(1)

    const modifierFromEvent =
      (event &&
      'getModifierState' in event &&
      typeof event.getModifierState === 'function'
        ? event.getModifierState(keyNameForGetModifierState)
        : false) ||
      (modifierKey && event?.[modifierKey]) ||
      this._currentValues.has(key)

    return modifierFromEvent
  }

  public isCtrlOrMetaPressed(
    event?: KeyboardEvent | MouseEvent | PointerEvent | TouchEvent
  ): boolean {
    return (
      this.isMultiSelectKeyPressed('ctrl', event) ||
      this.isMultiSelectKeyPressed('meta', event)
    )
  }

  public isShiftPressed(
    event?: KeyboardEvent | MouseEvent | PointerEvent | TouchEvent
  ): boolean {
    return this.isMultiSelectKeyPressed('shift', event)
  }

  public get currentValues() {
    return Array.from(this._currentValues.values())
  }
}
