export type GoogleActivityActionClass = 'read' | 'create' | 'update' | 'delete' | 'send' | 'open' | 'authorize';

export interface GoogleActivityEvent {
  id: string;
  timestamp: number;
  capabilityId: string;
  action: GoogleActivityActionClass;
  description: string;
  reversible: boolean;
  external: boolean;
}

export interface GoogleActivityRecorder {
  record(event: GoogleActivityEvent): void;
  list(limit?: number): readonly GoogleActivityEvent[];
  clear(): void;
}
