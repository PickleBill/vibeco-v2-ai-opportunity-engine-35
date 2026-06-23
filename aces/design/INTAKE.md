# Design intake — Claude Design → Claude Code

## The honest state of the bridge

There is **no automated, direct connection** from Claude Design to this Claude Code
environment right now:

- Claude Design packages live behind auth at `api.anthropic.com/v1/design/...`. Fetching
  one requires *your* authenticated browser session.
- This remote Claude Code session has **no computer-use / browser tool** to log in as you
  and pull the file (I checked the available tools).

So a design link pasted into chat will 404 from here. **That is expected, not a bug.**

## The working path (what to do)

1. In Claude Design, open the project → **Download** the package (zip / files).
2. **Upload** those files into the Claude Code session (drag-in or attach), or drop them in
   a synced project folder Claude Code can read.
3. Tell me which design it is. I'll copy the meaningful files into `aces/design/source/`,
   build/refresh the prototype, and keep the source under version control for reference.

This is exactly how the current NiceAce design got here.

## If you want to reduce friction later (options, in rough order of effort)

- **Lightweight:** keep a `design/source/` drop folder convention (done) so every handoff
  is one upload + "go."
- **Medium:** if Claude Code gains a computer-use/browser tool in this environment, I could
  log into Claude Design with your session and pull packages directly — not available today.
- **Heavier:** an export step in your workflow (or a small script you run locally with your
  credentials) that pushes design packages to a repo path or bucket Claude Code already
  watches. This keeps your auth on your machine and gives me a stable, automatable source.

When you're ready, say the word and I'll spec the medium/heavy option properly.

## Conventions

- Original exports live in `aces/design/source/` **unedited** (the source of truth).
- The built/working prototype lives in `aces/prototype/` and may diverge as we iterate —
  always note in the prototype's header comment which source design it descends from.
