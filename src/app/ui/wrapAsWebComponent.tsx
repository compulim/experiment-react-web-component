import { IterableWritableStream } from 'iter-fest';
import { createElement, Fragment, memo, useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';

type CustomElementsCompatibleProps = { [name: string]: string | undefined };
type InstanceMap<P extends CustomElementsCompatibleProps> = Map<string, ReactComponentElement<P>>;

function produceConsumeState<T>(initialState?: T | undefined): {
  iterator: AsyncIterable<T>;
  produce: (state: (state: T | undefined) => T) => void;
} {
  const writable = new IterableWritableStream<T>();
  const writer = writable.getWriter();

  let state: T | undefined = initialState;

  typeof state !== 'undefined' && writer.write(state);

  return {
    iterator: writable,
    produce: (next: (state: T | undefined) => T) => writer.write((state = next(state)))
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
  // TODO: Use signaling instead of produce-consumer.
  //       This could allow the Portal to be relocated.
  const { iterator, produce } = produceConsumeState<InstanceMap<P>>(new Map());

  customElements.define(
    tagName,
    class extends ReactComponentElement<P> {
      static get observedAttributes(): readonly string[] {
        return attributeNames;
      }

      override produce(state: (state: InstanceMap<P> | undefined) => InstanceMap<P>): void {
        produce(state);
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
        for await (const current of iterator) {
          if (unmounted || !current) {
            break;
          }

          setInstances(current);
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
