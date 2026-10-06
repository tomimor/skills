# Evals

`evals.json` holds the test prompts and the expectations they are graded against (skill-creator format). The input for all three is `files/acme-admin.bundle`: a small Vite + React admin app whose `main` is the base, with three pull requests exposed GitHub-style as `refs/pull/<n>/head`:

| PR | What it changes | What it tests |
|----|-----------------|---------------|
| #10 | Members page: filter moves into the header, seat count with a meter, rows sorted by last active (2 commits; the first holds two steps) | Redesign mode, splitting a commit into steps |
| #8 | Adds a new Usage page at `/#usage` | Explain mode (no "before" state) |
| #9 | Groups the ⋯ actions menu and sets the destructive action apart | A change that only shows after a click (`--setup`) |

Recreate a GitHub-like origin and a clone for one run:

```bash
git init -q --bare run/origin.git
git -C run/origin.git fetch -q "$PWD/files/acme-admin.bundle" 'refs/*:refs/*'
git -C run/origin.git symbolic-ref HEAD refs/heads/main
git clone -q run/origin.git run/repo
```

Give every run its own copy and its own dev-server port. The worked example in `template/scene.js` is a different PR (#7 of an earlier fixture), so it doesn't hand the with-skill runs an answer.
