# F-01 Savings in cart

Goal: the cart drawer shows how much the shopper saves through sale prices.
Why: shoppers see the value of their cart at a glance.
Decisions:

- New pure function `savingsByCurrency(items: CartItem[])` in `src/lib/cart.ts` , returning cents per currency like `totalsByCurrency`.
- Saving per line = (compareAtCents - unitPriceCents) \* quantity,
  only if compareAtCents > unitPriceCents.
- Unavailable items do not count.
- UI: one line "You save {amount}" under the grand total in
  `CartDrawer.tsx`, formatted with `formatMultiCurrency`. Hidden when 0.

Acceptance criteria:

- AC-1: 1 item, price 80.00, compare-at 100.00, qty 2 -> USD 4000 cents.
- AC-2: compare-at null or <= price -> saving 0 for that line.
- AC-3: unavailable item with a discount -> not counted.
- AC-4: USD and EUR items -> two separate entries, never summed.
- AC-5: empty cart -> {} (empty object).
- AC-6: the line is not shown when there are no savings.
  Out of scope: savings on the checkout page, percentage display.
