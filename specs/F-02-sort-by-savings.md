# F-02 Sort by savings

Goal: a new sort option "Biggest savings" that puts the products
with the largest absolute saving (in money, not percent) first.
Why: "Biggest discount" sorts by percent; a 50 % cap saves less than
a 25 % jacket.

Decisions:

- New SortKey 'savings', label "Biggest savings", in src/lib/catalogQuery.ts.
- Saving of a product = max over AVAILABLE variants of
  (compareAtCents - priceCents), only where compareAtCents > priceCents.
- Currencies are compared by raw cents (known limitation).

Acceptance criteria (tests: src/acceptance/F-02-sort-by-savings.test.ts):

- AC-1: SORT_LABELS.savings is "Biggest savings".
- AC-2: jacket 200 -> 150 (saves 5000) comes before cap 20 -> 10 (saves 1000).
- AC-3: products without saving come last.
- AC-4: savings of unavailable variants do not count.
- AC-5: equal savings are ordered by title A-Z.

Out of scope: UI changes beyond the new option in the sort menu.
