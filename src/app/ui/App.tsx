import { Fragment, memo, useEffect, useMemo, useRef } from 'react';
import Clock from './Clock';
import { createClockElement, defineClockElement, tagName } from './ClockWebComponent';
import wrapAsWebComponent from './wrapAsWebComponent';

defineClockElement;

const ClockPortal = wrapAsWebComponent(Clock, 'portal-clock', ['prefix']);
const ClockPortalClosed = wrapAsWebComponent(Clock, 'portal-clock-closed', ['prefix'], { shadowMode: 'closed' });
const ClockPortalOpen = wrapAsWebComponent(Clock, 'portal-clock-open', ['prefix'], { shadowMode: 'open' });

export default memo(function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => ({ __html: `<${tagName}></${tagName}>` }), []);

  useEffect(() => {
    const { current } = containerRef;

    current?.append(createClockElement(current.ownerDocument));
  }, [containerRef]);

  return (
    <Fragment>
      <h1>Hello, World!</h1>
      <h2>React component</h2>
      <Clock />
      <h2>Via ref</h2>
      <div ref={containerRef} />
      <h2>Via dangerouslySetInnerHTML</h2>
      <div dangerouslySetInnerHTML={html} />
      <h2>Via Portal</h2>
      <ClockPortal />
      <portal-clock prefix="The time now is: " />
      <h2>Via Portal (Closed)</h2>
      <ClockPortalClosed />
      <portal-clock-closed prefix="The time now is: " />
      <h2>Via Portal (Open)</h2>
      <ClockPortalOpen />
      <portal-clock-open prefix="The time now is: " />
    </Fragment>
  );
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface IntrinsicElements {
      'portal-clock': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'portal-clock-closed': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'portal-clock-open': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
