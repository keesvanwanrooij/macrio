# Naming — products, parents, and UI copy

> Canonical naming for catalog structure, search labels, and docs. **DB/dev terms** stay English; **UI** is nl/en via i18n (`docs/i18n/GLOSSARY.md`).

## Quick answer (AH beenham example)

**Do not** make `AH Ovenschotel beenham honing mosterd` a parent.

| Layer | What to create | Example name |
|---|---|---|
| **Parent** (Macrio / system only) | Generic staple people recognize | NL: **Beenham** · EN: **Gammon / cured ham (bone-in)** |
| **Child** (community or seed SKU) | This AH ready meal / cut | **AH Ovenschotel beenham honing mosterd** |

Why: parents are generic (“beenham”); supermarket SKUs, marinades, and pack sizes are children under that parent (or parentless if nothing fits).

Optional later: if “ovenklare beenham” becomes a common Dutch staple class of its own, still prefer one parent **Beenham** with cook/prep noted on the **version** (`cook_state`, portion ≈ 600 g), not a parent per AH flavour.

Until **v1.0.8** parent linking exists: add this AH item as a normal **product** (orphan is OK). When parents land, link it under **Beenham**.

---

## Two vocabularies (do not mix)

### A. Docs, code, DB (English)

| Term | Meaning |
|---|---|
| **parent** | System-owned staple food. Users cannot create parents in v1.0. |
| **child** | Community or seeded product that **may** link to a parent. |
| **orphan** | Product with **no** parent (allowed when nothing fits). |
| **product** | Catalog identity (barcode/source); may be parent or child. |
| **version** | Immutable nutrition/allergen/portion snapshot; diary logs versions. |
| **cook_state** | `cooked` \| `uncooked` \| `not_applicable` (v1.0.7). |

### B. App UI (user-facing)

Avoid “parent/child” in the UI (sounds like genealogy).

| Key (i18n) | English UI | Nederlands UI |
|---|---|---|
| `catalog.staple` | Staple | Standaard |
| `catalog.product` | Product | Product |
| `catalog.underStaple` | Under: {{name}} | Onder: {{name}} |
| `catalog.noStaple` | No staple linked | Geen standaard gekoppeld |
| `catalog.linkStaple` | Link to a staple | Koppel aan een standaard |

Search/list pattern:

- Staple row: **Beenham** (badge: Standaard / Staple)
- Child row: **AH Ovenschotel beenham honing mosterd** · subtitle **Onder: Beenham**

---

## How to name parents

1. **Generic food word**, not a brand: `Beenham`, `Appel`, `Kipfilet`, `Zilvervliesrijst`.
2. **Singular** where natural (appel, not appels), unless the food is usually plural in Dutch (e.g. some dishes).
3. **No retailer** in the parent name (no AH, Jumbo, Lidl).
4. **No pack size or price** in the name (`ca. 600 g`, €/kg stay as metadata / portion / future price feature).
5. **Bilingual:** `name_nl` + `name_en` on every parent (and child).
6. Prefer **one parent per staple**; differ raw vs cooked with `cook_state` / separate versions, not “Beenham gekookt” as a second parent unless macros and use truly diverge for search.

## How to name children (brand / SKU)

1. Use the **shop or package title**, trimmed: `AH Ovenschotel beenham honing mosterd`.
2. Keep brand first when it helps scan lists: `AH …`, `Jumbo …`.
3. Do **not** stuff macros or allergens into the title.
4. Portion: prefer structured portions (e.g. `1 schaal – 600 g`), not the title.
5. Link to the closest staple parent when obvious; else leave orphan.

## Examples

| Parent (standaard) | Children (producten) |
|---|---|
| Beenham | AH Ovenschotel beenham honing mosterd; Jumbo beenham … |
| Appel | Appel Elstar; AH Elstar appelen |
| Kipfilet | AH kipfilet naturel; … |
| Zilvervliesrijst | (generic seed version); brand packs as children |

## Related roadmap

- Structure ships in **v1.0.8** — [`plans/v1.0.8-parent-catalog.md`](plans/v1.0.8-parent-catalog.md)
- Pitch: [`project-context/parent-food-catalog-pitch.md`](../../project-context/parent-food-catalog-pitch.md)
- Community **prices per country** (optional future): see `ROADMAP.md` → v1.4
