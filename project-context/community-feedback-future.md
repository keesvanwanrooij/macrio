# Community feedback — problem & options (draft)

> **Not decided.** This file explores how we might manage community feedback once real users exist. Nothing here is on the roadmap until we choose an approach.

**Today (founder):** read Supabase + GitHub → promote to [`ROADMAP_MINOR.md`](../docs/product/ROADMAP_MINOR.md), [`notes.md`](notes.md), or another `project-context/` file. See [`docs/process/FEEDBACK_LOOP.md`](../docs/process/FEEDBACK_LOOP.md).

---

## The problem

Once Macrio is public, feedback will come from more than one place (in-app form, GitHub, maybe email/DMs). Volume, duplicates, and quality will vary. We need a way to:

- **Capture** ideas and bugs without losing them
- **Triage** into what we actually build (without a heavy CRM)
- **Close the loop** so contributors feel heard (optional replies, “shipped in vX.Y”)
- **Separate** product data reports (`reports` / melden) from product **ideas** (`feedback`)
- **Respect privacy** — users may expect their sent feedback to remain visible to them even after we process it internally

We do not yet know the right balance of process-only vs database fields vs in-app features vs trust-weighting.

---

## Options (consider later)

| Option | What it could mean | Upside | Downside / cost |
|---|---|---|---|
| **Process only (roadmap / notes)** | Read Supabase + GitHub; promote to `ROADMAP_MINOR` Inbox, `ROADMAP.md`, `notes.md`, or a `project-context/` file; delete row when captured | Zero build; works at low volume | Does not scale; no user-visible status |
| **Two channels at launch** | GitHub Issues = public bugs/features; in-app feedback = private inbox | Clear split; community can search duplicates on GitHub | Two places to watch; need naming guidance for users |
| **`feedback.status` in DB** | e.g. `open` / `triaged` / `archived` + optional `linked_roadmap_ref` | Cluster and track without a full admin UI | Migration + policy for who can read all rows |
| **Trust-weighted priority (v1.2+)** | Heavier weight for feedback from users with high trust (same graph as data governance) | Aligns with Macrio’s community model | Needs trust graph first; fairness questions |
| **Reply / status to user (v1.3–v1.4 style)** | “Planned in vX.Y”, “Shipped in vX.Y”, optional message back | Builds connection; reduces repeat submissions | Email/push, GDPR, tone, moderation workload |
| **Maintainer archive vs user delete** | When we triage, **archive** for us but user still sees “sent” in app | Honest UX; audit trail | More UI and schema than delete-on-triage |
| **Auto-delete on triage** | Remove row when copied to roadmap | Clean inbox | Users lose sent history — poor default unless explicit |

---

## Tensions to resolve

- **Public vs private:** Should all feature requests be public (GitHub) or is in-app feedback intentionally private?
- **Duplicates:** Manual merge, theme tags, or “similar requests” surfaced to users?
- **Visibility:** Supabase dashboard only vs future maintainer screen in app?
- **Replies:** Email, in-app notification, or release notes only?
- **Reports vs feedback:** Keep melden (wrong macros/allergens) as a separate moderation queue forever?

---

## Related docs

- Founder scratch: [`notes.md`](notes.md)
- Trust graph (if weighting feedback): [`docs/architecture/TRUST_GRAPH.md`](../docs/architecture/TRUST_GRAPH.md)
