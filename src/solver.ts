import { applyMove, enumerateMoves, isSolved, serializeState } from './puzzle'
import type { Move, PuzzleState, Solution } from './types'

interface VisitedEntry {
  readonly previousKey: string | null
  readonly move: Move | null
  readonly state: PuzzleState
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
  const visited = new Map<string, VisitedEntry>([
    [startKey, { previousKey: null, move: null, state: initial }],
  ])

  while (queueHead < queue.length) {
    const { state: current, key: currentKey } = queue[queueHead]
    queueHead += 1

    if (isSolved(current)) {
      return reconstructSolution(visited, currentKey)
    }

    for (const move of enumerateMoves(current)) {
      const nextState = applyMove(current, move)
      const nextKey = serializeState(nextState)
      if (visited.has(nextKey)) {
        continue
      }
      visited.set(nextKey, {
        previousKey: currentKey,
        move,
        state: nextState,
      })
      queue.push({ key: nextKey, state: nextState })
    }

    // Array#shift reindexes every remaining state. Periodic compaction keeps
    // dequeue O(1) while releasing references to states already explored.
    if (queueHead >= QUEUE_COMPACTION_THRESHOLD) {
      queue = queue.slice(queueHead)
      queueHead = 0
    }
  }

  return null
}

function reconstructSolution(
  visited: Map<string, VisitedEntry>,
  goalKey: string
): Solution {
  const states: PuzzleState[] = []
  const moves: Move[] = []

  let currentKey: string | null = goalKey

  while (currentKey) {
    const entry = visited.get(currentKey)
    if (!entry) {
      throw new Error('Inconsistent visited map during reconstruction')
    }
    states.push(entry.state)
    if (entry.move) {
      moves.push(entry.move)
    }
    currentKey = entry.previousKey
  }

  states.reverse()
  moves.reverse()

  return { states, moves }
}
