// Compatibility shim only. The local reference archive implementation lives in src/services/referenceArchiveService.ts.
export {
  createReferenceNote as createKeepNote,
  searchReferenceNotes as searchKeepNotes,
  listReferenceNotes as listKeepNotes,
  getReferenceNote as getKeepNote,
  updateReferenceNote as updateKeepNote,
  deleteReferenceNote as deleteKeepNote,
  loadLocalReferenceArchive as loadLocalKeepArchive,
  saveLocalReferenceArchive as saveLocalKeepArchive,
  copyCanvasToReference as copyCanvasToKeep,
} from '../services/referenceArchiveService';
export type { ReferenceNoteItem as KeepNoteItem } from '../services/referenceArchiveService';
