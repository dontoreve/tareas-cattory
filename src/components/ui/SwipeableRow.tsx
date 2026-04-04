"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";

interface SwipeAction {
  icon: string;
  label: string;
  color: string; // tailwind bg class
  hoverColor: string; // tailwind hover bg class
  textColor: string; // tailwind text class
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
  /** Width of each action button in px */
  actionWidth?: number;
  onTap?: () => void;
}

/**
 * iOS-style swipeable row that reveals action buttons on swipe left.
 * Uses Framer Motion for smooth, physics-based animations.
 */
export default function SwipeableRow({
  children,
  actions,
  className = "",
  actionWidth = 72,
  onTap,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWidth = actions.length * actionWidth;

  // Opacity for action buttons — fade in as user swipes
  const actionsOpacity = useTransform(x, [-totalWidth, -totalWidth * 0.3, 0], [1, 0.6, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // If fast swipe or dragged past 40% of total action width
    if (velocity < -300 || offset < -totalWidth * 0.4) {
      animate(x, -totalWidth, { type: "spring", bounce: 0.15, duration: 0.4 });
      setIsOpen(true);
    } else {
      animate(x, 0, { type: "spring", bounce: 0.15, duration: 0.3 });
      setIsOpen(false);
    }
  }

  function close() {
    animate(x, 0, { type: "spring", bounce: 0.15, duration: 0.3 });
    setIsOpen(false);
  }

  function handleActionClick(action: SwipeAction) {
    action.onClick();
    close();
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Action buttons revealed behind */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ opacity: actionsOpacity, width: totalWidth }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(action);
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${action.color} ${action.textColor} active:brightness-90`}
            style={{ width: actionWidth }}
          >
            <span className="material-symbols-outlined text-[22px]">{action.icon}</span>
            <span className="text-[10px] font-semibold leading-none">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Foreground draggable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -totalWidth - 20, right: 0 }}
        dragElastic={{ left: 0.05, right: 0.2 }}
        onDragEnd={handleDragEnd}
        onTap={() => {
          if (isOpen) {
            close();
          } else {
            onTap?.();
          }
        }}
        className="relative z-10 bg-white touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
