export type GoogleActivityActionClass = 'read' | 'create' | 'update' | 'delete' | 'send' | 'open' | 'authorize';

export interface GoogleActivityResourceReference { type: string; id: string; url?: string; }

export interface GoogleActivityEvent {
  id: string;
  timestamp: number;
  capabilityId: string;
  action: GoogleActivityActionClass;
  description: string;
  reversible: boolean;
  external: boolean;
  consequential: boolean;
  resource?: GoogleActivityResourceReference;
}

export interface GoogleActivityRecorder {
  record(event: GoogleActivityEvent): void;
  list(limit?: number): readonly GoogleActivityEvent[];
  clear(): void;
}
