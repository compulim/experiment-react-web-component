import { createElement, Fragment, memo, useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';

type CustomElementsCompatibleProps = { [name: string]: string | undefined };
type InstanceMap<P extends CustomElementsCompatibleProps> = ReadonlyMap<
  string,
  Readonly<[HTMLElement | ShadowRoot, Readonly<PropsWithDispatchEvent<P>>]>
>;
type PropsWithDispatchEvent<P extends object> = P & { dispatchEvent: (event: Event) => void };

function signalingState<T>(initialState?: T | undefined) {
  let resolvers = Promise.withResolvers<void>();
  let state = initialState;

  return {
    getState(): T | undefined {
      return state;
    },

    async next(): Promise<void> {
      return resolvers.promise;
    },

    patchState(next: (state: T | undefined) => T) {
      state = next(state);

      const resolve = resolvers.resolve.bind(resolvers);

      resolvers = Promise.withResolvers();
      resolve();
    }
  };
}

export default function wrapAsWebComponent<N extends string, P extends Record<N, string | undefined>>(
  componentType: ComponentType<PropsWithDispatchEvent<P>>,
  tagName: string,
  attributeNames: readonly N[],
  init?: { shadowMode: 'closed' | 'open' | undefined } | undefined
): ComponentType {
  const { getState, next, patchState } = signalingState<InstanceMap<P>>(new Map());
  const shadowMode = init?.shadowMode;

  customElements.define(
    tagName,
    class ReactElement extends HTMLElement {
      static get observedAttributes(): readonly string[] {
        return attributeNames;
      }

      #dispatchEvent = this.dispatchEvent.bind(this);
      #key: string = crypto.randomUUID();
      #propsMap: Map<keyof P, string | undefined> = new Map();

      attributeChangedCallback(name: keyof P, _oldValue: string | undefined, newValue: string | undefined) {
        this.#propsMap.set(name, newValue);
      }

      connectedCallback() {
        const element =
          shadowMode === 'closed'
            ? this.attachShadow({ mode: 'closed' })
            : shadowMode === 'open'
              ? this.attachShadow({ mode: 'open' })
              : this;

        patchState(map => Object.freeze(new Map(map).set(this.#key, Object.freeze([element, this.getProps()]))));
      }

      disconnectedCallback() {
        patchState(map => {
          const nextMap = new Map(map);

          nextMap.delete(this.#key);

          return Object.freeze(nextMap);
        });
      }

      getProps() {
        return {
          ...Object.freeze(Object.fromEntries(this.#propsMap.entries()) as P),
          dispatchEvent: this.#dispatchEvent
        };
      }
    }
  );

  let portalMounted = false;

  const CustomElementsWrapperPortal = memo(() => {
    const [instances, setInstances] = useState<InstanceMap<P>>(new Map());

    useEffect(() => {
      if (portalMounted) {
        // TODO: Should this be warning?
        throw new Error('Portal already rendered.');
      }

      let unmounted = false;

      (async () => {
        while (!unmounted) {
          const state = getState();

          typeof state !== 'undefined' && setInstances(state);

          await next();
        }
      })();

      return () => {
        unmounted = true;
        portalMounted = false;
      };
    }, [setInstances]);

    return (
      <Fragment>
        {Array.from(
          instances
            .entries()
            .map(([key, [element, props]]) => createPortal(createElement(componentType, props), element, key))
        )}
      </Fragment>
    );
  });

  CustomElementsWrapperPortal.displayName = 'CustomElementsWrapperPortal';

  return CustomElementsWrapperPortal;
}

export { type CustomElementsCompatibleProps, type PropsWithDispatchEvent };
