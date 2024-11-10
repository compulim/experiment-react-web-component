import { memo, useMemo } from 'react';
import useValue from '../data/useValue';

type ClockProps = {
  dispatchEvent: (event: Event) => void;
  'prefix-text'?: string | undefined;
};

const Clock = memo(({ dispatchEvent, 'prefix-text': prefixText }: ClockProps) => {
  const [value] = useValue();

  useMemo(() => dispatchEvent(new CustomEvent('clock', { bubbles: true, detail: value })), [dispatchEvent, value]);

  return (
    <div>
      {prefixText}
      {value}
    </div>
  );
});

Clock.displayName = 'Clock';

export default Clock;
