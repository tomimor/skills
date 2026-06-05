#!/usr/bin/env python3
"""CLI helper for the goal-cursor skill: set, status, clear."""
from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

STATE_DIR = Path.home() / ".cursor" / "goal-cursor"
MAX_CONDITION_CHARS = 4000
CLEAR_ALIASES = {"clear", "stop", "off", "reset", "none", "cancel"}


def workspace_root() -> Path:
    env = os.environ.get("CURSOR_PROJECT_DIR") or os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()


def state_path(root: Path | None = None) -> Path:
    root = root or workspace_root()
    digest = hashlib.sha256(str(root).encode("utf-8")).hexdigest()[:16]
    safe_name = f"{root.name or 'workspace'}-{digest}.json"
    return STATE_DIR / safe_name


def load_state(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text("utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_state(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp"
    ) as tmp:
        json.dump(data, tmp, indent=2)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, path)


def elapsed(started_at: str) -> str:
    try:
        start = datetime.fromisoformat(started_at)
    except ValueError:
        return "unknown"
    delta = datetime.now(timezone.utc) - start
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    return f"{seconds // 3600}h {(seconds % 3600) // 60}m"


def cmd_set(condition: str) -> int:
    condition = condition.strip()
    if not condition:
        print("error: condition is empty. usage: goal.py set \"<condition>\"", file=sys.stderr)
        return 2
    if len(condition) > MAX_CONDITION_CHARS:
        print(
            f"error: condition exceeds {MAX_CONDITION_CHARS} chars ({len(condition)}).",
            file=sys.stderr,
        )
        return 2

    root = workspace_root()
    path = state_path(root)
    data = {
        "workspace": str(root),
        "condition": condition,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "turns": 0,
        "last_reason": None,
    }
    write_state(path, data)
    print(f"GOAL_ACTIVE: {condition}")
    print()
    print("The stop hook will check this condition after every turn and auto-continue")
    print("until an evaluator model says it is met. Begin working toward it now.")
    print("Run `/goal-cursor` for status, `/goal-cursor clear` to abort.")
    return 0


def cmd_status() -> int:
    path = state_path()
    data = load_state(path)
    if not data:
        print("No active goal.")
        return 0
    print(f"Condition : {data['condition']}")
    print(f"Workspace : {data.get('workspace', '?')}")
    print(f"Started   : {data['started_at']}")
    print(f"Elapsed   : {elapsed(data['started_at'])}")
    print(f"Turns     : {data.get('turns', 0)}")
    last = data.get("last_reason")
    if last:
        print(f"Last eval : {last}")
    return 0


def cmd_clear() -> int:
    path = state_path()
    if path.exists():
        path.unlink()
        print("Goal cleared.")
    else:
        print("No active goal.")
    return 0


def dispatch(argv: list[str]) -> int:
    if not argv:
        return cmd_status()

    head = argv[0].strip().lower()

    if head == "set":
        return cmd_set(" ".join(argv[1:]))
    if head == "status":
        return cmd_status()
    if head in CLEAR_ALIASES:
        return cmd_clear()

    if head == "invoke":
        rest = argv[1:]
        if not rest:
            return cmd_status()
        first = rest[0].strip().lower()
        if first == "status":
            return cmd_status()
        if first in CLEAR_ALIASES:
            return cmd_clear()
        if first == "set":
            return cmd_set(" ".join(rest[1:]))
        return cmd_set(" ".join(rest))

    return cmd_set(" ".join(argv))


if __name__ == "__main__":
    sys.exit(dispatch(sys.argv[1:]))
