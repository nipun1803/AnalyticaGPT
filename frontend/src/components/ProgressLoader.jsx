import { motion } from 'framer-motion';

export default function ProgressLoader({ text = "Processing request..." }) {
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-zinc-900 dark:text-zinc-100">{text}</span>
        <span className="text-zinc-500 animate-pulse">Running</span>
      </div>
      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-black dark:bg-white rounded-full"
          initial={{ x: "-100%", width: "50%" }}
          animate={{ x: "200%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      </div>
      <p className="text-xs text-zinc-400 text-center">This may take a moment depending on the dataset size and model complexity.</p>
    </div>
  );
}
