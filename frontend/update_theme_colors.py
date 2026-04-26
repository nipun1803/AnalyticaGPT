import os
import re

directory = "src"
replacements = [
    # Replace violet/indigo gradients and backgrounds with orange
    (r"bg-violet-", "bg-orange-"),
    (r"text-violet-", "text-orange-"),
    (r"border-violet-", "border-orange-"),
    (r"from-violet-", "from-orange-"),
    (r"to-indigo-", "to-amber-"),
    (r"shadow-violet-", "shadow-orange-"),
    
    # Replace cyan with something complementary, like rose or red
    (r"bg-cyan-", "bg-rose-"),
    (r"text-cyan-", "text-rose-"),
    (r"border-cyan-", "border-rose-"),
    (r"to-cyan-", "to-rose-"),
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
print("Theme color replacements to Orange/Amber completed.")
