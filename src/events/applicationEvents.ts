import type { MemoryScratchpadState, Message, WorkspaceArtifact } from '../types';

export type ApplicationEvent =
  | {
      type: 'message.sent';
      payload: {
        conversationId: string;
        message: Message;
      };
    }
  | {
      type: 'memory.changed';
      payload: {
        conversationId?: string;
        state: MemoryScratchpadState;
        reason: 'load' | 'save' | 'actions-applied' | 'recovery';
      };
    }
  | {
      type: 'artifact.changed';
      payload: {
        artifact: WorkspaceArtifact;
        action: 'created' | 'updated' | 'deleted';
      };
    }
  | {
      type: 'background.job.completed';
      payload: {
        jobId: string;
        conversationId?: string;
        status: string;
      };
    }
  | {
      type: 'google.authorization.changed';
      payload: {
        authorized: boolean;
        grantedScopes: string;
        reason: 'authorized' | 'revoked' | 'expired' | 'client-changed';
      };
    };

export type ApplicationEventType = ApplicationEvent['type'];

export type ApplicationEventOf<TType extends ApplicationEventType> = Extract<
  ApplicationEvent,
  { type: TType }
>;
