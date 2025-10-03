/** Tests for merge-insertion.ts
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
 */
import mergeInsertionSort, { _binInsert, _groupSizes, _makeGroups, Comparator, mergeInsertionMaxComparisons, permutations } from '../merge-insertion'
import { expect, test } from '@jest/globals'

test('smoke', async () => {
  expect( await mergeInsertionSort(['D','E','A','C','F','B'],
    testComparator(([a,b]) => Promise.resolve(a>b?0:1), mergeInsertionMaxComparisons(6))) )
    .toStrictEqual(['A','B','C','D','E','F'])
})

test('_groupSizes', async () => {
  // https://oeis.org/A014113 "a(n) = a(n-1) + 2*a(n-2) with a(0)=0, a(1)=2." (skipping the initial zero)
  const exp = [ 2, 2, 6, 10, 22, 42, 86, 170, 342, 682, 1366, 2730, 5462, 10922, 21846, 43690,
    87382, 174762, 349526, 699050, 1398102, 2796202, 5592406, 11184810, 22369622, 44739242,
    89478486, 178956970, 357913942, 715827882, 1431655766, 2863311530, 5726623062, 11453246122 ]
  const got :number[] = []
  const gen = _groupSizes()
  for (let i=0;i<exp.length;i++)
    got.push(gen.next().value)
  expect(got).toStrictEqual(exp)
})

test('_makeGroups', async () => {
  expect( _makeGroups(['y3','y4','y5','y6','y7','y8','y9','y10','y11','y12','y21','y22']) )
    .toStrictEqual([[4,'y4'], [3,'y3'], [6,'y6'], [5,'y5'], [12,'y12'],
      [11,'y11'], [10,'y10'], [9,'y9'], [8,'y8'], [7,'y7'], [14,'y22'], [13,'y21']])
})

test('_cachedComparator', async () => {
  //TODO NEXT
})

test('_binInsert', async () => {
  const helper = async (len :number, item :string) => {
    //        A B C D E F G H I J K
    const a = ['B','D','F','H','J'].slice(0,len)
    await _binInsert(a, 3, item, ([a,b]) => Promise.resolve(a>b?0:1))
    return a
  }
  expect( await helper(0,'A') ).toStrictEqual(['A'])
  expect( await helper(1,'A') ).toStrictEqual(['A','B'])
  expect( await helper(1,'C') ).toStrictEqual(['B','C'])
  expect( await helper(2,'A') ).toStrictEqual(['A','B','D'])
  expect( await helper(2,'C') ).toStrictEqual(['B','C','D'])
  expect( await helper(2,'E') ).toStrictEqual(['B','D','E'])
  expect( await helper(5,'A') ).toStrictEqual(['A','B','D','F','H','J'])
  expect( await helper(5,'E') ).toStrictEqual(['B','D','E','F','H','J'])
  expect( await helper(5,'I') ).toStrictEqual(['B','D','F','H','I','J'])
  expect( await helper(5,'K') ).toStrictEqual(['B','D','F','H','K','J'])
  expect( await helper(5,'M') ).toStrictEqual(['B','D','F','H','M','J'])
  await expect( helper(5,'J') ).rejects.toThrow('already in')
})

function testComparator<T extends NonNullable<unknown>>(comp :Comparator<T>, maxCalls :number) :Comparator<T> {
  let callCount = 0
  const pairMap :Map<T, Map<T, null>> = new Map()
  return async ([a,b]) => {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
    if (a==b) throw new Error(`a and b may not be equal ('${a}')`)
    if (pairMap.get(a)?.has(b) || pairMap.get(b)?.has(a))
      // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      throw new Error(`duplicate comparison of '${a}' and '${b}'`)
    if (pairMap.has(a)) pairMap.get(a)?.set(b, null)
    else pairMap.set(a, new Map([[b, null]]))
    if (++callCount > maxCalls) throw new Error(`too many Comparator calls (${callCount})`)
    return await comp([a,b])
  }
}

test('testComparator', async () => {
  const comp = testComparator(async _ab=>0, 2)
  await comp(['x','y'])
  await comp(['x','z'])
  await expect( comp(['x','x']) ).rejects.toThrow('may not be equal')
  await expect( comp(['y','x']) ).rejects.toThrow('duplicate comparison')
  await expect( comp(['x','y']) ).rejects.toThrow('duplicate comparison')
  await expect( comp(['x','z']) ).rejects.toThrow('duplicate comparison')
  await expect( comp(['i','j']) ).rejects.toThrow('too many')
})

test('mergeInsertionSort', async () => {
  // 6! = 720, 7! = 5040 - already takes a fair amount of time, so don't increase this!
  const comp :Comparator<string> = ([a,b]) => Promise.resolve(a>b?0:1)
  for(let listLength=0; listLength<6; listLength++) {
    const array :Readonly<string[]> = Array.from({ length: listLength }, (_,i) => String.fromCharCode(65 + i))
    for (const perm of permutations(array))
      expect( await mergeInsertionSort(perm, testComparator(comp, mergeInsertionMaxComparisons(listLength))) ).toStrictEqual(array)
  }
  //TODO: more tests 8! = 40320, 9! = 362880
  await expect( mergeInsertionSort(['A','B','B'], comp) ).rejects.toThrow('duplicate')
})

test('mergeInsertionMaxComparisons', () => {
  // https://oeis.org/A001768 "Sorting numbers: number of comparisons for merge insertion sort of n elements." (plus 0=0)
  const exp = [ 0, 0, 1, 3, 5, 7, 10, 13, 16, 19, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66,
    71, 76, 81, 86, 91, 96, 101, 106, 111, 116, 121, 126, 131, 136, 141, 146, 151, 156, 161,
    166, 171, 177, 183, 189, 195, 201, 207, 213, 219, 225, 231, 237, 243, 249, 255 ]
  expect( exp.map((_,i)=>mergeInsertionMaxComparisons(i)) ).toStrictEqual(exp)
  expect( ()=>mergeInsertionMaxComparisons(-1) ).toThrow('zero or more')
})

test('permutations', () => {
  expect( Array.from(permutations([])) ).toStrictEqual([ [] ])
  expect( Array.from(permutations(['A'])) ).toStrictEqual([ ['A'] ])
  expect( Array.from(permutations(['A','B'])) ).toStrictEqual([ ['A','B'],['B','A'] ])
  expect( Array.from(permutations(['A','B','C'])) ).toStrictEqual([
    ['A','B','C'],['B','A','C'],['C','A','B'],['A','C','B'],['B','C','A'],['C','B','A'] ])
  expect( Array.from(permutations(['A','B','C','D'])) ).toStrictEqual([
    ['A','B','C','D'],['B','A','C','D'],['C','A','B','D'],['A','C','B','D'],['B','C','A','D'],['C','B','A','D'],
    ['D','B','A','C'],['B','D','A','C'],['A','D','B','C'],['D','A','B','C'],['B','A','D','C'],['A','B','D','C'],
    ['A','C','D','B'],['C','A','D','B'],['D','A','C','B'],['A','D','C','B'],['C','D','A','B'],['D','C','A','B'],
    ['D','C','B','A'],['C','D','B','A'],['B','D','C','A'],['D','B','C','A'],['C','B','D','A'],['B','C','D','A'] ])
})
