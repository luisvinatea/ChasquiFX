#!/usr/bin/env python3
"""
Script to clean up Python imports and
fix common issues in the dual backend architecture.
Run this script from the project root directory.
"""

import os
import re
import sys
from typing import List, Dict

# Dictionary of modules to their common imports
COMMON_IMPORTS = {
    "json": set(["dumps", "loads", "load", "dump"]),
    "typing": set(
        ["Dict", "List", "Any", "Optional", "Union", "TypeVar", "cast"]
    ),
    "pandas": set(["DataFrame", "Series", "read_parquet", "concat"]),
    "logging": set(["getLogger", "basicConfig", "INFO", "ERROR", "WARNING"]),
}

# File extensions to check
EXTENSIONS = [".py"]

# Directories to ignore
IGNORE_DIRS = ["__pycache__", "node_modules", ".git", "env", "venv"]


def find_python_files(base_dir: str) -> List[str]:
    """Find all Python files in the directory structure."""
    python_files = []
    for root, dirs, files in os.walk(base_dir):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                python_files.append(os.path.join(root, file))

    return python_files


def analyze_file(file_path: str) -> Dict:
    """Analyze a Python file for import issues."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    issues = {
        "unused_imports": [],
        "missing_imports": [],
        "lines_too_long": [],
    }

    # Find all import statements
    import_pattern = re.compile(
        r"^(?:from\s+(\S+)\s+)?import\s+([^#\n]+)", re.MULTILINE
    )
    imports = {}

    for match in import_pattern.finditer(content):
        module = match.group(1) or match.group(2).split(".")[0]
        imported = match.group(2).strip()

        # Handle multiple imports on a single line
        imported_items = []
        for item in imported.split(","):
            item = item.strip()
            if " as " in item:
                item = item.split(" as ")[0].strip()
            if item:
                imported_items.append(item)

        if module not in imports:
            imports[module] = set()
        imports[module].update(imported_items)

    # Check for unused imports
    for module, imported in imports.items():
        # Skip common modules like os, sys
        if module in ["os", "sys", "re"]:
            continue

        for item in imported:
            # Look for the item outside of import statements
            # This is a simple check that might have false positives/negatives
            pattern = r"[^a-zA-Z0-9_]" + re.escape(item) + r"[^a-zA-Z0-9_]"
            if not re.search(pattern, content.replace(match.group(0), "")):
                issues["unused_imports"].append(f"{module}.{item}")

    # Check for lines that are too long (> 79 characters)
    for i, line in enumerate(content.split("\n")):
        if len(line) > 79:
            issues["lines_too_long"].append(i + 1)

    return issues


def main():
    """Main function."""
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "backend")
    )

    if not os.path.isdir(base_dir):
        print(f"Error: Directory not found: {base_dir}")
        sys.exit(1)

    print(f"Analyzing Python files in {base_dir}...")

    python_files = find_python_files(base_dir)
    print(f"Found {len(python_files)} Python files")

    file_issues = {}

    for file_path in python_files:
        rel_path = os.path.relpath(file_path, os.path.dirname(base_dir))
        issues = analyze_file(file_path)

        if issues["unused_imports"] or issues["lines_too_long"]:
            file_issues[rel_path] = issues

    print("\n==== ANALYSIS RESULTS ====\n")

    if file_issues:
        print(f"Found issues in {len(file_issues)} files:\n")

        for file_path, issues in file_issues.items():
            print(f"File: {file_path}")

            if issues["unused_imports"]:
                print(f"  Unused imports ({len(issues['unused_imports'])}):")
                for imp in issues["unused_imports"]:
                    print(f"    - {imp}")

            if issues["lines_too_long"]:
                print(f"  Lines too long ({len(issues['lines_too_long'])}):")
                print(
                    (
                        f"    - Lines: "
                        f"{', '.join(map(str, issues['lines_too_long'][:10]))}"
                    )
                )
                if len(issues["lines_too_long"]) > 10:
                    print(
                        f"      ... and {len(issues['lines_too_long']) - 10}"
                        f" more"
                    )

            print()
    else:
        print("No issues found!")

    print("Analysis complete!")


if __name__ == "__main__":
    main()
