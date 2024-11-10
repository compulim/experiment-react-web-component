import { createElement, Fragment, memo, useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';

type CustomElementsCompatibleProps = { [name: string]: string | undefined };
type InstanceMap<P extends CustomElementsCompatibleProps> = Map<string, ReactComponentElement<P>>;

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

abstract class ReactComponentElement<P extends CustomElementsCompatibleProps> extends HTMLElement {
  #key: string = crypto.randomUUID();
  #propsMap: Map<keyof P, string | undefined> = new Map();

  abstract produce(state: (state: InstanceMap<P> | undefined) => InstanceMap<P>): void;

  attributeChangedCallback(name: keyof P, _oldValue: string | undefined, newValue: string | undefined) {
    this.#propsMap.set(name, newValue);
  }

  connectedCallback() {
    this.produce(map => new Map(map).set(this.#key, this));
  }

  disconnectedCallback() {
    this.produce(map => {
      const nextMap = new Map(map);

      nextMap.delete(this.#key);

      return nextMap;
    });
  }

  getProps(): Readonly<P> {
    return Object.freeze(Object.fromEntries(this.#propsMap.entries()) as P);
  }
}

export default function wrapAsWebComponent<N extends string, P extends Record<N, string | undefined>>(
  componentType: ComponentType<P>,
  tagName: string,
  attributeNames: readonly N[]
): ComponentType {
  const { getState, next, patchState } = signalingState<InstanceMap<P>>(new Map());

  customElements.define(
    tagName,
    class extends ReactComponentElement<P> {
      static get observedAttributes(): readonly string[] {
        return attributeNames;
      }

      override produce(state: (state: InstanceMap<P> | undefined) => InstanceMap<P>): void {
        patchState(state);
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
            .map(([key, element]) => createPortal(createElement(componentType, element.getProps()), element, key))
        )}
      </Fragment>
    );
  });

  CustomElementsWrapperPortal.displayName = 'CustomElementsWrapperPortal';

  return CustomElementsWrapperPortal;
}
