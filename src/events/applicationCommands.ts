import type { MemoryAction, MemoryScratchpadState, WorkspaceArtifact } from '../types';

export type ApplicationCommand =
  | { type: 'message.send'; payload: { conversationId: string; messageId: string } }
  | { type: 'memory.apply-actions'; payload: { conversationId?: string; state: MemoryScratchpadState; actions: MemoryAction[] } }
  | { type: 'artifact.modify'; payload: { artifactId: string; patch: Partial<WorkspaceArtifact> } }
  | { type: 'background.complete'; payload: { jobId: string } }
  | { type: 'google.authorize'; payload: { capability?: string } };

export type ApplicationCommandType = ApplicationCommand['type'];
export type ApplicationCommandOf<TType extends ApplicationCommandType> = Extract<ApplicationCommand, { type: TType }>;

type CommandHandler<TCommand extends ApplicationCommand> = (command: TCommand) => void | Promise<void>;
type CommandHandlerMap = Partial<Record<ApplicationCommandType, CommandHandler<ApplicationCommand>>>;

const handlers: CommandHandlerMap = {};

export function registerApplicationCommand<TType extends ApplicationCommandType>(
  type: TType,
  handler: CommandHandler<ApplicationCommandOf<TType>>,
): () => void {
  handlers[type] = handler as CommandHandler<ApplicationCommand>;
  return () => {
    if (handlers[type] === handler) delete handlers[type];
  };
}

export async function dispatchApplicationCommand<TCommand extends ApplicationCommand>(command: TCommand): Promise<void> {
  const handler = handlers[command.type] as CommandHandler<TCommand> | undefined;
  if (!handler) throw new Error(`No handler registered for application command: ${command.type}`);
  await handler(command);
}

export function clearApplicationCommandHandlers(): void {
  for (const key of Object.keys(handlers) as ApplicationCommandType[]) delete handlers[key];
}
