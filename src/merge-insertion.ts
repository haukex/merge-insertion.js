/**
 * Merge-Insertion Sort a.k.a. Ford-Johnson Algorithm
 * ==================================================
 *
 * The Ford-Johnson algorithm[1], also known as the merge-insertion sort[2,3] uses the minimum
 * number of possible comparisons for lists of 22 items or less, and at the time of writing has
 * the fewest comparisons known for lists of 46 items or less. It is therefore very well suited
 * for cases where comparisons are expensive, such as user input, and the API is implemented to
 * take an async comparator function for this reason.
 *
 * 1. Ford, L. R., & Johnson, S. M. (1959). A Tournament Problem.
 *    The American Mathematical Monthly, 66(5), 387–389. <https://doi.org/10.1080/00029890.1959.11989306>
 * 2. Knuth, D. E. (1998). The Art of Computer Programming: Volume 3: Sorting and Searching (2nd ed.). Addison-Wesley.
 * 3. <https://en.wikipedia.org/wiki/Merge-insertion_sort>
 *
 * Author, Copyright and License
 * -----------------------------
 *
 * Copyright © 2025 Hauke Dämpfling (haukex@zero-g.net)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * @module */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/** A function to compare two items.
 *
 * @typeParam T The type that this comparator can compare, which must have sensible support for the equality operators.
 * @param ab A tuple of the two items to be compared; they must not be equal.
 * @returns Must return a Promise resolving to 0 if the first item is ranked higher, or 1 if the second item is ranked higher.
 */
export type Comparator<T extends NonNullable<unknown>> = (ab :Readonly<[a :T, b :T]>) => Promise<0|1>

/** Helper function to generate the group sizes for `_makeGroups`.
 * @internal */
export function* _groupSizes() :Generator<number, never, never> {
  // https://en.wikipedia.org/wiki/Merge-insertion_sort :
  // "... the sums of sizes of every two adjacent groups form a sequence of powers of two."
  // https://oeis.org/A014113 : a(0) = 0 and if n>=1, a(n) = 2^n - a(n-1).
  let prev = 0
  for (let i=1; ; i++) {
    const cur = 2**i - prev
    yield cur
    prev = cur
  }
}

/** Helper function to group and reorder items to be inserted via binary search.
 * @internal */
export function _makeGroups<T>(items :ReadonlyArray<T>) :[idx :number, item :T][] {
  // See the description in `_fordJohnson`.
  const gen = _groupSizes()
  let i = 0
  const rv :[number,T][] = []
  while (true) {
    const curGroupSize = gen.next().value
    const curGroup :[number,T][] = items.slice(i, i+curGroupSize).map((e,j) => [j+i+3,e])
    curGroup.reverse()
    rv.push(...curGroup)
    if (curGroup.length < curGroupSize) break
    i += curGroupSize
  }
  return rv
}

/** Helper function to insert an item into a sorted array via binary search.
 *
 * @param array The array into which to insert, is modified in place.
 * @param right The rightmost index of the range into which to insert, inclusive.
 * @param item The item to insert.
 * @param comparator The comparator to use.
 * @internal */
export async function _binInsert<T extends NonNullable<unknown>>(
  array :T[], right :number, item :T, comparator :Comparator<T>
) :Promise<void> {
  for (const e of array) if (e==item) throw new Error('item is already in target array')
  if (right < 0) throw new Error('right index may not be negative')
  //console.debug('insert',item,'into',array)
  let l = 0, r = Math.min(right, array.length-1)
  while (l <= r) {
    const m = Math.floor((l+r)/2)
    if (await comparator([ item, array[m]! ])) {
      //console.debug('left',l,'mid',m,'right',r,'comp',item,'<',array[m],'so move right down')
      r = m - 1
    }
    else {
      //console.debug('left',l,'mid',m,'right',r,'comp',item,'>',array[m],'so move left up')
      l = m + 1
    }
  }
  array.splice(l, 0, item)
  //console.debug('inserted',item,'before',l,'resulting in',array)
}

/** Wrap a comparator in a version that caches the comparisons.
 * See GH#1: I don't think this should be necessary; I think the correct solution is optimizing my `_binInsert`?
 * @internal */
export function _cachedComparator<T extends NonNullable<unknown>>(comp :Comparator<T>) :Comparator<T> {
  const cache :Map<T, Map<T, 0|1>> = new Map()
  return async ([a,b]) => {
    if (cache.has(a) && cache.get(a)!.has(b))
      return Promise.resolve(cache.get(a)!.get(b)!)
    if (cache.has(b) && cache.get(b)!.has(a))
      return Promise.resolve(cache.get(b)!.get(a)! ? 0 : 1)
    const rv = await comp([a, b])
    if (cache.has(a)) cache.get(a)!.set(b, rv)
    else cache.set(a, new Map([[b, rv]]))
    return rv
  }
}

/** Merge-Insertion Sort (Ford-Johnson algorithm) with async comparison.
 *
 * @typeParam T The type of the items to sort.
 * @param array Array of to sort. Duplicate items are not allowed.
 * @param comparator Async comparison function.
 * @returns The array sorted in ascending order.
 */
export default async function mergeInsertionSort<T extends NonNullable<unknown>>(
  array :ReadonlyArray<T>, comparator :Comparator<T>
) :Promise<T[]> {
  return _mergeInsertionSort(array, _cachedComparator(comparator))
}

/** @internal */
async function _mergeInsertionSort<T extends NonNullable<unknown>>(
  array :ReadonlyArray<T>, comparator :Comparator<T>
) :Promise<T[]> {
  if (array.length<1) return []
  if (array.length==1) return Array.from(array)
  if (array.length != new Set(array).size) throw new Error('array may not contain duplicate items')
  if (array.length==2) return await comparator([array[0]!, array[1]!]) ? Array.from(array) : [array[1]!, array[0]!]
  //console.debug('fordJohnson start', array)

  /* Algorithm description adapted from https://en.wikipedia.org/wiki/Merge-insertion_sort :
   * 1. Group the items into ⌊n/2⌋ pairs of elements, arbitrarily, leaving one element unpaired if there is
   *    an odd number of elements (this last part is actually handled below).
   * 2. Perform ⌊n/2⌋ comparisons, one per pair, to determine the larger of the two elements in each pair. */
  const pairs :Map<T, T> = new Map()  // keys are the larger items, values the smaller ones
  for ( let i=0; i<array.length-1; i+=2 ) {
    if (await comparator([array[i]!, array[i+1]!]))
      pairs.set(array[i+1]!, array[i]!)
    else
      pairs.set(array[i]!, array[i+1]!)
  }
  //console.debug('step 1+2: pairs', pairs)

  /* 3. Recursively sort the ⌊n/2⌋ larger elements from each pair, creating an initial sorted output sequence
   *    of ⌊n/2⌋ of the input elements, in ascending order, using the merge-insertion sort. */
  const results = await _mergeInsertionSort(Array.from(pairs.keys()), comparator)
  //console.debug('step 3: sorted larger items', results)

  /* 4. Insert at the start of the sorted sequence the element that was paired with
   *    the first and smallest element of the sorted sequence. */
  results.unshift( pairs.get(results[0]!)! )
  //console.debug('step 4: first pair', results)

  /* 5. Insert the remaining ⌈n/2⌉−1 items that are not yet in the sorted output sequence into that sequence,
   *    one at a time, with a specially chosen insertion ordering, as follows:
   *
   * Explanation: The items already in the sorted output sequence (the larger elements of each pair) are
   * labeled xᵢ and the yet unsorted (smaller) elements are labeled yᵢ, with i starting at 1. However, due
   * to step 4 above, the item that would have been labeled y₁ has actually already become element x₁, and
   * therefore the element that would have been x₁ is now x₂ and no longer has a paired yᵢ element. It
   * follows that the first paired elements are x₃ and y₃, and so the first unsorted element to be inserted
   * into the output sequence is y₃. Also, if the number of items to be sorted is odd, the "leftover" item
   * is placed at the end of the yᵢ items.
   *
   * a. Partition the un-inserted elements yᵢ into groups with contiguous indexes.
   *    There are two elements y₃ and y₄ in the first group, and the sums of sizes of every two adjacent
   *    groups form a sequence of powers of two. Thus, the sizes of groups are: 2, 2, 6, 10, 22, 42, ...
   * b. Order the un-inserted elements by their groups (smaller indexes to larger indexes), but within each
   *    group order them from larger indexes to smaller indexes. Thus, the ordering becomes:
   *      y₄, y₃, y₆, y₅, y₁₂, y₁₁, y₁₀, y₉, y₈, y₇, y₂₂, y₂₁, ...
   * c. Use this ordering to insert the elements yᵢ into the output sequence. For each element yᵢ,
   *    use a binary search from the start of the output sequence up to but not including xᵢ to determine
   *    where to insert yᵢ.
   */

  /* Skipping the smallest pair now at the beginning of the output sequence, get the remaining
   * items to be sorted (the smaller of each pair), in order (y₃, y₄, y₅, ...). */
  const remaining = results.slice(2).map( e => pairs.get(e)! )
  // If there was a leftover item from an odd input length, append that now.
  if (array.length%2) remaining.push(array[array.length-1]!)
  //console.debug('step pre5: smaller items',remaining)
  // Next, group and reorder the remaining items (steps a and b above).
  const groups = _makeGroups(remaining)
  //console.debug('step 5ab: groups',groups)
  // And insert those remaining items using a binary search (step c above).
  for (const [idx, item] of groups)
    await _binInsert(results, idx-1, item, comparator)

  //console.debug('fordJohnson done', results)
  return results
}

/** Returns the maximum number of comparisons that `mergeInsertionSort` will perform depending on the input length `n`.
 *
 * @param n The number of items in the list to be sorted.
 * @returns The expected maximum number of comparisons.
 */
export function mergeInsertionMaxComparisons(n :number) :number {
  if (n<0) throw new Error('must specify zero or more items')
  // formulas from https://en.wikipedia.org/wiki/Merge-insertion_sort (both of the following work):
  /*let C = 0
  for (let i=1; i<=n; i++)
    C += Math.ceil(Math.log2((3*i)/4))
  return C*/
  return n ? ( n*Math.ceil(Math.log2(3*n/4))
    - Math.floor((2**Math.floor(Math.log2(6*n)))/3)
    + Math.floor(Math.log2(6*n)/2) ) : 0
}

/* ***** The following are here because they is used in the tests of this module. ***** */

/** Generates permutations with [Heap's algorithm](https://en.wikipedia.org/wiki/Heap%27s_algorithm) (non-recursive).
 *
 * @typeParam T The type of the items to permute.
 * @param array The list of items to permute.
 * @returns A generator that returns the permutations.
 * @internal */
export function* permutations<T>(array :Readonly<T[]>) :Generator<T[]> {
  const c :number[] = array.map(_=>0)
  const a = Array.from(array)
  yield* [Array.from(a)]
  let i = 1
  while (i < a.length) {
    if (c[i]!<i) {
      const j = i%2 ? c[i]! : 0;
      [a[j], a[i]] = [a[i]!, a[j]!]
      yield* [Array.from(a)]
      c[i]!++
      i = 1
    } else c[i++] = 0
  }
}

/** Marsaglia, G. (2003). Xorshift RNGs. Journal of Statistical Software, 8(14), 1–6. https://doi.org/10.18637/jss.v008.i14
 * @internal */
export function* xorshift32() :Generator<number, never, never> {
  let y = BigInt(2463534242)
  while (true) {
    y ^= y << BigInt(13)
    y = BigInt.asUintN(32, y)
    y ^= y >> BigInt(17)
    y ^= y << BigInt(5)
    y = BigInt.asUintN(32, y)
    yield Number(y)
  }
}

/** In-place Fisher-Yates[1] shuffle, modern Durstenfeld[2] version.
 *
 * 1. Fisher, R. A., & Yates, F. (1948). Statistical tables for biological, agricultural and medical research (3rd ed., rev. and enl). Oliver and Boyd.
 * 2. Durstenfeld, R. (1964). Algorithm 235: Random permutation. Communications of the ACM, 7(7), 420. doi:10.1145/364520.364540
 *
 * @internal */
export function fisherYates(array :unknown[], random :Generator<number>|undefined = undefined) {
  if (random===undefined) random = xorshift32()
  for (let i=array.length-1; i>0; i--) {
    const j = random.next().value % array.length;
    [array[i], array[j]] = [array[j], array[i]]
  }
}
