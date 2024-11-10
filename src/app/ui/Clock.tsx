import { memo, useMemo } from 'react';
import useValue from '../data/useValue';

type ClockProps = {
  onDispatch: (event: Event) => void;
  'prefix-text'?: string | undefined;
};

const Clock = memo(({ onDispatch, 'prefix-text': prefixText }: ClockProps) => {
  const [value] = useValue();

  useMemo(() => onDispatch(new CustomEvent('clock', { bubbles: true, detail: value })), [onDispatch, value]);

  return (
    <div>
      {prefixText}
      {value}
    </div>
  );
});

Clock.displayName = 'Clock';

export default Clock;
