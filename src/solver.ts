import { applyMove, enumerateMoves, isSolved, serializeState } from './puzzle'
import type { Move, PuzzleState, Solution } from './types'

interface ParentEntry {
  readonly previousKey: string | null
  readonly move: Move | null
}

interface QueueEntry {
  readonly key: string
  readonly state: PuzzleState
}

const QUEUE_COMPACTION_THRESHOLD = 4_096

export function solve(initial: PuzzleState): Solution | null {
  const startKey = serializeState(initial)
  let queue: QueueEntry[] = [{ key: startKey, state: initial }]
  let queueHead = 0
  const parents = new Map<string, ParentEntry>([
    [startKey, { previousKey: null, move: null }],
  ])

  while (queueHead < queue.length) {
    const currentEntry = queue[queueHead]
    queueHead += 1

    const current = currentEntry.state
    if (isSolved(current)) {
      return reconstructSolution(initial, startKey, parents, currentEntry.key)
    }

    for (const move of enumerateMoves(current)) {
      const nextState = applyMove(current, move)
      const nextKey = serializeState(nextState)
      if (parents.has(nextKey)) {
        continue
      }

      parents.set(nextKey, {
        previousKey: currentEntry.key,
        move,
      })
      queue.push({ key: nextKey, state: nextState })
    }

    if (queueHead >= QUEUE_COMPACTION_THRESHOLD) {
      queue = queue.slice(queueHead)
      queueHead = 0
    }
  }

  return null
}

function reconstructSolution(
  initial: PuzzleState,
  startKey: string,
  parents: Map<string, ParentEntry>,
  goalKey: string
): Solution {
  const moves: Move[] = []

  let currentKey: string | null = goalKey
  while (currentKey && currentKey !== startKey) {
    const entry = parents.get(currentKey)
    if (!entry || !entry.move) {
      throw new Error('Inconsistent previous map during reconstruction')
    }
    moves.push(entry.move)
    currentKey = entry.previousKey
  }

  moves.reverse()

  const states: PuzzleState[] = [initial]
  let currentState = initial
  for (const move of moves) {
    currentState = applyMove(currentState, move)
    states.push(currentState)
  }

  return { states, moves }
}
