import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

export default function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  if (!outlet) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="min-h-[200px]"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
