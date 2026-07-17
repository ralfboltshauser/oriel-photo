import type { SVGProps } from 'react';

export interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function BrandMark({ size = 28, ...props }: BrandMarkProps) {
  return (
    <svg
      aria-label="Oriel"
      className="oriel-brand-mark"
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 32 32"
      width={size}
      {...props}
    >
      <rect fill="#1B1F1C" height="28" rx="8" width="28" x="2" y="2" />
      <path
        d="M9.25 9.5h10.6a3 3 0 0 1 3 3v10.25H12.25a3 3 0 0 1-3-3V9.5Z"
        stroke="#F2F1EC"
        strokeWidth="1.5"
      />
      <path d="M22.85 12.2v10.55H12.4" stroke="#FF7061" strokeLinecap="round" strokeWidth="2" />
      <path d="m9.5 9.75 4.25 4.25" stroke="#737A74" strokeLinecap="round" strokeWidth="1.25" />
    </svg>
  );
}
