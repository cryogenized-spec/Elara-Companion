import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createThinkingEvent, orderThinkingEvents } from '../thinkingEvents';

describe('thinking event timeline contract', () => {
  it('keeps mixed thought/tool/memory events chronologically ordered', () => {
    const events = [
      createThinkingEvent({ type: 'tool_result', source: 'tool', title: 'Gmail result', summary: 'Returned messages.' }, 300),
      createThinkingEvent({ type: 'thought', source: 'model', title: 'Understand request', summary: 'Reviewing context.' }, 100),
      createThinkingEvent({ type: 'memory', source: 'memory', title: 'Memory lookup', summary: 'Checking relevant memories.' }, 200),
    ];

    const ordered = orderThinkingEvents(events);
    assert.deepEqual(ordered.map((event) => event.type), ['thought', 'memory', 'tool_result']);
  });

  it('preserves tool metadata for service-specific icons and labels', () => {
    const event = createThinkingEvent({
      type: 'tool_call',
      source: 'tool',
      title: 'Gmail search',
      summary: 'Searching unread mail.',
      tool: { name: 'gmail_search', label: 'Search Gmail', service: 'gmail', operation: 'search' },
    });

    assert.equal(event.tool?.service, 'gmail');
    assert.equal(event.tool?.operation, 'search');
  });

  it('supports a collapsed parent with independently expandable child details', () => {
    const event = createThinkingEvent({
      type: 'memory_result',
      source: 'memory',
      title: 'Memory result',
      summary: 'Three relevant memories found.',
      detail: 'Details remain hidden until the row is expanded.',
    });

    assert.equal(event.summary, 'Three relevant memories found.');
    assert.equal(event.detail, 'Details remain hidden until the row is expanded.');
  });
});
