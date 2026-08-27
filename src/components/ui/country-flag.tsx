'use client';

import { cn } from '@/lib/utils';

interface CountryFlagProps {
  code: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-3 w-4',
  md: 'h-4 w-6',
  lg: 'h-6 w-9',
};

export function CountryFlag({ code, name, size = 'md', className }: CountryFlagProps) {
  if (!code) {
    return (
      <span
        className={cn('inline-flex items-center justify-center rounded bg-muted', SIZE_CLASSES[size])}
        aria-label={name || 'Unknown'}
      >
        <span className="text-xs font-medium text-muted-foreground">?</span>
      </span>
    );
  }

  const lowerCode = code.toLowerCase();
  const flagUrl = `https://flagcdn.com/w20/${lowerCode}.png`;

  return (
    <span className={cn('inline-flex items-center', className)} aria-label={name || code.toUpperCase()}>
      <img
        src={flagUrl}
        alt=""
        className={cn('rounded-sm border border-border-subtle', SIZE_CLASSES[size])}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <span className={cn('hidden inline-flex items-center justify-center rounded bg-muted font-medium text-muted-foreground', SIZE_CLASSES[size])}>
        {code.toUpperCase()}
      </span>
    </span>
  );
}