'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  code: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-3 w-4',
  md: 'h-3.5 w-5',
  lg: 'h-5 w-7',
};

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🏳️';
  }
}

export function CountryFlag({ code, name, size = 'md', className }: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);

  if (!code) {
    return <span className={cn('text-xs inline-block', className)}>🏳️</span>;
  }

  // Normalize code for flagcdn (e.g. "ENG" -> "gb-eng", "ARG" -> "ar")
  let cleanCode = code.toLowerCase().trim();
  if (cleanCode === 'eng') cleanCode = 'gb-eng';
  else if (cleanCode === 'wal') cleanCode = 'gb-wls';
  else if (cleanCode === 'sco') cleanCode = 'gb-sct';
  else if (cleanCode.length > 2) cleanCode = cleanCode.slice(0, 2);

  const flagUrl = `https://flagcdn.com/w20/${cleanCode}.png`;

  if (hasError) {
    return (
      <span className={cn('inline-flex items-center justify-center text-xs leading-none shrink-0', className)} title={name || code}>
        {getFlagEmoji(cleanCode.slice(0, 2))}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center shrink-0', className)} title={name || code.toUpperCase()}>
      <img
        src={flagUrl}
        alt=""
        className={cn('rounded-[2px] border border-white/10 object-cover inline-block shadow-sm shrink-0', SIZE_CLASSES[size])}
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </span>
  );
}