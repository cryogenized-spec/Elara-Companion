import React from 'react';
import { MemoryModal as LegacyMemoryModal } from './MemoryModal';

export type MemoryModalGuardProps = React.ComponentProps<typeof LegacyMemoryModal>;

/**
 * Mount guard for the existing memory UI.
 *
 * The legacy component contains stateful hooks below its `isOpen` early-return.
 * Keeping it unmounted while closed preserves a stable hook order without
 * introducing a second memory UI implementation.
 */
export const MemoryModal: React.FC<MemoryModalGuardProps> = (props) => {
  if (!props.isOpen) return null;
  return <LegacyMemoryModal {...props} isOpen={true} />;
};
