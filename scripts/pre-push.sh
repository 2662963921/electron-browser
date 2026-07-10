#!/bin/sh
# Pre-push hook — bump patch version before each push.
# Install: copy (or symlink) to .git/hooks/pre-push
#   cp scripts/pre-push.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push

cd "$(dirname "$0")/.." || exit 1

# Bump patch version without creating a git tag (package.json only)
npm version patch --no-git-tag-version

# Stage the version change and create a commit
git add package.json
git commit -m "chore: bump version to $(node -p 'require(\"./package.json\").version')"
