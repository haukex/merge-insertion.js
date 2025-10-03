Merge-Insertion Sort a.k.a. Ford-Johnson Algorithm
==================================================

The Ford-Johnson algorithm[1], also known as the merge-insertion sort[2,3] uses the minimum
number of possible comparisons for lists of 22 items or less, and at the time of writing has
the fewest comparisons known for lists of 46 items or less. It is therefore very well suited
for cases where comparisons are expensive, such as user input, and the API is implemented to
take an async comparator function for this reason.

1. Ford, L. R., & Johnson, S. M. (1959). A Tournament Problem.
   The American Mathematical Monthly, 66(5), 387–389. <https://doi.org/10.1080/00029890.1959.11989306>
2. Knuth, D. E. (1998). The Art of Computer Programming: Volume 3: Sorting and Searching (2nd ed.). Addison-Wesley.
3. <https://en.wikipedia.org/wiki/Merge-insertion_sort>

## Type Aliases

### Comparator()

> **Comparator**\<`T`\> = (`ab`) => `Promise`\<`0` \| `1`\>

A function to compare two items.

#### Type Parameters

##### T

`T` *extends* `NonNullable`\<`unknown`\>

The type that this comparator can compare, which must have sensible support for the equality operators.

#### Parameters

##### ab

`Readonly`\<\[`T`, `T`\]\>

A tuple of the two items to be compared; they must not be equal.

#### Returns

`Promise`\<`0` \| `1`\>

Must return a Promise resolving to 0 if the first item is ranked higher, or 1 if the second item is ranked higher.

## Functions

### mergeInsertionMaxComparisons()

> **mergeInsertionMaxComparisons**(`n`): `number`

Returns the maximum number of comparisons that `mergeInsertionSort` will perform depending on the input length `n`.

#### Parameters

##### n

`number`

The number of items in the list to be sorted.

#### Returns

`number`

The expected maximum number of comparisons.

***

### mergeInsertionSort()

> **mergeInsertionSort**\<`T`\>(`array`, `comparator`): `Promise`\<`T`[]\>

Merge-Insertion Sort (Ford-Johnson algorithm) with async comparison.

#### Type Parameters

##### T

`T` *extends* `object`

The type of the items to sort.

#### Parameters

##### array

readonly `T`[]

Array of to sort. Duplicate items are not allowed.

##### comparator

[`Comparator`](#comparator)\<`T`\>

Async comparison function.

#### Returns

`Promise`\<`T`[]\>

The array sorted in ascending order.

***

### permutations()

> **permutations**\<`T`\>(`array`): `Generator`\<`T`[]\>

Generates permutations with [Heap's algorithm](https://en.wikipedia.org/wiki/Heap%27s_algorithm) (non-recursive).

#### Type Parameters

##### T

`T`

The type of the items to permute.

#### Parameters

##### array

readonly `T`[]

The list of items to permute.

#### Returns

`Generator`\<`T`[]\>

A generator that returns the permutations.

Author, Copyright and License
-----------------------------

Copyright © 2025 Hauke Dämpfling (haukex@zero-g.net)

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
