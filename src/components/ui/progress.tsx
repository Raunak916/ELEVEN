'use client';

import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PositionGaugeProps {
  /** The position label (e.g., "Goalkeepers", "Defenders") */
  label: string;
  /** The actual count of players in this position */
  value: number;
  /** The progress percentage (0-100) */
  progress: number;
  /** The accent color for this position (OKLCH format) */
  color: string;
  /** Optional className to merge with default styles */
  className?: string;
  /** Diameter of the gauge in pixels */
  size?: number;
}

export const PositionGauge: React.FC<PositionGaugeProps> = ({
  label,
  value,
  progress,
  color,
  className,
  size = 150,
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const progressValue = useMotionValue(0);

  React.useEffect(() => {
    const valueAnimation = animate(count, value, {
      duration: 1.5,
      ease: [0.43, 0.13, 0.23, 0.96],
    });

    const progressAnimation = animate(progressValue, progress, {
      duration: 1.5,
      ease: [0.43, 0.13, 0.23, 0.96],
    });

    return () => {
      valueAnimation.stop();
      progressAnimation.stop();
    };
  }, [value, progress, count, progressValue]);

  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = useTransform(
    progressValue,
    (v) => circumference - (v / 100) * circumference
  );

  const gaugeStyle = {
    width: size,
    height: size,
    '--gauge-color': color,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3',
        className
      )}
    >
      {/* Circular Progress Gauge */}
      <div
        className="relative flex items-center justify-center"
        style={gaugeStyle}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Background track - subtle dashed */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth="10"
            fill="transparent"
            stroke="currentColor"
            className="opacity-10"
            strokeDasharray="8 12"
            strokeLinecap="round"
            style={{ color: color }}
          />

          {/* Foreground progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth="10"
            fill="transparent"
            stroke="currentColor"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              color: color,
              strokeDashoffset,
            }}
          />
        </svg>

        {/* Central Text Content */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span
            className="font-heading font-bold tracking-tight tabular-nums"
            style={{ fontSize: size * 0.28 }}
          >
            {rounded}
          </motion.span>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            PLAYERS
          </p>
        </div>
      </div>

      {/* Position Label */}
      <p className="text-sm font-medium text-foreground text-center">
        {label}
      </p>
    </div>
  );
};

interface PositionCompositionPanelProps {
  /** Total players in the pool */
  totalPlayers: number;
  /** Goalkeeper count */
  goalkeepers: number;
  /** Defender count */
  defenders: number;
  /** Midfielder count */
  midfielders: number;
  /** Forward/Attacker count */
  forwards: number;
  /** Goalkeeper color */
  goalkeeperColor?: string;
  /** Defender color */
  defenderColor?: string;
  /** Midfielder color */
  midfielderColor?: string;
  /** Forward color */
  forwardColor?: string;
}

export const PositionCompositionPanel: React.FC<PositionCompositionPanelProps> = ({
  totalPlayers,
  goalkeepers,
  defenders,
  midfielders,
  forwards,
  goalkeeperColor = 'oklch(0.65 0.2 260)', // Blue
  defenderColor = 'oklch(0.75 0.15 85)',   // Gold/Yellow
  midfielderColor = 'oklch(0.55 0.18 155)', // Green
  forwardColor = 'oklch(0.6 0.22 25)',      // Red
}) => {
  const calculateProgress = (count: number) => {
    if (totalPlayers === 0) return 0;
    return (count / totalPlayers) * 100;
  };

  const positions = [
    {
      label: 'Goalkeepers',
      value: goalkeepers,
      progress: calculateProgress(goalkeepers),
      color: goalkeeperColor,
    },
    {
      label: 'Defenders',
      value: defenders,
      progress: calculateProgress(defenders),
      color: defenderColor,
    },
    {
      label: 'Midfielders',
      value: midfielders,
      progress: calculateProgress(midfielders),
      color: midfielderColor,
    },
    {
      label: 'Attackers',
      value: forwards,
      progress: calculateProgress(forwards),
      color: forwardColor,
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {positions.map((pos) => (
          <PositionGauge
            key={pos.label}
            label={pos.label}
            value={pos.value}
            progress={pos.progress}
            color={pos.color}
            size={150}
          />
        ))}
      </div>
    </div>
  );
};