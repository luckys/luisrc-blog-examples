import { integer, label } from './validation.ts'

type State = Readonly<{ term: number; votedFor: string | null; logTerm: number; logIndex: number }>
type Request = Readonly<{ candidate: string; term: number; logTerm: number; logIndex: number }>

function validLog(term: number, index: number) {
  integer(term)
  integer(index)
  if ((index === 0) !== (term === 0)) throw new Error('invalid_log')
}

// Only the voting rule. The caller must persist term/votedFor before replying.
export function voter(initial: State = { term: 0, votedFor: null, logTerm: 0, logIndex: 0 }) {
  integer(initial.term)
  validLog(initial.logTerm, initial.logIndex)
  if (initial.logTerm > initial.term) throw new Error('invalid_term')
  if (initial.term === 0 && initial.votedFor !== null) throw new Error('invalid_vote')
  if (initial.votedFor !== null) label(initial.votedFor)
  let state: State = Object.freeze({ ...initial })
  return {
    vote(request: Request): boolean {
      label(request.candidate)
      integer(request.term, 1)
      validLog(request.logTerm, request.logIndex)
      if (request.logTerm > request.term) throw new Error('invalid_term')
      if (request.term < state.term) return false
      if (request.term > state.term)
        state = Object.freeze({ ...state, term: request.term, votedFor: null })
      const upToDate = request.logTerm > state.logTerm ||
        (request.logTerm === state.logTerm && request.logIndex >= state.logIndex)
      if (!upToDate || (state.votedFor !== null && state.votedFor !== request.candidate)) return false
      state = Object.freeze({ ...state, votedFor: request.candidate })
      return true
    },
    snapshot: () => state,
  }
}
