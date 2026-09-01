import { runResilientGeminiInteractionTurn } from './geminiInteractionsRuntime';
import type { InteractionRuntimeOptions, InteractionRuntimeResult } from './geminiInteractionsRuntime';
import { isGemini3Model } from './modelRegistry';

export type { InteractionRuntimeOptions, InteractionRuntimeResult } from './geminiInteractionsRuntime';
export interface ResilientStreamTurnResult extends InteractionRuntimeResult {}
export interface ResilientStreamTurnOptions extends InteractionRuntimeOptions {}

/** Canonical production entry point retained for callers while transport is now Interactions API-only. */
export async function runResilientGeminiStreamTurn(options: ResilientStreamTurnOptions): Promise<ResilientStreamTurnResult> {
  return runResilientGeminiInteractionTurn(options);
}

/** Compatibility helper retained only for historical tests/consumers; production does not normalize GenerateContent history. */
export function normalizeGeminiToolHistory(contents: any[]): any[] {
  for (const content of contents) if (content?.role === 'tool') content.role = 'user';
  return contents;
}

function hasThoughtSignature(part: any): boolean {
  return (typeof part?.thoughtSignature === 'string' && part.thoughtSignature.length > 0)
    || (typeof part?.thought_signature === 'string' && part.thought_signature.length > 0);
}

function validationError(model: string, message: string): Error {
  const error = new Error(message);
  (error as any).apiError = { code: 'INVALID_REQUEST_400', httpStatus: 400, modelId: model, message, retryable: false, rawMessage: message };
  return error;
}

/** Compatibility-only Gemini 3 validator retained for regression coverage; it is not used by the Interactions production path. */
export function validateGeminiToolHistory(contents: any[], model: string): void {
  if (!isGemini3Model(model)) return;
  let currentModelTurnIndex = -1;
  for (let index = contents.length - 1; index >= 0; index -= 1) {
    const content = contents[index];
    if (content?.role === 'model' && Array.isArray(content.parts) && content.parts.some((part: any) => part?.functionCall)) {
      currentModelTurnIndex = index;
      break;
    }
  }
  if (currentModelTurnIndex < 0) return;

  const currentCalls = contents[currentModelTurnIndex].parts.filter((part: any) => part?.functionCall);
  if (!hasThoughtSignature(currentCalls[0])) throw validationError(model, 'Gemini 3 rejected the tool turn because the original first function-call thought signature was not preserved.');

  const callIds = new Set<string>();
  for (const part of currentCalls) {
    const id = part?.functionCall?.id;
    if (typeof id !== 'string' || !id) throw validationError(model, 'Gemini 3 function-call history is missing a function-call id.');
    callIds.add(id);
  }

  for (let index = currentModelTurnIndex + 1; index < contents.length; index += 1) {
    const content = contents[index];
    if (content?.role !== 'user' || !Array.isArray(content.parts)) break;
    for (const part of content.parts.filter((item: any) => item?.functionResponse)) {
      const responseId = part.functionResponse?.id;
      if (typeof responseId !== 'string' || !callIds.has(responseId)) throw validationError(model, 'Gemini 3 function-response id does not match a function-call id from the preceding model turn.');
    }
  }

  for (let index = currentModelTurnIndex + 1; index < contents.length; index += 1) {
    const content = contents[index];
    if (content?.role !== 'model' || !Array.isArray(content.parts) || !content.parts.some((part: any) => part?.functionCall)) continue;
    const calls = content.parts.filter((part: any) => part?.functionCall);
    if (!hasThoughtSignature(calls[0])) throw validationError(model, 'Gemini 3 rejected a sequential function-call turn because its original thought signature was not preserved.');
    for (const part of calls) {
      const id = part?.functionCall?.id;
      if (typeof id !== 'string' || !id) throw validationError(model, 'Gemini 3 sequential function-call history is missing a function-call id.');
    }
  }
}
