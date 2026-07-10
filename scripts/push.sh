#!/bin/sh
# Usage: ./scripts/push.sh [remote]
# Push commits; if successful, bump patch version and push the bump commit.
# Default remote: origin

set -e

REMOTE="${1:-origin}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "=== Pushing to ${REMOTE}/${BRANCH} ==="
if git push "${REMOTE}" "${BRANCH}"; then
  echo ""
  echo "=== Push OK — bumping version ==="
  npm version patch --no-git-tag-version
  NEW_VER="$(node -p "require('./package.json').version")"
  git add package.json
  git commit -m "chore: bump version to v${NEW_VER}"
  echo "=== Pushing version bump commit ==="
  git push "${REMOTE}" "${BRANCH}"
  echo ""
  echo "Done — version bumped to v${NEW_VER}"
else
  echo ""
  echo "Push failed — version NOT bumped"
  exit 1
fi
