import { getDbSnapshots, setDbSnapshots } from '../lib/db';
import type { PersonaSnapshot } from '../types';

/** Application-owned persistence boundary for Settings-only saved persona snapshots. */
export const settingsPersistence = {
  loadPersonaSnapshots(): Promise<PersonaSnapshot[]> {
    return getDbSnapshots();
  },

  savePersonaSnapshots(snapshots: PersonaSnapshot[]): Promise<void> {
    return setDbSnapshots(snapshots);
  },
};
