/* Scene: copy to $WORK/scene.js and rewrite SCENE for your PR.
 *
 * This worked example is the skill's test PR: a Members settings page where
 * one PR (2 commits, split into 4 steps) makes Invite member the one primary
 * action, surfaces pending invitations above the table, folds each row's
 * three buttons into a ⋯ menu, and turns roles into pills. States s0..s4 were
 * captured at base, after each step, and head.
 *
 * The kit animates everything that changed between consecutive states. A step
 * only names the decision, frames it (focus) and adds the marks that name the
 * rule behind it. API: references/scene-api.md.
 */
window.SCENE = {
  title: 'Members page cleanup (PR #7)',
  // K: 1.4,          pace: authored seconds per local second (a step lasts dur × K)
  // holdBefore: 1.5, holdAfter: 5,   seconds on the first and last state
  // mode: 'explain', one state; each step annotates a module (see the API doc)
  steps: [
    {
      key: 'actions',
      name: 'One primary action',
      prob: 'Four buttons with the same weight. Inviting is the main job.',
      fix: 'Invite member is the one primary button. The rest sit in ⋯.',
      focus: { x: 928, y: 72, w: 488, h: 84 },
      into: 'nearest', // removed buttons fly into the new ⋯ instead of collapsing
      marks(ph, A, B, K) {
        const first = A.get('ctl:Export CSV'), inv = B.get('ctl:Invite member'), more = B.get('ctl:More actions');
        return K.label(first.x, first.y - 12, '4 ACTIONS · SAME WEIGHT', { op: ph.lines * (1 - ph.p) })
          + K.guide(inv.x + inv.w, 76, inv.x + inv.w, 152, ph.lines)
          + K.guide(more.x, 76, more.x, 152, K.tw(ph.t, 2.6, 3.0))
          + K.dimH(more.x, inv.x + inv.w, inv.y - 12, '1 PRIMARY + OVERFLOW', K.tw(ph.t, 2.6, 3.2, K.M.draw));
      },
    },
    {
      key: 'pending',
      name: 'Pending first',
      prob: 'Three pending invitations sit below the fold.',
      fix: 'A banner above the table shows them, with Resend all.',
      // Runs past the bottom edge so its lower corner ticks stay off the last row.
      focus: { x: 256, y: 146, w: 1160, h: 790 },
      marks(ph, A, B, K) {
        const banner = B.get('box:3 invitations are pending');
        // Shown only before the table is pushed into that band.
        return K.label(272, 890, '3 INVITES · BELOW THE FOLD ↓', { op: ph.lines * (1 - K.tw(ph.t, 1.8, 2.0)) })
          + K.label(banner.x, banner.y - 8, 'PENDING · ABOVE THE TABLE', { op: K.tw(ph.t, 2.8, 3.2) });
      },
    },
    {
      key: 'rows',
      name: 'Quiet rows',
      prob: 'Every row repeats Edit, Reset and Remove.',
      fix: 'One ⋯ menu per row holds all three.',
      focus: { x: 1168, y: 234, w: 240, h: 700 },
      into: 'nearest', // each row's buttons merge into that row's ⋯
      marks(ph, A, B, K) {
        const menu = B.get('ctl:Actions for Mia Chen');
        const x = menu.x + menu.w / 2;
        // Labels live in the empty band between the banner and the table.
        return K.label(1392, 228, '3 BUTTONS PER ROW', { anchor: 'end', op: ph.lines * (1 - ph.p) })
          + K.label(1392, 228, '1 MENU PER ROW', { anchor: 'end', op: K.tw(ph.t, 2.8, 3.2) })
          + K.guide(x, 280, x, 900, K.tw(ph.t, 2.7, 3.1));
      },
    },
    {
      key: 'roles',
      name: 'Roles at a glance',
      prob: 'Roles are plain text, so admins blend in.',
      fix: 'Role pills: Owner and Admin stand out in color.',
      focus: { x: 848, y: 234, w: 152, h: 700 },
      handles: ['box:Owner', 'box:Admin'],
      marks(ph, A, B, K) {
        return K.label(864, 228, 'ROLE · PLAIN TEXT', { op: ph.lines * (1 - ph.p) })
          + K.label(864, 228, 'OWNER + ADMIN IN COLOR', { op: K.tw(ph.t, 2.8, 3.2) });
      },
    },
  ],
};
