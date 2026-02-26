import type { Transition } from "framer-motion";

export const springFast: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};
export const fadeSlideVariants = {
  hidden: { opacity: 0, y: -6 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};