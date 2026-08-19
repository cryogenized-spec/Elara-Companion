import express from "express";
import { getGeminiClient, formatApiErrorDetails, normalizeModelName, HarmCategory, HarmBlockThreshold } from "../services/gemini";
import {
  buildConversationContents,
  buildRuntimeConfig,
  executeAgentToolCall,
  mergeTouchedArtifactIds,
  MAX_AGENT_ITERATIONS,
} from "../../src/lib/chatRuntime";

export function setupChatRoutes(app: express.Express) {
  app.post('/api/chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { message, image, history = [], systemPrompt, model, temperature, maxOutputTokens, topP, topK, thinkingBudget, thinkingLevel, workspace, googleToken } = req.body;
    const requestedModelStr = (typeof model === 'string' && model.trim()) ? model.trim() : (process.env.GEMINI_MODEL || 'gemini-3.7-flash');
    const selectedModel = normalizeModelName(requestedModelStr);
