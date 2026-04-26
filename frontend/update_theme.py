import os
import re

directory = "src"
replacements = [
    (r"bg-zinc-900\b", "bg-white dark:bg-zinc-900"),
    (r"bg-zinc-950\b", "bg-zinc-50 dark:bg-zinc-950"),
    (r"text-zinc-100\b", "text-zinc-900 dark:text-zinc-100"),
    (r"text-zinc-200\b", "text-zinc-800 dark:text-zinc-200"),
    (r"text-zinc-300\b", "text-zinc-700 dark:text-zinc-300"),
    (r"text-zinc-400\b", "text-zinc-500 dark:text-zinc-400"),
    (r"border-zinc-800\b", "border-zinc-200 dark:border-zinc-800"),
    (r"border-zinc-700\b", "border-zinc-300 dark:border-zinc-700"),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".jsx"):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
            original_content = content
            for pattern, repl in replacements:
                content = re.sub(pattern, repl, content)
            if content != original_content:
                with open(filepath, "w") as f:
                    f.write(content)
print("Theme replacements completed.")
