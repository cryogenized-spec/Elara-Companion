import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  buildRuntimeConfig,
  toGeminiFunctionDeclaration,
} from '../geminiRuntimeConfigService';

test('provider tool declarations exclude Elara-internal authorization metadata', () => {
  const declaration = toGeminiFunctionDeclaration({
    name: 'example_tool',
    description: 'Example tool',
    parameters: { type: 'OBJECT', properties: {} },
    capabilities: ['workspace.read'],
    effects: ['read'],
    pluginId: 'workspace',
    arbitraryInternalField: 'must-not-leak',
  });

  assert.deepEqual(declaration, {
    name: 'example_tool',
    description: 'Example tool',
    parameters: { type: 'OBJECT', properties: {} },
  });
  assert.equal('capabilities' in declaration, false);
  assert.equal('effects' in declaration, false);
  assert.equal('pluginId' in declaration, false);
  assert.equal('arbitraryInternalField' in declaration, false);
});

test('buildRuntimeConfig emits sanitized Gemini function declarations', () => {
  const config = buildRuntimeConfig({ model: 'gemini-3.6-flash', systemPrompt: 'test' });
  const declarations = config.tools?.[0]?.functionDeclarations || [];
  assert.ok(declarations.length > 0);
  for (const declaration of declarations) {
    assert.equal('capabilities' in declaration, false);
    assert.equal('effects' in declaration, false);
    assert.equal('pluginId' in declaration, false);
  }
});
