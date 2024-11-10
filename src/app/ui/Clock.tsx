import { memo } from 'react';
import useValue from '../data/useValue';

type ClockProps = { 'prefix-text'?: string | undefined };

const Clock = memo(({ 'prefix-text': prefixText }: ClockProps) => {
  const [value] = useValue();

  return (
    <div>
      {prefixText}
      {value}
    </div>
  );
});

Clock.displayName = 'Clock';

export default Clock;
