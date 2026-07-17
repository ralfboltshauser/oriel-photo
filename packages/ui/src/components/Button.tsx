import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, icon, type = 'button', variant = 'secondary', ...props },
  ref,
) {
  return (
    <button
      className={clsx('oriel-button', className)}
      data-variant={variant}
      ref={ref}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
