---
type: teaching-deck
format: "4:3"
slides: ~10
tone: instructional
stresses: agenda/TOC; definition; worked example; numbered steps; speaker-notes; diagram placeholder
lang: en
---

# Binary Search
### CS 101 · Lecture 7 — Searching & Sorting

## Today
1. Why linear search isn't enough
2. The binary search idea
3. Writing it step by step
4. Cost analysis
5. Common pitfalls

## The problem
Finding an item in a **sorted** list of a million entries.
Linear search checks them one by one — up to a million comparisons.

<!-- note: ask the class how they'd look up a word in a dictionary — nobody starts at page 1. -->

## The key idea
Check the middle. Halve the search space every step.

- Too high? Discard the upper half.
- Too low? Discard the lower half.
- Repeat on what remains.

## Definition
**Binary search** — an algorithm that finds a target in a sorted array by repeatedly halving the interval that could contain it.

## Step by step
1. Set `lo = 0`, `hi = n - 1`
2. While `lo <= hi`:
3. &nbsp;&nbsp;`mid = (lo + hi) / 2`
4. &nbsp;&nbsp;If `a[mid] == target` → return `mid`
5. &nbsp;&nbsp;If `a[mid] < target` → `lo = mid + 1`
6. &nbsp;&nbsp;Else → `hi = mid - 1`

## Why it's fast
Each step halves the problem: 1,000,000 → 500,000 → 250,000 → …
**~20 comparisons** for a million items, vs a million for linear.

![Interval halving across steps](visual:halving-diagram)

## Common pitfalls
- Forgetting the list must be **sorted**
- Off-by-one in `lo`/`hi` updates → infinite loop
- Integer overflow in `(lo + hi)` for huge arrays

## Recap
- Halve the search space each step
- O(log n) comparisons
- Only works on sorted data

## Your turn
Implement binary search and test it on the array from the handout.

<!-- note: next lecture — when sorting is worth the up-front cost. -->
