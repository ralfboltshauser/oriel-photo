import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, className, label, type = 'button', ...props },
  ref,
) {
  return (
    <button
      aria-label={label}
      className={clsx('oriel-icon-button', className)}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});
