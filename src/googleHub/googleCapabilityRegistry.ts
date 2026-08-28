import {
  getGoogleCapabilityScopes,
  type GoogleCapability,
} from '../lib/googleCapabilityPolicy';
import type { GoogleCapabilityDefinition } from './capabilityTypes';

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

function validateCapability(definition: GoogleCapabilityDefinition): GoogleCapabilityDefinition {
  const id = normalizeId(definition.id || '');
  if (!id) throw new Error('Google capability must have a non-empty id.');
  if (definition.id !== id) throw new Error(`Google capability '${definition.id}' must use a normalized id.`);
  if (definition.version !== 1) throw new Error(`Unsupported Google capability version for '${id}'.`);
  if (definition.provider !== 'google') throw new Error(`Google capability '${id}' has an invalid provider.`);
  if (!definition.name.trim()) throw new Error(`Google capability '${id}' must have a name.`);
  if (!definition.description.trim()) throw new Error(`Google capability '${id}' must have a description.`);
  if (!definition.category.trim()) throw new Error(`Google capability '${id}' must have a category.`);
  if (!definition.iconKey.trim()) throw new Error(`Google capability '${id}' must have an iconKey.`);
  if (!definition.panelKey.trim()) throw new Error(`Google capability '${id}' must have a panelKey.`);
  if (definition.authorization.mode !== 'identity' && definition.authorization.mode !== 'capability') {
    throw new Error(`Google capability '${id}' has an invalid authorization mode.`);
  }

  const required = [...definition.authorization.requiredCapabilities];
  if (required.length === 0) throw new Error(`Google capability '${id}' must declare at least one required capability.`);

  const seenCapabilities = new Set<string>();
  for (const capability of required) {
    if (seenCapabilities.has(capability)) {
      throw new Error(`Google capability '${id}' declares '${capability}' more than once.`);
    }
    seenCapabilities.add(capability);
    if (getGoogleCapabilityScopes(capability).length === 0) {
      throw new Error(`Google capability '${id}' references unmapped capability '${capability}'.`);
    }
  }

  const actionIds = new Set<string>();
  for (const action of definition.actions) {
    const actionId = action.id.trim().toLowerCase();
    if (!actionId) throw new Error(`Google capability '${id}' contains an action without an id.`);
    if (action.id !== actionId) throw new Error(`Action '${action.id}' in capability '${id}' must use a normalized id.`);
    if (actionIds.has(actionId)) throw new Error(`Google capability '${id}' declares action '${actionId}' more than once.`);
    actionIds.add(actionId);
    if (!action.label.trim() || !action.description.trim()) {
      throw new Error(`Action '${actionId}' in capability '${id}' must have label and description.`);
    }
    for (const actionCapability of action.requiredCapabilities || []) {
      if (getGoogleCapabilityScopes(actionCapability).length === 0) {
        throw new Error(`Action '${actionId}' in capability '${id}' references unmapped capability '${actionCapability}'.`);
      }
    }
  }

  return {
    ...definition,
    id,
    authorization: {
      ...definition.authorization,
      requiredCapabilities: [...required],
    },
    actions: definition.actions.map((action) => ({
      ...action,
      requiredCapabilities: action.requiredCapabilities ? [...action.requiredCapabilities] : undefined,
    })),
  };
}

/** Registry/composition boundary for Google Hub capabilities. */
export class GoogleCapabilityRegistry {
  private readonly capabilities = new Map<string, GoogleCapabilityDefinition>();
  private readonly actionOwners = new Map<string, string>();

  register(definition: GoogleCapabilityDefinition): void {
    const capability = validateCapability(definition);
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Google capability '${capability.id}' is already registered.`);
    }

    for (const action of capability.actions) {
      const owner = this.actionOwners.get(action.id);
      if (owner) throw new Error(`Google action '${action.id}' is already owned by capability '${owner}'.`);
    }

    this.capabilities.set(capability.id, capability);
    for (const action of capability.actions) this.actionOwners.set(action.id, capability.id);
  }

  registerAll(definitions: readonly GoogleCapabilityDefinition[]): void {
    for (const definition of definitions) this.register(definition);
  }

  get(id: string): GoogleCapabilityDefinition | null {
    return this.capabilities.get(normalizeId(id)) || null;
  }

  has(id: string): boolean {
    return this.get(id) !== null;
  }

  getAll(): GoogleCapabilityDefinition[] {
    return Array.from(this.capabilities.values()).map((capability) => ({
      ...capability,
      authorization: {
        ...capability.authorization,
        requiredCapabilities: [...capability.authorization.requiredCapabilities],
      },
      actions: capability.actions.map((action) => ({
        ...action,
        requiredCapabilities: action.requiredCapabilities ? [...action.requiredCapabilities] : undefined,
      })),
    }));
  }

  getByCategory(category: string): GoogleCapabilityDefinition[] {
    return this.getAll().filter((capability) => capability.category === category);
  }

  getActionOwner(actionId: string): GoogleCapabilityDefinition | null {
    const capabilityId = this.actionOwners.get(actionId.trim().toLowerCase());
    return capabilityId ? this.get(capabilityId) : null;
  }

  getRequiredCapabilities(id: string): GoogleCapability[] {
    return [...(this.get(id)?.authorization.requiredCapabilities || [])];
  }

  getRequiredScopes(id: string): string[] {
    return [...new Set(this.getRequiredCapabilities(id).flatMap(getGoogleCapabilityScopes))];
  }

  isAuthorized(id: string, grantedScopes: string): boolean {
    const capability = this.get(id);
    if (!capability) return false;
    const granted = new Set(grantedScopes.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
    return capability.authorization.requiredCapabilities.every((requiredCapability) =>
      getGoogleCapabilityScopes(requiredCapability).every((scope) => granted.has(scope)),
    );
  }

  clear(): void {
    this.capabilities.clear();
    this.actionOwners.clear();
  }
}
