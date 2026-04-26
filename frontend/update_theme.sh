#!/bin/bash
find src -name "*.jsx" -type f -exec perl -pi -e '
  s/bg-zinc-900(?!\\/)/bg-white dark:bg-zinc-900/g;
  s/bg-zinc-950/bg-zinc-50 dark:bg-zinc-950/g;
  s/text-zinc-100/text-zinc-900 dark:text-zinc-100/g;
  s/text-zinc-200/text-zinc-800 dark:text-zinc-200/g;
  s/text-zinc-300/text-zinc-700 dark:text-zinc-300/g;
  s/text-zinc-400/text-zinc-500 dark:text-zinc-400/g;
  s/border-zinc-800/border-zinc-200 dark:border-zinc-800/g;
  s/border-zinc-700/border-zinc-300 dark:border-zinc-700/g;
' {} +
