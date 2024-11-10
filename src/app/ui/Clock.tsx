import { memo } from 'react';
import useValue from '../data/useValue';

type ClockProps = { prefix?: string | undefined };

const Clock = memo(({ prefix }: ClockProps) => {
  const [value] = useValue();

  return (
    <div>
      {prefix}
      {value}
    </div>
  );
});

Clock.displayName = 'Clock';

export default Clock;
