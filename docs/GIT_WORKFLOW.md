# Git workflow

## Identity

Every commit in this repository has exactly one author and committer:

```
Name:  Mukit
Email: abdullahalmukit287@gmail.com
```

Set once per clone (repository-local, not global): `sh scripts/setup-git.sh`. The `pre-commit` hook refuses a commit whose author or committer is anyone else.

No commit, file, README, doc, code comment or package metadata names any other author, collaborator, tool or assistant. No `Co-authored-by:` trailers, no "Generated with …" lines. The `commit-msg` hook rejects these.

## Branches

- `main` — always working; only finished features are merged into it.
- One branch per feature, **named after the feature** in kebab-case, no prefix: `routine-import`, `cr-management`, `offline-sync`. The list and order are in `docs/ROADMAP.md`. Fix branches during the pilot: `pilot-fixes-<what>`.
- Create from an up-to-date `main`: `git switch main && git switch -c routine-import`.
- Merge back with `git switch main && git merge --no-ff routine-import` when the feature meets the definition of done in `ROADMAP.md`. Keep the branch afterwards (history of features).

The `pre-commit` hook allows commits only on `main` or on branches whose name is lowercase words joined by hyphens.

## Commit messages

- Short, imperative, lowercase start, no full stop, at most 50 characters: `add routine parser test`, `fix room clash for merged cells`.
- One logical change per commit.
- Body only when the reason is not obvious; wrap at 72.
- No trailers of any kind.

## Remote

Pushing to GitHub (or any remote) is done by Mukit only. Vercel deploys from the GitHub `main` branch after he pushes.

## Never committed

`.env*` (except `.env.example`), keystores (`*.jks`, `*.keystore`), service-account JSON, `node_modules`, build output, and local tool folders listed in `.gitignore`.
