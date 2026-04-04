"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";

interface SwipeAction {
  icon: string;
  label: string;
  color: string; // tailwind classes for the icon circle bg
  textColor: string; // tailwind text class for the icon
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
  actionWidth = 64,
  onTap,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWidth = actions.length * actionWidth;

  // Scale action buttons as they reveal
  const actionsScale = useTransform(x, [-totalWidth, -totalWidth * 0.5, 0], [1, 0.85, 0.5]);

  function handleDragStart() {
    isDragging.current = true;
  }

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

    // Reset dragging flag after a short delay to prevent tap from firing
    setTimeout(() => { isDragging.current = false; }, 50);
  }

  function close() {
    animate(x, 0, { type: "spring", bounce: 0.15, duration: 0.3 });
    setIsOpen(false);
  }

  function handleActionClick(action: SwipeAction) {
    action.onClick();
    close();
  }

  function handleTap() {
    // Don't trigger tap if we were just dragging
    if (isDragging.current) return;
    if (isOpen) {
      close();
    } else {
      onTap?.();
    }
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Action buttons revealed behind — modern pill style */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-evenly px-2"
        style={{ width: totalWidth, scale: actionsScale }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(action);
            }}
            className="flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
          >
            <div className={`size-10 rounded-full flex items-center justify-center ${action.color} shadow-md`}>
              <span className={`material-symbols-outlined text-[20px] ${action.textColor}`}>{action.icon}</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 leading-none">{action.label}</span>
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        className="relative z-10 bg-white touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
