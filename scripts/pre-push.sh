#!/bin/sh
# Pre-push hook — bump patch version before each push.
# Install: copy (or symlink) to .git/hooks/pre-push
#   cp scripts/pre-push.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push

# Navigate to the project root (hooks are in .git/hooks/, go up two levels)
cd "$(dirname "$0")/../.." || exit 1

# Bump patch version without creating a git tag (package.json only)
npm version patch --no-git-tag-version

# Read new version from package.json (avoid quoting issues with inline node)
NEW_VER="$(node -p "require('./package.json').version")"

# Stage the version change and create a commit
git add package.json
git commit -m "chore: bump version to v${NEW_VER}"
