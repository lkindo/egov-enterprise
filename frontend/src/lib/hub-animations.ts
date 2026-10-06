import { Variants } from 'framer-motion';

/**
 * Hub Design System - Standard Animation Variants
 */

// Container with staggered children
export const hubContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Standard item entrance (Fade + Slide Up)
export const hubItemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 24
    }
  }
};
