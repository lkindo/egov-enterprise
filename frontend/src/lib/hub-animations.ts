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

// Quick scale in (for badges and small widgets)
export const hubScaleVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 180,
      damping: 22
    }
  }
};

// Slide in from right (for sidebars/drawer-like components)
export const hubSlideRightVariants: Variants = {
  hidden: { x: 40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25
    }
  }
};

// Pulse animation (for live indicators)
export const hubPulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
