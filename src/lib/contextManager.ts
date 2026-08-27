/**
 * Transitional compatibility façade.
 *
 * Context assembly and retrieval state are owned by chatContextService.
 * New code must import that application service directly; this module exists
 * only so older consumers can migrate without changing runtime semantics in
 * the same commit.
 */
export {
  ACTIVE_SCRATCHPAD_KEY,
  USER_PROFILE_NOTES_KEY,
  loadActiveScratchpad,
  saveActiveScratchpad,
  appendActiveScratchpad,
  clearActiveScratchpad,
  loadUserProfileNotes,
  saveUserProfileNotes,
  appendUserProfileNotes,
  clearUserProfileNotes,
  getLastMemoryRetrievalTrace,
  setNextMemoryRetrievalQuery,
  clearNextMemoryRetrievalQuery,
  buildSystemPayload,
} from '../services/chatContextService';

export type { SystemPayloadOptions } from '../services/chatContextService';
export type { MemoryRetrievalTrace } from './memoryRetrieval';
