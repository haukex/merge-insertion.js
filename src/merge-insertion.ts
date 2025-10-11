/** Merge-Insertion Sort a.k.a. Ford-Johnson Algorithm
 * ===================================================
 *
 * The Ford-Johnson algorithm[1], also known as the merge-insertion sort[2,3] uses the minimum
 * number of possible comparisons for lists of 22 items or less, and at the time of writing has
 * the fewest comparisons known for lists of 46 items or less. It is therefore very well suited
 * for cases where comparisons are expensive, such as user input, and the API is implemented to
 * take an async comparator function for this reason.
 *
 * ### Example
 *
 * ```typescript
 * import { mergeInsertionSort, Comparator } from 'merge-insertion'
 *
 * // A Comparator must return 0 if the first item is larger, or 1 if the second item is larger.
 * const comp :Comparator<string> = async ([a, b]) => a > b ? 0 : 1
 *
 * // Sort five items in ascending order with a maximum of only seven comparisons:
 * const sorted = await mergeInsertionSort(['D', 'A', 'B', 'E', 'C'], comp)
 * ```
 *
 * ### References
 *
 * 1. Ford, L. R., & Johnson, S. M. (1959). A Tournament Problem.
 *    The American Mathematical Monthly, 66(5), 387-389. <https://doi.org/10.1080/00029890.1959.11989306>
 * 2. Knuth, D. E. (1998). The Art of Computer Programming: Volume 3: Sorting and Searching (2nd ed.).
 *    Addison-Wesley. <https://cs.stanford.edu/~knuth/taocp.html#vol3>
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

/** Turns on debugging output. */
const DEBUG :boolean = false

/** A type of object that can be compared by a {@link Comparator} and therefore sorted by {@link mergeInsertionSort}.
 * Must have sensible support for the equality operators. */
export type Comparable = NonNullable<unknown>

/** A user-supplied function to compare two items.
 *
 * @param ab A tuple of the two items to be compared; they must not be equal.
 * @returns Must return a Promise resolving to 0 if the first item is ranked higher, or 1 if the second item is ranked higher.
 */
export type Comparator<T extends Comparable> = (ab :Readonly<[a :T, b :T]>) => Promise<0|1>

/** Helper that generates the group sizes for {@link _makeGroups}.
 * @internal */
export function* _groupSizes() :Generator<number, never, never> {
  // <https://en.wikipedia.org/wiki/Merge-insertion_sort>:
  // "... the sums of sizes of every two adjacent groups form a sequence of powers of two."
  // <https://oeis.org/A014113>: a(0) = 0 and if n>=1, a(n) = 2^n - a(n-1).
  let prev = 0
  for (let i=1; ; i++) {
    const cur = 2**i - prev
    yield cur
    prev = cur
  }
}

/** Helper function to group and reorder items to be inserted via binary search.
 * See also the description in the code of {@link mergeInsertionSort}.
 * @internal */
export function _makeGroups<T>(array :ReadonlyArray<T>) :[origIdx :number, item :T][] {
  const items :ReadonlyArray<[number, T]> = array.map((e,i) => [i, e])
  const rv :[number,T][] = []
  const gen = _groupSizes()
  let i = 0
  while (true) {
    const size = gen.next().value
    const group = items.slice(i, i+size)
    group.reverse()
    rv.push(...group)
    if (group.length < size) break
    i += size
  }
  return rv
}

/** Helper function to insert an item into a sorted array via binary search.
 * @returns The index **before** which to insert the new item, e.g. `array.splice(index, 0, item)`.
 * @internal */
export async function _binInsertIdx<T extends Comparable>(array :ReadonlyArray<T>, item :T, comp :Comparator<T>) :Promise<number> {
  if (array.length<1) return 0
  if (array.indexOf(item)>=0) throw new Error('item is already in target array')
  if (array.length==1) return await comp([ item, array[0]! ]) ? 0 : 1
  /* istanbul ignore next */ if (DEBUG) console.debug('binary insert',item,'into',array)
  let l = 0, r = array.length-1
  while (l <= r) {
    const m = l + Math.floor((r-l)/2)
    const c = await comp([item, array[m]!])
    /* istanbul ignore next */ if (DEBUG) console.debug('left',l,'mid',m,'right',r,'item',item,c?'<':'>','array[m]',array[m])
    if (c) r = m - 1
    else l = m + 1
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
  /* istanbul ignore next */ if (DEBUG) console.debug('insert', l===0?'at start':l===array.length?'at end':`before [${l}] '${array[l]}'`)
  return l
}

/** Merge-Insertion Sort (Ford-Johnson algorithm) with async comparison.
 *
 * @typeParam T The type of the items to sort.
 * @param array Array of to sort. Duplicate items are not allowed.
 * @param comparator Async comparison function.
 * @returns A Promise resolving to a shallow copy of the array sorted in ascending order.
 */
export async function mergeInsertionSort<T extends Comparable>(array :ReadonlyArray<T>, comparator :Comparator<T>) :Promise<T[]> {
  if (array.length<1) return []
  if (array.length==1) return Array.from(array)
  if (array.length != new Set(array).size) throw new Error('array may not contain duplicate items')
  if (array.length==2) return await comparator([array[0]!, array[1]!]) ? Array.from(array) : [array[1]!, array[0]!]
  /* istanbul ignore next */ if (DEBUG) console.debug('fordJohnson start', array)

  /* Algorithm description adapted and expanded from <https://en.wikipedia.org/wiki/Merge-insertion_sort>:
   * 1. Group the items into ⌊n/2⌋ pairs of elements, arbitrarily, leaving one element unpaired if there is an odd number of elements.
   * 2. Perform ⌊n/2⌋ comparisons, one per pair, to determine the larger of the two elements in each pair. */
  const pairs :Map<T, T> = new Map()  // keys are the larger items, values the smaller ones
  for ( let i=0; i<array.length-1; i+=2 ) {
    if (await comparator([array[i]!, array[i+1]!]))
      pairs.set(array[i+1]!, array[i]!)
    else
      pairs.set(array[i]!, array[i+1]!)
  }
  /* istanbul ignore next */ if (DEBUG) console.debug('step 1+2: pairs', pairs)

  /* 3. Recursively sort the ⌊n/2⌋ larger elements from each pair, creating an initial sorted output sequence
   *    of ⌊n/2⌋ of the input elements, in ascending order, using the merge-insertion sort. */
  const larger = await mergeInsertionSort(Array.from(pairs.keys()), comparator)
  /* istanbul ignore next */ if (DEBUG) console.debug('step 3: larger items sorted',larger)

  // Build the "main chain" data structure we will use to insert items into (explained a bit more below).
  interface SortingPair { item :T; smaller ?:T }
  const mainChain :SortingPair[] = larger.map( l => ({ item: l, smaller: pairs.get(l)! }) )
  /* istanbul ignore next */ if (DEBUG) console.debug('step 3a: initial main chain',mainChain)

  /* 4. Insert at the start of the sorted sequence the element that was paired with
   *    the first and smallest element of the sorted sequence. */
  // Note that we know the main chain has at least one item here due to the special cases at the beginning of this function.
  mainChain.unshift({ item: mainChain[0]!.smaller! })
  delete mainChain[1]!.smaller
  /* istanbul ignore next */ if (DEBUG) console.debug('step 4: first pair', mainChain)

  /* 5. Insert the remaining ⌈n/2⌉−1 items that are not yet in the sorted output sequence into that sequence,
   *    one at a time, with a specially chosen insertion ordering, as follows:
   *
   * a. Partition the un-inserted elements yᵢ into groups with contiguous indexes.
   *    There are two elements y₃ and y₄ in the first group¹, and the sums of sizes of every two adjacent
   *    groups form a sequence of powers of two. Thus, the sizes of groups are: 2, 2, 6, 10, 22, 42, ...
   * b. Order the un-inserted elements by their groups (smaller indexes to larger indexes), but within each
   *    group order them from larger indexes to smaller indexes. Thus, the ordering becomes:
   *      y₄, y₃, y₆, y₅, y₁₂, y₁₁, y₁₀, y₉, y₈, y₇, y₂₂, y₂₁, ...
   * c. Use this ordering to insert the elements yᵢ into the output sequence. For each element yᵢ,
   *    use a binary search from the start of the output sequence up to but not including xᵢ to determine
   *    where to insert yᵢ.²
   *
   * ¹ My explanation: The items already in the sorted output sequence (the larger elements of each pair) are
   * labeled xᵢ and the yet unsorted (smaller) elements are labeled yᵢ, with i starting at 1. However, due
   * to step 4 above, the item that would have been labeled y₁ has actually already become element x₁, and
   * therefore the element that would have been x₁ is now x₂ and no longer has a paired yᵢ element. It
   * follows that the first paired elements are x₃ and y₃, and so the first unsorted element to be inserted
   * into the output sequence is y₃. Also noteworthy is that if the input had an odd number of elements,
   * the leftover unpaired element is treated as the last yᵢ element.
   *
   * ² In my opinion, this is lacking detail, and this seems to be true for the other two sources (Ford-Johnson
   * and Knuth) as well. So here is my attempt at adding more details to the explanation: The "main chain" is
   * always kept in sorted order, therefore, for each item of the main chain that has an associated `smaller`
   * item, we know that this smaller item must be inserted *before* that main chain item. The problem I see
   * with the various descriptions is that they don't explicitly explain that the insertion process shifts all
   * the indices of the array, and due to the nonlinear insertion order, this makes it tricky to keep track of
   * the correct array indices over which to perform the insertion search. So instead, below, I use a linear
   * search to find the main chain item being operated on each time, which is expensive, but much easier. It
   * should also be noted that the leftover unpaired element, if there is one, gets inserted across the whole
   * main chain as it exists at the time of its insertion - it may not be inserted last. So even though there
   * is still some optimization potential, this algorithm is used in cases where the comparisons are much more
   * expensive than the rest of the algorithm, so the cost is acceptable for now.
   */

  // Build the groups to be inserted (explained above), skipping the already handled first two items.
  const toInsert = mainChain.slice(2)
  /* If there was a leftover item from an odd input length, treat it as the last "smaller" item. We'll use the
   * fact that at this point, all items in `toInsert` have their `.smaller` property set, so we'll mark the
   * leftover item as a special case by storing it in `.item` and it not having its `.smaller` set. */
  if (array.length%2) toInsert.push({ item: array[array.length - 1]! })
  // Make the groups; in the current implementation we don't need the original indices returned here.
  const groups = _makeGroups(toInsert).map(g=>g[1])
  /* istanbul ignore next */ if (DEBUG) console.debug('step pre5: groups',groups)

  for (const pair of groups) {
    // Determine which item to insert and where.
    const [insertItem, insertIdx] :[T, number] = await (async () => {
      if (pair.smaller===undefined)  // See explanation of this special case above.
        // This is the leftover item, it gets inserted into the current whole main chain.
        return [pair.item, await _binInsertIdx(mainChain.map(p => p.item), pair.item, comparator)]
      else {
        // Locate the pair we're about to insert in the main chain, to limit the extent of the binary search (see also explanation above).
        const pairIdx = mainChain.findIndex(v => Object.is(v, pair))
        // Locate the index in the main chain where the pair's smaller item needs to be inserted, and insert it.
        return [pair.smaller, await _binInsertIdx(mainChain.slice(0,pairIdx).map(p => p.item), pair.smaller, comparator)]
      }
    })()
    // Actually do the insertion.
    mainChain.splice(insertIdx, 0, { item: insertItem })
    delete pair.smaller
    /* istanbul ignore next */ if (DEBUG) console.debug('inserted',insertItem,'at index',insertIdx,'main chain is now',mainChain)
  }

  /* istanbul ignore next */ if (DEBUG) console.debug('fordJohnson done', mainChain)
  // Turn the "main chain" data structure back into an array of values.
  return mainChain.map( pair => pair.item )
}

/** Returns the maximum number of comparisons that {@link mergeInsertionSort} will perform depending on the input length.
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

/* ***** The following are here because they are used in the tests of this module. ***** */

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
 * @param random Generator that returns random integers in the range `0` (inclusive) and `>= array.length-1`.
 * @internal */
export function fisherYates(array :unknown[], random :Generator<number>) {
  for (let i=array.length-1; i>0; i--) {
    const j = random.next().value % array.length;
    [array[i], array[j]] = [array[j], array[i]]
  }
}
