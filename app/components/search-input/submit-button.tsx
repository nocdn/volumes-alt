"use client";

import { memo } from "react";
import { Plus, Loader } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface SubmitButtonProps {
  onClick: () => void;
  disabled: boolean;
  isRefreshing?: boolean;
}

export const SubmitButton = memo(function SubmitButton({
  onClick,
  disabled,
  isRefreshing,
}: SubmitButtonProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-full cursor-pointer size-7 flex items-center justify-center transition-colors ${disabled ? "opacity-50" : "hover:bg-[#E5E6E6]"}`}
      style={{ backgroundColor: "#F2F3F3" }}
    >
      <AnimatePresence mode="popLayout">
        {isRefreshing ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Loader size={19} color="#7a7a7a" className="animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="plus"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={19} color="#7a7a7a" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
