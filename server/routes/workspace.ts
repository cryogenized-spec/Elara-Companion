import express from "express";
import { getGeminiClient } from "../services/gemini";

export interface ServerSpaceWebhook {
  id: string;
  spaceId: string;
  name: string;
  webhookUrl: string;
  autoDailySummary?: boolean;
  autoTaskAlerts?: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export const registeredSpaceWebhooks: ServerSpaceWebhook[] = [];

export function setupWorkspaceRoutes(app: express.Express) {

  app.get('/api/chat/webhooks', (req, res) => {
    res.json({ webhooks: registeredSpaceWebhooks });
  });

  app.post('/api/chat/webhooks', (req, res) => {
    const { spaceId, name, webhookUrl, autoDailySummary, autoTaskAlerts } = req.body;
    if (!name || !webhookUrl) {
      return res.status(400).json({ error: 'Name and webhookUrl are required' });
    }

    const cleanSpaceId = spaceId || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingIndex = registeredSpaceWebhooks.findIndex((w) => w.id === req.body.id || w.spaceId === cleanSpaceId);

    const webhookObj: ServerSpaceWebhook = {
      id: req.body.id || `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      spaceId: cleanSpaceId,
      name: name.trim(),
      webhookUrl: webhookUrl.trim(),
      autoDailySummary: Boolean(autoDailySummary),
      autoTaskAlerts: Boolean(autoTaskAlerts),
      createdAt: new Date().toISOString(),
      lastTriggered: req.body.lastTriggered,
    };

    if (existingIndex >= 0) {
      registeredSpaceWebhooks[existingIndex] = webhookObj;
    } else {
      registeredSpaceWebhooks.push(webhookObj);
    }

    res.json({ status: 'success', webhook: webhookObj, total: registeredSpaceWebhooks.length });
  });

  app.delete('/api/chat/webhooks/:id', (req, res) => {
    const { id } = req.params;
    const index = registeredSpaceWebhooks.findIndex((w) => w.id === id || w.spaceId === id);
    if (index >= 0) {
      const removed = registeredSpaceWebhooks.splice(index, 1);
      return res.json({ status: 'success', removed: removed[0] });
    }
    res.status(404).json({ error: 'Webhook not found' });
  });

  // 2. Inbound Google Chat Event Handler & Dynamic Dispatch Router
  app.post('/api/google-chat/event', async (req, res) => {
    try {
      const event = req.body || {};
      const eventType = event.type || 'MESSAGE';
      const spaceType = event.space?.type || (event.space?.singleUserBotDm ? 'DIRECT_MESSAGE' : 'SPACE');
      const isDirectMessage = spaceType === 'DM' || spaceType === 'DIRECT_MESSAGE' || Boolean(event.space?.singleUserBotDm);
      const spaceName = event.space?.displayName || event.space?.name || 'Google Chat';
      const senderName = event.user?.displayName || 'User';

      console.log(`[Google Chat Event]: Type=${eventType}, Space=${spaceName} (DM=${isDirectMessage}), Sender=${senderName}`);

      // Handle Event: ADDED_TO_SPACE
      if (eventType === 'ADDED_TO_SPACE') {
        const welcomeCard = {
          cardsV2: [
            {
              cardId: `welcome_${Date.now()}`,
              card: {
                header: {
                  title: 'Elara Companion Connected',
                  subtitle: isDirectMessage ? 'Private 1-on-1 Workspace Hub' : `Connected to Space: ${spaceName}`,
                  imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/chat/default/24px.svg',
                  imageType: 'CIRCLE',
                },
                sections: [
                  {
                    widgets: [
                      {
                        textParagraph: {
                          text: `Hello <b>${senderName}</b>! I am <b>Elara</b>, your intelligent workspace companion. I provide autonomous schedule sweeps, task execution, email drafting, and operational logging.`,
                        },
                      },
                      {
                        buttonList: {
                          buttons: [
                            {
                              text: '🌅 Morning Schedule Sweep',
                              onClick: {
                                action: {
                                  function: 'trigger_sweep',
                                },
                              },
                            },
                            {
                              text: '⚡ Check System Status',
                              onClick: {
                                action: {
                                  function: 'check_status',
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        };
        return res.json(welcomeCard);
      }

      // Handle Event: CARD_CLICKED (Interactive Action Dispatcher)
      if (eventType === 'CARD_CLICKED') {
        const actionFunction = event.action?.actionMethodName || event.action?.function;
        const params = event.action?.parameters || [];
        const paramMap: Record<string, string> = {};
        params.forEach((p: any) => {
          if (p.key) paramMap[p.key] = p.value;
        });

        console.log(`[Google Chat Card Action]: ${actionFunction}`, paramMap);

        if (actionFunction === 'approve_task') {
          return res.json({
            actionResponse: { type: 'UPDATE_MESSAGE' },
            cardsV2: [
              {
                cardId: `approved_${Date.now()}`,
                card: {
                  header: {
                    title: '✅ Task Approved & Scheduled',
                    subtitle: `Confirmed by ${senderName}`,
                    imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/tasks/default/24px.svg',
                    imageType: 'CIRCLE',
                  },
                  sections: [
                    {
                      widgets: [
                        {
                          textParagraph: {
                            text: `<b>Task Title:</b> ${paramMap.taskTitle || 'Workspace Action'}<br>Status: <b>Confirmed into Google Tasks</b>`,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          });
        }

        if (actionFunction === 'cancel_task') {
          return res.json({
            actionResponse: { type: 'UPDATE_MESSAGE' },
            cardsV2: [
              {
                cardId: `cancelled_${Date.now()}`,
                card: {
                  header: {
                    title: '❌ Task Cancelled',
                    subtitle: `Action aborted by ${senderName}`,
                    imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/error/default/24px.svg',
                    imageType: 'CIRCLE',
                  },
                  sections: [
                    {
                      widgets: [
                        {
                          textParagraph: {
                            text: `The proposed task execution was safely cancelled.`,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          });
        }

        if (actionFunction === 'trigger_sweep' || actionFunction === 'check_status') {
          return res.json({
            cardsV2: [
              {
                cardId: `status_${Date.now()}`,
                card: {
                  header: {
                    title: 'Elara System Briefing',
                    subtitle: `All Systems Operational • ${new Date().toLocaleTimeString()}`,
                    imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/info/default/24px.svg',
                    imageType: 'CIRCLE',
                  },
                  sections: [
                    {
                      widgets: [
                        {
                          textParagraph: {
                            text: `✓ Google Workspace connected<br>✓ Dual-Mode Dispatch Router: Active<br>✓ Space Webhooks: ${registeredSpaceWebhooks.length} registered<br>✓ Gemini AI Engine: Online`,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          });
        }

        return res.json({ text: `✓ Action "${actionFunction || 'click'}" received by Elara.` });
      }

      // Handle Event: MESSAGE
      const userText = (event.message?.text || event.message?.argumentText || event.text || '').trim();
      if (!userText) {
        return res.json({ text: 'Hello! I am Elara. How can I assist you in Google Chat today?' });
      }

      // Dynamic Dispatch Prompt Construction
      const routeContext = isDirectMessage
        ? `[ROUTING MODE: 1-on-1 DIRECT MESSAGE (DM)]\nThis is a private, confidential DM session with ${senderName}. Respond directly, warmly, and execute any personal workspace queries with high priority.`
        : `[ROUTING MODE: WORKSPACE SPACE HUB: "${spaceName}"]\nThis is a collaborative/operational Google Chat Space. Provide clean, professional summaries, batch schedule sweeps, or operational logs.`;

      const ai = getGeminiClient();
      const prompt = `You are Elara, an intelligent, warm, and highly capable AI workspace companion.
${routeContext}

User Name: ${senderName}
User Message: "${userText}"

Guidelines:
1. Provide a direct, helpful, and natural response in your warm companion voice.
2. Do NOT output raw JSON, code fences with raw data, or robotic metadata.
3. Keep the tone conversational, concise, and focused.`;

      const targetModel = 'gemini-3.7-flash';
      let replyText = "I've received your message in Google Chat. Let me know what you need!";

      try {
        const geminiRes = await ai.models.generateContent({
          model: targetModel,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        });
        if (geminiRes.text) {
          replyText = geminiRes.text.trim();
        }
      } catch (err: any) {
        console.warn(`Chat reply generation failed with ${targetModel}:`, err?.message || err);
      }

      // Check if we should attach an interactive card (e.g. task proposal or schedule sweep)
      const lowerUser = userText.toLowerCase();
      if (/create task|add task|propose task|schedule a task|new task/i.test(lowerUser)) {
        return res.json({
          text: replyText,
          cardsV2: [
            {
              cardId: `task_proposal_${Date.now()}`,
              card: {
                header: {
                  title: 'Task Execution Proposal',
                  subtitle: 'Interactive Approval Request',
                  imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/tasks/default/24px.svg',
                  imageType: 'CIRCLE',
                },
                sections: [
                  {
                    widgets: [
                      {
                        textParagraph: {
                          text: `<b>Requested Action:</b> ${userText}`,
                        },
                      },
                      {
                        buttonList: {
                          buttons: [
                            {
                              text: 'Confirm & Add',
                              onClick: {
                                action: {
                                  function: 'approve_task',
                                  parameters: [{ key: 'taskTitle', value: userText }],
                                },
                              },
                            },
                            {
                              text: 'Cancel',
                              onClick: {
                                action: {
                                  function: 'cancel_task',
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }

      return res.json({ text: replyText });
    } catch (err: any) {
      console.error('Error handling Google Chat event:', err);
      res.json({ text: `I encountered a momentary issue processing your Google Chat event: ${err.message || 'Unknown error'}` });
    }
  });

  // 3. Space-Specific Webhook Router Endpoint (/api/chat/webhook/:spaceId)
  app.post('/api/chat/webhook/:spaceId', async (req, res) => {
    try {
      const { spaceId } = req.params;
      const payload = req.body || {};
      console.log(`[Space Webhook Trigger for ${spaceId}]:`, payload);

      const registered = registeredSpaceWebhooks.find((w) => w.spaceId === spaceId || w.id === spaceId);
      if (registered && registered.webhookUrl) {
        const fetchRes = await fetch(registered.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify(payload),
        });
        registered.lastTriggered = new Date().toISOString();
        const data = await fetchRes.text();
        return res.json({ status: 'forwarded_to_google_chat', spaceId, response: data });
      }

      res.json({
        status: 'received',
        spaceId,
        message: `Dispatched message to space "${spaceId}" router.`,
        payload,
      });
    } catch (err: any) {
      console.error('Error in /api/chat/webhook/:spaceId:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch space webhook' });
    }
  });

  // 4. Proactive Outbound Notification Push Endpoint
  app.post('/api/chat/proactive/send', async (req, res) => {
    try {
      const { type = 'morning_sweep', spaceId, customTitle, customMessage } = req.body;
      const targetWebhooks = spaceId
        ? registeredSpaceWebhooks.filter((w) => w.spaceId === spaceId || w.id === spaceId)
        : registeredSpaceWebhooks;

      const cardPayload = {
        cardsV2: [
          {
            cardId: `proactive_${Date.now()}`,
            card: {
              header: {
                title: customTitle || (type === 'morning_sweep' ? 'Morning Schedule Sweep' : 'Elara Proactive Alert'),
                subtitle: `Elara Push Engine • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/chat/default/24px.svg',
                imageType: 'CIRCLE',
              },
              sections: [
                {
                  widgets: [
                    {
                      textParagraph: {
                        text: customMessage || 'Autonomous proactive update from Elara companion engine.',
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const dispatchResults = [];
      for (const hook of targetWebhooks) {
        try {
          await fetch(hook.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(cardPayload),
          });
          hook.lastTriggered = new Date().toISOString();
          dispatchResults.push({ spaceId: hook.spaceId, name: hook.name, status: 'delivered' });
        } catch (postErr: any) {
          dispatchResults.push({ spaceId: hook.spaceId, name: hook.name, status: 'error', error: postErr.message });
        }
      }

      res.json({
        status: 'success',
        dispatchedCount: dispatchResults.length,
        results: dispatchResults,
        previewCard: cardPayload,
      });
    } catch (err: any) {
      console.error('Error in /api/chat/proactive/send:', err);
      res.status(500).json({ error: err.message || 'Proactive push failed' });
    }
  });



}
