# Examples

Side-by-side calibration. Each pair shows a candidate finding and whether it
clears the bar.

## 1. Naming nit -- DROP

**Diff:**

```ts
function getData(userId: string) { ... }
```

**Candidate comment:** "Rename `getData` to `getUserRecord` -- more
descriptive."

**Verdict:** Drop. The name is generic but not actively misleading, and the
function takes a `userId` so context is obvious at the call site. Style
preference. Fails the hill test -- you'd cave on the first "I prefer it as
is."

---

## 2. Off-by-one -- KEEP

**Diff:**

```ts
for (let i = 0; i <= items.length; i++) {
  process(items[i]);
}
```

**Comment:**

```
### src/queue/processor.ts:L23-L25
`i <= items.length` runs one past the end -- `items[items.length]` is
`undefined` and `process` will choke on it. Should be `i < items.length`.
```

**Verdict:** Keep. Concrete bug, concrete failure mode, specific fix.

---

## 3. "Consider extracting" -- DROP

**Diff:** A 30-line route handler with three small helper-shaped blocks
inline.

**Candidate comment:** "Consider extracting the validation block into a
separate helper function for readability."

**Verdict:** Drop. The handler is 30 lines, the blocks are small, and the
suggestion starts with "Consider" -- by your own framing it's optional. If
the author leaves it inline, the code still works and still reads fine.

---

## 4. Missing null check -- KEEP

**Diff:**

```ts
const user = await db.users.findByEmail(email);
return user.profile.displayName;
```

**Comment:**

```
### src/api/profile.ts:L41
`findByEmail` returns `null` when there's no match (see its signature in
`db/users.ts`). This will throw `Cannot read properties of null` for any
unknown email. Either guard with `if (!user) return null` or make the route
404.
```

**Verdict:** Keep. Real bug, concrete trigger (any unknown email), two
acceptable fixes named.

---

## 5. Scope creep -- KEEP

**Diff:** PR titled "Fix login timeout" also reformats the entire `session/`
directory and renames three unrelated utilities.

**Comment:**

```
### Overall
The login-timeout fix is in `auth/session.ts` and is ~15 lines. The
`session/` reformat and the utility renames in this same PR aren't related
and make this much harder to review and revert. Can we pull those into a
separate PR?
```

**Verdict:** Keep. Scope creep is one of the few "PR-level" comments worth
leaving. Specific about what should be split out.

---

## 6. "Could be more functional" -- DROP

**Diff:**

```ts
const result: string[] = [];
for (const item of items) {
  if (item.active) result.push(item.name);
}
```

**Candidate comment:** "This could be written as
`items.filter(i => i.active).map(i => i.name)` -- more idiomatic."

**Verdict:** Drop. Both versions are correct, equally readable, and the
imperative version may actually be faster. Personal preference. Fails the
hill test.
