import { render, unmountComponentAtNode } from 'react-dom';

import Clock from './Clock';

const tagName = 'react-clock';

class ClockElement extends HTMLElement {
  connectedCallback() {
    render(<Clock />, this);
  }

  disconnectedCallback() {
    unmountComponentAtNode(this);
  }
}

function createClockElement(ownerDocument: Document) {
  defineClockElement();

  const element = ownerDocument.createElement(tagName);

  return element;
}

let defined = false;

function defineClockElement() {
  if (defined) {
    return;
  }

  customElements.define(tagName, ClockElement);
  defined = true;
}

export { createClockElement, defineClockElement, tagName };
