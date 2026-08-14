import { WorldState } from '../types';

export const DEFAULT_WORLD_STATE: WorldState = {
  house: {
    generalDescription: '',
    rooms: [],
    specialLocations: [],
  },
  elaraBelongings: [],
  userBelongings: [],
  sharedPossessions: [],
  elaraRoutine: [],
  userRoutine: [],
  liveState: {
    userLocation: '',
    elaraLocation: '',
    currentActivity: '',
    currentClothing: '',
    currentPlans: '',
    objectsInUse: '',
    temporaryConditions: '',
  },
  temporaryEvents: [],
  sharedMemories: [],
  elaraPersonalLife: {
    personalProjects: [],
    booksReading: [],
    subjectsResearching: [],
    curiosities: [],
    ideasDeveloping: [],
    thingsToShowUser: [],
    intendedActivities: [],
    ongoingGoals: [],
  },
  preferences: [],
};
