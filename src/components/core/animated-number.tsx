'use client';
import { cn } from '@/lib/utils';
import { motion, SpringOptions, useSpring, useTransform } from 'framer-motion';
import { useEffect, JSX } from 'react';

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
  as?: React.ElementType;
  startValue?: number;
  format?: (value: number) => string;
};

export function AnimatedNumber({
  value,
  className,
  springOptions,
  as = 'span',
  startValue = 0,
  format,
}: AnimatedNumberProps) {
  const MotionComponent = motion.create(
    as as keyof JSX.IntrinsicElements
  );

  const spring = useSpring(startValue, springOptions);
  const display = useTransform(spring, (current) =>
    format ? format(current) : Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <MotionComponent className={cn('tabular-nums', className)}>
      {display}
    </MotionComponent>
  );
}
