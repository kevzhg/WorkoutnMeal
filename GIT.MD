codex# Git: Commit and Merge to `master`

Follow these steps from your feature branch (e.g., `onigiri`):

1) Check status: `git status -sb`
2) Stage changes (skip local data like `data/mongodb/` if desired):
   - Tracked only: `git add -u`
   - Tracked + new files: `git add .`
3) Commit: `git commit -m "Describe the change"`
4) Update `master`: `git checkout master && git pull origin master`
5) Merge your branch: `git merge onigiri`
   - Resolve conflicts if prompted, then `git add .` and `git commit`
6) Push master: `git push origin master` (use a GitHub PAT if HTTPS prompts)
7) (Optional) Push feature branch: `git push origin onigiri`
8) Verify clean tree: `git status -sb`

## Pull latest `master` into `workout`
1) Save/stash your work: `git status -sb` (if dirty, commit or `git stash`)
2) Ensure `master` is current: `git checkout master && git pull origin master`
3) Switch back: `git checkout workout`
4) Merge master: `git merge master` (or `git rebase master` if you prefer)
   - Resolve conflicts if any, then `git add .` and `git commit` (or `git rebase --continue`)
5) Continue working on `workout` and push if needed: `git push origin workout`
