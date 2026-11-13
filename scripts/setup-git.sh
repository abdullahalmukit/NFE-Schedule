#!/bin/sh
# One-time repository setup. Run from the repository root: sh scripts/setup-git.sh
set -e
[ -d .git ] || git init -b main
git config --local user.name "Mukit"
git config --local user.email "abdullahalmukit287@gmail.com"
git config --local core.hooksPath .githooks
git config --local commit.gpgsign false
chmod +x .githooks/pre-commit .githooks/commit-msg
echo "Git identity: $(git config user.name) <$(git config user.email)>"
echo "Hooks: $(git config core.hooksPath)"
