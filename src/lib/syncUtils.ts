import * as diff from 'diff';
import { SyncStatus } from '../types';

export function normalizeContent(content: string): string {
  return (content || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

export function hashString(str: string): string {
  const normalized = normalizeContent(str);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export interface SyncComparisonResult {
  identical: boolean;
  localChanged: boolean;
  remoteChanged: boolean;
  localHash: string;
  remoteHash: string;
  baselineHash?: string;
  status: SyncStatus;
}

export function compareSyncState(
  localContent: string,
  remoteContent: string,
  baselineHash?: string
): SyncComparisonResult {
  const localHash = hashString(localContent);
  const remoteHash = hashString(remoteContent);
  const identical = localHash === remoteHash;

  let localChanged = false;
  let remoteChanged = false;

  if (baselineHash) {
    localChanged = localHash !== baselineHash;
    remoteChanged = remoteHash !== baselineHash;
  } else if (!identical) {
    localChanged = true;
    remoteChanged = true;
  }

  let status: SyncStatus = 'unlinked';
  if (identical) status = 'synchronized';
  else if (baselineHash) {
    if (localChanged && !remoteChanged) status = 'local_ahead';
    else if (!localChanged && remoteChanged) status = 'remote_ahead';
    else status = 'conflict';
  } else status = 'linked';

  return { identical, localChanged, remoteChanged, localHash, remoteHash, baselineHash, status };
}

export type DiffLineType = 'context' | 'local_added' | 'remote_removed';

export interface DiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
  /** UI compatibility classification used by the read-only comparison surface. */
  type: DiffLineType;
}

export function computeLineDiff(oldContent: string, newContent: string): DiffResult[] {
  return diff.diffLines(normalizeContent(oldContent), normalizeContent(newContent)).map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
    type: part.added ? 'local_added' : part.removed ? 'remote_removed' : 'context',
  }));
}
