"use client";

import { memo } from "react";
import { X, RefreshCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const CHIP_VARIANTS = {
  editing: {
    bg: "bg-[#F5F3FF]",
    text: "text-[#6A00F5]",
    iconColor: "#6A00F5",
  },
  favicon: {
    bg: "bg-[#EFF6FF]",
    text: "text-[#2563EB]",
    iconColor: "#2563EB",
  },
  tag: {
    bg: "bg-[#F5F3FF]",
    text: "text-[#6A00F5]",
    iconColor: "#6A00F5",
  },
  delete: {
    bg: "bg-[#FFF0F0]",
    text: "text-[#FD2B38]",
    iconColor: "#FD2B38",
  },
} as const;

type ChipVariant = keyof typeof CHIP_VARIANTS;

interface ChipProps {
  variant: ChipVariant;
  label: string;
  onClick: () => void;
  showRefreshIcon?: boolean;
  rotationKey?: number;
  capitalize?: boolean;
}

export const Chip = memo(function Chip({
  variant,
  label,
  onClick,
  showRefreshIcon = false,
  rotationKey = 0,
  capitalize = false,
}: ChipProps) {
  const styles = CHIP_VARIANTS[variant];

  return (
    <div
      className={`${styles.bg} ${styles.text} text-sm font-medium font-rounded px-2.75 py-1 rounded-full relative group cursor-pointer ${capitalize ? "capitalize" : ""}`}
      onClick={onClick}
    >
      {label}
      <div
        className={`cursor-pointer absolute -right-2.5 -top-2 border-white border-2 p-0.75 rounded-full ${styles.bg} opacity-0 group-hover:opacity-100 transition-all duration-150`}
      >
        {showRefreshIcon ? (
          <motion.div
            key={rotationKey}
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
          >
            <RefreshCcw size={12} color={styles.iconColor} strokeWidth={2.75} />
          </motion.div>
        ) : (
          <X size={12} color={styles.iconColor} strokeWidth={2.75} />
        )}
      </div>
    </div>
  );
});

const CHIP_ANIMATION = {
  initial: { opacity: 0, scale: 0.95, filter: "blur(1px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.95, filter: "blur(1px)" },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

interface AnimatedChipProps extends ChipProps {
  layoutId?: string;
  whileTap?: boolean;
}

export const AnimatedChip = memo(function AnimatedChip({
  layoutId,
  whileTap = false,
  ...chipProps
}: AnimatedChipProps) {
  return (
    <motion.div
      layout={!!layoutId}
      key={layoutId}
      {...CHIP_ANIMATION}
      whileTap={whileTap ? { scale: 0.95, opacity: 0.6 } : undefined}
    >
      <Chip {...chipProps} />
    </motion.div>
  );
});

interface ChipSeparatorProps {
  visible: boolean;
}

export const ChipSeparator = memo(function ChipSeparator({
  visible,
}: ChipSeparatorProps) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="tag-separator"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-0.5 h-4 bg-gray-200 rounded-full mx-px"
        />
      ) : null}
    </AnimatePresence>
  );
});

interface TagChipsProps {
  tags: string[];
  onRemove: (tag: string) => void;
}

export const TagChips = memo(function TagChips({
  tags,
  onRemove,
}: TagChipsProps) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {tags.map((tag) => (
        <AnimatedChip
          key={`tag-chip-${tag}`}
          layoutId={`tag-chip-${tag}`}
          variant="tag"
          label={tag}
          onClick={() => onRemove(tag)}
          capitalize
          whileTap
        />
      ))}
    </AnimatePresence>
  );
});
