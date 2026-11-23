#!/usr/bin/env bash
# 构建并用 gh-pages 分支发布到 GitHub Pages。
# 用法：npm run deploy
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="gh-pages"
REMOTE="${DEPLOY_REMOTE:-origin}"

cd "$ROOT"
npm run build

WORKTREE="$(mktemp -d "${TMPDIR:-/tmp}/luma-pages.XXXXXX")"
cleanup() {
  cd "$ROOT"
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
}
trap cleanup EXIT

git worktree add --detach "$WORKTREE" >/dev/null
cd "$WORKTREE"
git checkout --orphan "$BRANCH" >/dev/null 2>&1 || git checkout "$BRANCH"
git rm -rf . >/dev/null 2>&1 || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

cp -R "$ROOT/dist/." .
touch .nojekyll

git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push --force "$REMOTE" "$BRANCH"

cd "$ROOT"
echo "✓ 已发布到 https://lzz202010.github.io/luma-memo/ （分支 ${BRANCH}）"
