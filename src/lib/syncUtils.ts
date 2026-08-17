import * as diff from 'diff';
import { WorkspaceArtifact, SyncStatus } from '../types';

export function normalizeContent(content: string): string {
  // Normalize line endings to \n, remove trailing whitespace per line, and trim the entire string.
  return (content || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Super simple and fast synchronous string hash function (djb2).
 * For short to medium documents, this is perfectly adequate for equality checks.
 */
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
  } else {
    // If no baseline, assume any difference means both changed or unlinked behavior.
    if (!identical) {
      localChanged = true;
      remoteChanged = true;
    }
  }

  let status: SyncStatus = 'unlinked';

  if (identical) {
    status = 'synchronized';
  } else if (localChanged && !remoteChanged) {
    status = 'local_ahead';
  } else if (!localChanged && remoteChanged) {
    status = 'remote_ahead';
  } else if (localChanged && remoteChanged) {
    status = 'conflict';
  }

  return {
    identical,
    localChanged,
    remoteChanged,
    localHash,
    remoteHash,
    baselineHash,
    status
  };
}

export interface DiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function computeLineDiff(oldContent: string, newContent: string): DiffResult[] {
  return diff.diffLines(normalizeContent(oldContent), normalizeContent(newContent));
}
