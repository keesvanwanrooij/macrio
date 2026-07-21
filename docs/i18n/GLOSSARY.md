# Glossary — nl / en

> Canonical terms so UI, database, and translations stay consistent.

## Core

| Key | English | Nederlands |
|---|---|---|
| calories | calories (kcal) | calorieën (kcal) |
| carbs | carbs | koolhydraten |
| protein | protein | eiwitten |
| fat | fat | vetten |
| breakfast | breakfast | ontbijt |
| lunch | lunch | lunch |
| dinner | dinner | diner |
| snack | snack | tussendoortje |
| portion | portion | portie |
| product | product | product |
| diary | diary | dagboek |
| goal | goal | doel |
| recents | recent | recent |
| staple | staple | standaard |
| product | product | product |
| under_staple | Under: {{name}} | Onder: {{name}} |

## Catalog structure (docs/DB vs UI)

| Docs / DB | UI EN | UI NL |
|---|---|---|
| parent | Staple | Standaard |
| child | Product (linked to a staple) | Product (gekoppeld aan een standaard) |
| orphan | Product (no staple) | Product (geen standaard) |

Full rules + AH beenham example: [`docs/product/NAMING.md`](../product/NAMING.md).

## EU-14 allergens (db keys)

| Key | English | Nederlands |
|---|---|---|
| gluten | gluten | gluten |
| crustaceans | crustaceans | schaaldieren |
| eggs | eggs | eieren |
| fish | fish | vis |
| peanuts | peanuts | pinda's |
| soybeans | soy | soja |
| milk | milk (lactose) | melk (lactose) |
| nuts | tree nuts | noten |
| celery | celery | selderij |
| mustard | mustard | mosterd |
| sesame | sesame | sesamzaad |
| sulphites | sulphites | sulfiet |
| lupin | lupin | lupine |
| molluscs | molluscs | weekdieren |

## Allergen states

| Key | English | Nederlands |
|---|---|---|
| contains | contains | bevat |
| free | free from | vrij van |
| unknown | unknown | onbekend |

## Tone

- Dutch: informal "je" (not "u").
- English: plain, friendly, no medical jargon.
