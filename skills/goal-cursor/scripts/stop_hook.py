#!/usr/bin/env python3
"""Cursor `stop` hook for the goal-cursor skill.

Reads stop-hook JSON from stdin, looks up the workspace goal, asks an
evaluator model whether the condition holds against the transcript tail,
and emits `{"followup_message": "..."}` to keep Cursor iterating, or `{}`
to allow the loop to end.

Fails open on every error path so a broken evaluator cannot trap the user.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

STATE_DIR = Path.home() / ".cursor" / "goal-cursor"
LOG_PATH = STATE_DIR / "hook.log"
EVALUATOR_PROMPT = Path(__file__).resolve().parent.parent / "references" / "evaluator-prompt.md"

DEFAULT_EVAL_MODEL = os.environ.get("GOAL_CURSOR_EVAL_MODEL", "sonnet-4")
MAX_TURNS = int(os.environ.get("GOAL_CURSOR_MAX_TURNS", "100"))
TRANSCRIPT_TAIL_BYTES = 30_000
EVAL_TIMEOUT_SECS = 45


def log(msg: str) -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")
    except OSError:
        pass


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.write("\n")
    sys.stdout.flush()


def state_path_for_workspace(workspace: str) -> Path:
    root = Path(workspace).resolve()
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


def read_transcript_tail(transcript_path: str | None) -> str:
    if not transcript_path:
        return "(transcript unavailable; judge from prior reason only)"
    try:
        p = Path(transcript_path)
        if not p.exists():
            return "(transcript file missing)"
        size = p.stat().st_size
        with p.open("rb") as f:
            if size > TRANSCRIPT_TAIL_BYTES:
                f.seek(size - TRANSCRIPT_TAIL_BYTES)
                _ = f.readline()
            return f.read().decode("utf-8", errors="replace")
    except OSError as e:
        log(f"transcript read failed: {e}")
        return "(transcript read failed)"


def evaluator_system_prompt() -> str:
    try:
        return EVALUATOR_PROMPT.read_text("utf-8")
    except OSError:
        return (
            "You judge whether a goal condition holds based only on the conversation "
            "transcript shown. Do not call tools. Return strict JSON "
            '{"met": bool, "reason": "<=200 char explanation"}.'
        )


def build_user_prompt(condition: str, transcript: str, turn: int) -> str:
    return (
        f"Goal condition:\n{condition}\n\n"
        f"Turn number: {turn}\n\n"
        "Conversation transcript tail:\n"
        "----------------------------------------\n"
        f"{transcript}\n"
        "----------------------------------------\n\n"
        'Reply with strict JSON only: {"met": bool, "reason": "<=200 chars"}'
    )


def parse_json_obj(text: str) -> dict | None:
    match = re.search(r"\{[^{}]*\"met\"[^{}]*\}", text, re.DOTALL)
    candidate = match.group(0) if match else text.strip()
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or "met" not in data:
        return None
    return data


def run_subprocess(cmd: list[str], stdin_text: str) -> str | None:
    try:
        result = subprocess.run(
            cmd,
            input=stdin_text,
            capture_output=True,
            text=True,
            timeout=EVAL_TIMEOUT_SECS,
            check=False,
        )
        if result.returncode != 0:
            log(f"eval cmd exit {result.returncode}: {result.stderr[:500]}")
            return None
        return result.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        log(f"eval cmd failed: {e}")
        return None


def call_cursor_agent(system_prompt: str, user_prompt: str) -> str | None:
    cmd = [
        "cursor-agent",
        "-p",
        "--output-format",
        "text",
        "--model",
        DEFAULT_EVAL_MODEL,
        "--force",
        f"{system_prompt}\n\n{user_prompt}",
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=EVAL_TIMEOUT_SECS,
            check=False,
        )
        if result.returncode != 0:
            log(f"cursor-agent exit {result.returncode}: {result.stderr[:500]}")
            return None
        return result.stdout
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        log(f"cursor-agent failed: {e}")
        return None


def call_anthropic(system_prompt: str, user_prompt: str) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    body = json.dumps(
        {
            "model": "claude-haiku-4-5",
            "max_tokens": 256,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        method="POST",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=EVAL_TIMEOUT_SECS) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
        log(f"anthropic call failed: {e}")
        return None
    blocks = payload.get("content") or []
    for block in blocks:
        if block.get("type") == "text":
            return block.get("text", "")
    return None


def evaluate(condition: str, transcript: str, turn: int) -> dict | None:
    system_prompt = evaluator_system_prompt()
    user_prompt = build_user_prompt(condition, transcript, turn)

    override = os.environ.get("GOAL_CURSOR_EVAL_CMD")
    raw: str | None
    if override:
        raw = run_subprocess(shlex.split(override), f"{system_prompt}\n\n{user_prompt}")
    else:
        raw = call_cursor_agent(system_prompt, user_prompt)
        if raw is None:
            raw = call_anthropic(system_prompt, user_prompt)

    if not raw:
        return None
    return parse_json_obj(raw)


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as e:
        log(f"bad stdin json: {e}")
        emit({})
        return 0

    workspace_roots = payload.get("workspace_roots") or []
    workspace = workspace_roots[0] if workspace_roots else os.environ.get(
        "CURSOR_PROJECT_DIR", os.getcwd()
    )
    transcript_path = payload.get("transcript_path")
    loop_count = int(payload.get("loop_count") or 0)

    path = state_path_for_workspace(workspace)
    state = load_state(path)
    if state is None:
        emit({})
        return 0

    state["turns"] = int(state.get("turns", 0)) + 1
    if state["turns"] > MAX_TURNS or loop_count > MAX_TURNS:
        log(f"max turns reached for {workspace}; clearing goal")
        try:
            path.unlink()
        except OSError:
            pass
        emit({})
        return 0

    transcript = read_transcript_tail(transcript_path)
    try:
        verdict = evaluate(state["condition"], transcript, state["turns"])
    except Exception as e:  # noqa: BLE001 fail-open guard
        log(f"evaluator crashed: {e}")
        emit({})
        return 0

    if verdict is None:
        log("evaluator returned no parseable JSON; treating as not met")
        state["last_reason"] = "evaluator returned no parseable JSON"
        write_state(path, state)
        emit(
            {
                "followup_message": (
                    f"Goal-cursor check: evaluator returned no parseable verdict. "
                    f"Continue working toward: {state['condition']}"
                )
            }
        )
        return 0

    met = bool(verdict.get("met"))
    reason = str(verdict.get("reason", ""))[:400]

    if met:
        log(f"goal met for {workspace}: {reason}")
        try:
            path.unlink()
        except OSError:
            pass
        emit({})
        return 0

    state["last_reason"] = reason
    write_state(path, state)
    emit(
        {
            "followup_message": (
                f"Goal-cursor check (turn {state['turns']}): not yet met. "
                f"Evaluator says: {reason or '(no reason)'}. "
                f"Continue working toward: {state['condition']}"
            )
        }
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001 last-resort fail-open
        log(f"top-level crash: {e}")
        emit({})
        sys.exit(0)
