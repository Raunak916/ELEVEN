'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Title lines for editorial split heading (e.g., ["PLAYER", "POOL"]) */
  lines: string[];
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ lines, description, action, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn('mb-6 sm:mb-10 lg:mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6', className)}
    >
      <div className="flex-1 min-w-0">
        {/* Editorial split heading */}
        <div className="editorial-heading mb-2 sm:mb-4">
          {lines.map((line, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
              className="text-display text-foreground tracking-tight select-none"
            >
              {line}
            </motion.span>
          ))}
        </div>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: lines.length * 0.1 + 0.1 }}
            className="text-muted-foreground text-body max-w-2xl leading-relaxed"
          >
            {description}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: lines.length * 0.1 + 0.2 }}
          className="flex-shrink-0 w-full sm:w-auto"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}