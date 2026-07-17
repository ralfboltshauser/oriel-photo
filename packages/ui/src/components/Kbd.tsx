import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd className={clsx('oriel-kbd', className)} {...props} />;
}
