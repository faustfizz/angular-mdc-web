import {
  ElementRef,
  Injectable,
  OnDestroy,
  NgZone
} from '@angular/core';
import { merge, fromEvent, Subject, Subscription, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Platform, toBoolean } from '@angular-mdc/web/common';

import { MDCRippleFoundation, util } from '@material/ripple';

export const MATCHES = util.getMatchesProperty(HTMLElement.prototype);

// Activation events registered on the root element of each instance for activation
const ACTIVATION_EVENT_TYPES = ['touchstart', 'mousedown', 'keydown'];

// Deactivation events registered on documentElement when a pointer-related down event occurs
const POINTER_DEACTIVATION_EVENT_TYPES = ['touchend', 'mouseup', 'keyup'];

export class MdcRippleConfig {
  surface: HTMLElement;
  activator?: HTMLElement;
  unbounded?: boolean;
  disabled?: boolean;
}

@Injectable()
export class MdcRipple implements OnDestroy {
  /** Emits whenever the component is destroyed. */
  private _destroy = new Subject<void>();

  private _initialized: boolean;
  readonly initialized: boolean = this._initialized;

  private _rippleConfig: MdcRippleConfig;

  private _activationEventsSubscription: Subscription | null;
  private _pointerDeactivationEventsSubscription: Subscription | null;
  private _focusSubscription: Subscription | null;
  private _blurSubscription: Subscription | null;

  /** Combined stream of all of the activation events. */
  get activationEvents(): Observable<any> {
    return merge(...ACTIVATION_EVENT_TYPES.map(evt =>
      fromEvent(this._rippleConfig.activator ? this._rippleConfig.activator : this._rippleConfig.surface, evt)));
  }

  /** Combined stream of all of the de-activation events. */
  get pointerDeactivationEvents(): Observable<any> {
    return merge(...POINTER_DEACTIVATION_EVENT_TYPES.map(evt =>
      fromEvent(this._rippleConfig.activator ? this._rippleConfig.activator : this._rippleConfig.surface, evt)));
  }

  createAdapter(config: MdcRippleConfig) {
    return {
      browserSupportsCssVars: () => this._platform.isBrowser ? util.supportsCssVariables(window) : false,
      isUnbounded: () => config.unbounded,
      isSurfaceActive: () => config.activator ? config.activator[MATCHES](':active') : config.surface[MATCHES](':active'),
      isSurfaceDisabled: () => config.disabled,
      addClass: (className: string) => config.surface.classList.add(className),
      removeClass: (className: string) => config.surface.classList.remove(className),
      registerDocumentInteractionHandler: (evtType: string, handler: EventListener) => {
        if (!this._platform.isBrowser) { return; }

        document.documentElement.addEventListener(evtType, handler, util.applyPassive());
      },
      deregisterDocumentInteractionHandler: (evtType: string, handler: EventListener) => {
        if (!this._platform.isBrowser) { return; }

        document.documentElement.removeEventListener(evtType, handler, util.applyPassive());
      },
      registerResizeHandler: (handler: EventListener) => {
        if (!this._platform.isBrowser) { return; }

        window.addEventListener('resize', handler);
      },
      deregisterResizeHandler: (handler: EventListener) => {
        if (!this._platform.isBrowser) { return; }

        window.removeEventListener('resize', handler);
      },
      updateCssVariable: (varName: string, value: string) => config.surface.style.setProperty(varName, value),
      computeBoundingRect: () => config.surface.getBoundingClientRect(),
      getWindowPageOffset: () => ({
        x: this._platform.isBrowser ? window.pageXOffset : 0,
        y: this._platform.isBrowser ? window.pageYOffset : 0
      })
    };
  }

  protected _foundation: {
    init(): void,
    destroy(): void,
    activate(event?: Event): void,
    deactivate(event?: Event): void,
    setUnbounded(unbounded: boolean): void,
    handleFocus(): void,
    handleBlur(): void
  };

  constructor(
    private _ngZone: NgZone,
    private _platform: Platform,
    private _elementRef: ElementRef<HTMLElement>) { }

  init(config: MdcRippleConfig, adapter?: any) {
    this._rippleConfig = config;
    this._foundation = new MDCRippleFoundation(adapter ? adapter : this.createAdapter(config));
    this._loadListeners();

    this._foundation.init();
    this._initialized = true;
  }

  destroy(): void {
    this._destroy.next();
    this._destroy.complete();

    this._unloadListeners();
    if (this._foundation) {
      this._foundation.destroy();
    }
    this._initialized = false;
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  activateRipple(event?: Event): void {
    this._ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this._foundation.activate(event));
    });
  }

  deactivateRipple(event?: Event): void {
    this._ngZone.runOutsideAngular(() => this._foundation.deactivate(event));
  }

  setUnbounded(unbounded: boolean): void {
    const newValue = toBoolean(unbounded);
    this._foundation.setUnbounded(newValue);
  }

  handleFocus(): void {
    this._ngZone.runOutsideAngular(() => this._foundation.handleFocus());
  }

  handleBlur(): void {
    this._ngZone.runOutsideAngular(() => this._foundation.handleBlur());
  }

  private _loadListeners(): void {
    this._activationEventsSubscription = this.activationEvents.pipe(takeUntil(this._destroy))
      .subscribe(event => this.activateRipple(event));

    this._pointerDeactivationEventsSubscription = this.pointerDeactivationEvents.pipe(takeUntil(this._destroy))
      .subscribe(event => this.deactivateRipple(event));

    this._focusSubscription = this._ngZone.runOutsideAngular(() =>
      fromEvent<FocusEvent>(this._rippleConfig.activator ?
        this._rippleConfig.activator : this._rippleConfig.surface, 'focus').pipe(takeUntil(this._destroy))
        .subscribe(() => this._ngZone.run(() => this.handleFocus())));

    this._blurSubscription = this._ngZone.runOutsideAngular(() =>
      fromEvent<Event>(this._rippleConfig.activator ?
        this._rippleConfig.activator : this._rippleConfig.surface, 'blur').pipe(takeUntil(this._destroy))
        .subscribe(() => this._ngZone.run(() => this.handleBlur())));
  }

  private _unloadListeners(): void {
    if (this._activationEventsSubscription) {
      this._activationEventsSubscription.unsubscribe();
      this._activationEventsSubscription = null;
    }
    if (this._pointerDeactivationEventsSubscription) {
      this._pointerDeactivationEventsSubscription.unsubscribe();
      this._pointerDeactivationEventsSubscription = null;
    }
    if (this._focusSubscription) {
      this._focusSubscription.unsubscribe();
      this._focusSubscription = null;
    }
    if (this._blurSubscription) {
      this._blurSubscription.unsubscribe();
      this._blurSubscription = null;
    }
  }
}
