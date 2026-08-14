import React, { useState, useRef } from 'react';
import {
  WorldState,
  RoomLocation,
  InventoryItem,
  RoutineEntry,
  TemporaryEvent,
  SharedMemory,
  PreferenceEntry,
} from '../types';
import {
  X,
  Home,
  Package,
  Clock,
  MapPin,
  BookOpen,
  Sparkles,
  Heart,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  Code,
  Calendar,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface WorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldState: WorldState;
  onSaveWorldState: (newWorldState: WorldState) => void;
  onResetWorldState: () => void;
  onExportWorldState: () => void;
  onImportWorldState: (jsonStr: string) => void;
  userName: string;
}

export const WorldModal: React.FC<WorldModalProps> = ({
  isOpen,
  onClose,
  worldState,
  onSaveWorldState,
  onResetWorldState,
  onExportWorldState,
  onImportWorldState,
  userName,
}) => {
  const [activeTab, setActiveTab] = useState<
    'house' | 'belongings' | 'routines' | 'livestate' | 'memories' | 'elaraLife' | 'preferences' | 'rawJson'
  >('house');

  const [localWorld, setLocalWorld] = useState<WorldState>(worldState);
  const [rawJsonText, setRawJsonText] = useState<string>(JSON.stringify(worldState, null, 2));
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sub-tabs for Belongings & Routines
  const [belongingsCategory, setBelongingsCategory] = useState<'elara' | 'user' | 'shared'>('elara');
  const [routineOwner, setRoutineOwner] = useState<'elara' | 'user'>('elara');

  // Editing state trackers for items
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomObjects, setNewRoomObjects] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem>>({});

  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Partial<RoutineEntry>>({});

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<TemporaryEvent>>({});

  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemory, setEditingMemory] = useState<Partial<SharedMemory>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = (updated: WorldState) => {
    setLocalWorld(updated);
    onSaveWorldState(updated);
    setRawJsonText(JSON.stringify(updated, null, 2));
    setSaveSuccessMsg('World state saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      handleSave(parsed);
      setRawJsonError(null);
    } catch (e: any) {
      setRawJsonError(`JSON Syntax Error: ${e.message}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        try {
          onImportWorldState(reader.result);
          const parsed = JSON.parse(reader.result);
          setLocalWorld(parsed);
          setRawJsonText(JSON.stringify(parsed, null, 2));
          setSaveSuccessMsg('Imported world state successfully!');
          setTimeout(() => setSaveSuccessMsg(null), 2500);
        } catch (err: any) {
          alert(`Import failed: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />

      <div className="bg-[#111113] border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] max-h-[920px] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <span>World State & Life Context</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Persistent Data Layer
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Shared home environment, inventory, routines, live context & memories for Elara
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-medium px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-4 pt-2 gap-1 text-xs font-medium overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'house', label: 'House & Rooms', icon: Home },
            { id: 'belongings', label: 'Belongings', icon: Package },
            { id: 'routines', label: 'Routines', icon: Clock },
            { id: 'livestate', label: 'Live State & Events', icon: MapPin },
            { id: 'memories', label: 'Shared Memories', icon: BookOpen },
            { id: 'elaraLife', label: 'Elara’s Personal Life', icon: Sparkles },
            { id: 'preferences', label: 'Preferences', icon: Heart },
            { id: 'rawJson', label: 'Raw JSON / Backup', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 text-sky-400 bg-zinc-900/90 font-semibold shadow-sm'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-200 custom-scrollbar bg-[#0f0f11]">
          {/* TAB 1: HOUSE & ROOMS */}
          {activeTab === 'house' && (
            <div className="space-y-6">
              {/* General House Description */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  House General Description
                </label>
                <textarea
                  value={localWorld.house?.generalDescription || ''}
                  onChange={(e) => {
                    const updated = {
                      ...localWorld,
                      house: { ...localWorld.house, generalDescription: e.target.value },
                    };
                    handleSave(updated);
                  }}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-sky-500"
                  placeholder="Describe the architectural layout, general vibe, and ambiance of the home..."
                />
              </div>

              {/* Rooms List & Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    House Rooms & Locations ({localWorld.house?.rooms?.length || 0})
                  </h3>

                  <button
                    onClick={() => {
                      const newRoom: RoomLocation = {
                        id: 'room_' + Date.now(),
                        name: 'New Room',
                        description: 'Description of this room...',
                        objects: [],
                      };
                      const updated = {
                        ...localWorld,
                        house: {
                          ...localWorld.house,
                          rooms: [...(localWorld.house?.rooms || []), newRoom],
                        },
                      };
                      handleSave(updated);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Room</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {localWorld.house?.rooms?.map((room, idx) => (
                    <div
                      key={room.id}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={room.name}
                            onChange={(e) => {
                              const newRooms = [...localWorld.house.rooms];
                              newRooms[idx].name = e.target.value;
                              handleSave({
                                ...localWorld,
                                house: { ...localWorld.house, rooms: newRooms },
                              });
                            }}
                            className="text-sm font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-sky-500 focus:outline-none px-1 py-0.5 rounded w-full sm:w-1/2"
                            placeholder="Room Name"
                          />

                          <textarea
                            value={room.description}
                            onChange={(e) => {
                              const newRooms = [...localWorld.house.rooms];
                              newRooms[idx].description = e.target.value;
                              handleSave({
                                ...localWorld,
                                house: { ...localWorld.house, rooms: newRooms },
                              });
                            }}
                            rows={2}
                            className="w-full text-xs text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2 focus:outline-none focus:border-sky-500"
                            placeholder="Room details and atmosphere..."
                          />

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400 font-medium">Objects in room:</span>
                            <input
                              type="text"
                              value={room.objects ? room.objects.join(', ') : ''}
                              onChange={(e) => {
                                const newRooms = [...localWorld.house.rooms];
                                newRooms[idx].objects = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                handleSave({
                                  ...localWorld,
                                  house: { ...localWorld.house, rooms: newRooms },
                                });
                              }}
                              className="flex-1 text-xs text-sky-300 bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500"
                              placeholder="Comma separated: Espresso Machine, Workbench, Sovereign Sofa"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const newRooms = localWorld.house.rooms.filter((_, i) => i !== idx);
                            handleSave({
                              ...localWorld,
                              house: { ...localWorld.house, rooms: newRooms },
                            });
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Delete Room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BELONGINGS */}
          {activeTab === 'belongings' && (
            <div className="space-y-5">
              {/* Belongings Sub-tabs */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setBelongingsCategory('elara')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      belongingsCategory === 'elara'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Elara’s Possessions ({localWorld.elaraBelongings?.length || 0})
                  </button>
                  <button
                    onClick={() => setBelongingsCategory('user')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      belongingsCategory === 'user'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {userName}’s Possessions ({localWorld.userBelongings?.length || 0})
                  </button>
                  <button
                    onClick={() => setBelongingsCategory('shared')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      belongingsCategory === 'shared'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Shared Household ({localWorld.sharedPossessions?.length || 0})
                  </button>
                </div>

                <button
                  onClick={() => {
                    const newItem: InventoryItem = {
                      id: 'item_' + Date.now(),
                      name: 'New Item',
                      category: 'General',
                      location: 'Living Room',
                      description: 'Item description...',
                      ownership: belongingsCategory,
                      importance: 'medium',
                    };
                    let key: 'elaraBelongings' | 'userBelongings' | 'sharedPossessions' = 'elaraBelongings';
                    if (belongingsCategory === 'user') key = 'userBelongings';
                    if (belongingsCategory === 'shared') key = 'sharedPossessions';

                    handleSave({
                      ...localWorld,
                      [key]: [...(localWorld[key] || []), newItem],
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Items List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  let items: InventoryItem[] = localWorld.elaraBelongings || [];
                  let key: 'elaraBelongings' | 'userBelongings' | 'sharedPossessions' = 'elaraBelongings';
                  if (belongingsCategory === 'user') {
                    items = localWorld.userBelongings || [];
                    key = 'userBelongings';
                  } else if (belongingsCategory === 'shared') {
                    items = localWorld.sharedPossessions || [];
                    key = 'sharedPossessions';
                  }

                  return items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newArr = [...items];
                            newArr[idx].name = e.target.value;
                            handleSave({ ...localWorld, [key]: newArr });
                          }}
                          className="font-semibold text-xs text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-sky-500 focus:outline-none px-1 py-0.5 rounded w-full"
                          placeholder="Item Name"
                        />
                        <button
                          onClick={() => {
                            const newArr = items.filter((_, i) => i !== idx);
                            handleSave({ ...localWorld, [key]: newArr });
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Category</label>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => {
                              const newArr = [...items];
                              newArr[idx].category = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Location</label>
                          <input
                            type="text"
                            value={item.location}
                            onChange={(e) => {
                              const newArr = [...items];
                              newArr[idx].location = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Description</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            const newArr = [...items];
                            newArr[idx].description = e.target.value;
                            handleSave({ ...localWorld, [key]: newArr });
                          }}
                          rows={2}
                          className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded p-1.5 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: ROUTINES */}
          {activeTab === 'routines' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setRoutineOwner('elara')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      routineOwner === 'elara'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Elara’s Schedule ({localWorld.elaraRoutine?.length || 0})
                  </button>
                  <button
                    onClick={() => setRoutineOwner('user')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      routineOwner === 'user'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {userName}’s Schedule ({localWorld.userRoutine?.length || 0})
                  </button>
                </div>

                <button
                  onClick={() => {
                    const newR: RoutineEntry = {
                      id: 'rt_' + Date.now(),
                      timeRange: '12:00 – 13:00',
                      daysOfWeek: 'Monday – Friday',
                      activity: 'Activity name',
                      location: 'Home',
                      flexibility: 'flexible',
                    };
                    const key = routineOwner === 'elara' ? 'elaraRoutine' : 'userRoutine';
                    handleSave({
                      ...localWorld,
                      [key]: [...(localWorld[key] || []), newR],
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(() => {
                  const key = routineOwner === 'elara' ? 'elaraRoutine' : 'userRoutine';
                  const routines = localWorld[key] || [];

                  return routines.map((r, idx) => (
                    <div
                      key={r.id}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={r.timeRange}
                            onChange={(e) => {
                              const newArr = [...routines];
                              newArr[idx].timeRange = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="font-mono text-xs font-semibold text-sky-400 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none"
                            placeholder="08:00 – 10:00"
                          />
                          <input
                            type="text"
                            value={r.daysOfWeek}
                            onChange={(e) => {
                              const newArr = [...routines];
                              newArr[idx].daysOfWeek = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none flex-1"
                            placeholder="Days of week"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const newArr = routines.filter((_, i) => i !== idx);
                            handleSave({ ...localWorld, [key]: newArr });
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Activity</label>
                          <input
                            type="text"
                            value={r.activity}
                            onChange={(e) => {
                              const newArr = [...routines];
                              newArr[idx].activity = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="w-full text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Location</label>
                          <input
                            type="text"
                            value={r.location}
                            onChange={(e) => {
                              const newArr = [...routines];
                              newArr[idx].location = e.target.value;
                              handleSave({ ...localWorld, [key]: newArr });
                            }}
                            className="w-full text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE STATE & EVENTS */}
          {activeTab === 'livestate' && (
            <div className="space-y-6">
              {/* Live Instant Context Form */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="border-b border-zinc-800/80 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    <span>Current Live World State</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Temporary right-now context. Gemini prioritizes live state over routine assumptions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      {userName}’s Location
                    </label>
                    <input
                      type="text"
                      value={localWorld.liveState?.userLocation || ''}
                      onChange={(e) =>
                        handleSave({
                          ...localWorld,
                          liveState: { ...localWorld.liveState, userLocation: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Workshop, Kitchen, At work"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Elara’s Location
                    </label>
                    <input
                      type="text"
                      value={localWorld.liveState?.elaraLocation || ''}
                      onChange={(e) =>
                        handleSave({
                          ...localWorld,
                          liveState: { ...localWorld.liveState, elaraLocation: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Kitchen, Main Lounge"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Current Activity
                    </label>
                    <input
                      type="text"
                      value={localWorld.liveState?.currentActivity || ''}
                      onChange={(e) =>
                        handleSave({
                          ...localWorld,
                          liveState: { ...localWorld.liveState, currentActivity: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Preparing dinner, Repairing a circuit"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Current Clothing / Attire
                    </label>
                    <input
                      type="text"
                      value={localWorld.liveState?.currentClothing || ''}
                      onChange={(e) =>
                        handleSave({
                          ...localWorld,
                          liveState: { ...localWorld.liveState, currentClothing: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Soft dark knit sweater"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Objects Currently in Use / Temporary Conditions
                    </label>
                    <input
                      type="text"
                      value={localWorld.liveState?.objectsInUse || ''}
                      onChange={(e) =>
                        handleSave({
                          ...localWorld,
                          liveState: { ...localWorld.liveState, objectsInUse: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Soldering iron, warm herbal tea"
                    />
                  </div>
                </div>
              </div>

              {/* Temporary Events Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Temporary Events & Scheduled Occurrences ({localWorld.temporaryEvents?.length || 0})
                  </h3>

                  <button
                    onClick={() => {
                      const newE: TemporaryEvent = {
                        id: 'te_' + Date.now(),
                        title: 'New Temporary Event',
                        description: 'Event description...',
                        participants: 'Elara & ' + userName,
                        location: 'Home',
                      };
                      handleSave({
                        ...localWorld,
                        temporaryEvents: [...(localWorld.temporaryEvents || []), newE],
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {localWorld.temporaryEvents?.map((ev, idx) => (
                    <div key={ev.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={ev.title}
                          onChange={(e) => {
                            const arr = [...localWorld.temporaryEvents];
                            arr[idx].title = e.target.value;
                            handleSave({ ...localWorld, temporaryEvents: arr });
                          }}
                          className="font-semibold text-xs text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-sky-500 focus:outline-none px-1 py-0.5 rounded w-full sm:w-1/2"
                        />
                        <button
                          onClick={() => {
                            const arr = localWorld.temporaryEvents.filter((_, i) => i !== idx);
                            handleSave({ ...localWorld, temporaryEvents: arr });
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        value={ev.description}
                        onChange={(e) => {
                          const arr = [...localWorld.temporaryEvents];
                          arr[idx].description = e.target.value;
                          handleSave({ ...localWorld, temporaryEvents: arr });
                        }}
                        rows={2}
                        className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded p-1.5 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SHARED MEMORIES */}
          {activeTab === 'memories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Shared Memories & History ({localWorld.sharedMemories?.length || 0})
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Milestones and shared moments creating continuity across time.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const newM: SharedMemory = {
                      id: 'sm_' + Date.now(),
                      date: new Date().toISOString().slice(0, 10),
                      title: 'New Memory',
                      description: 'Description of memory...',
                      participants: 'Elara & ' + userName,
                      importance: 'high',
                      tags: ['memory'],
                    };
                    handleSave({
                      ...localWorld,
                      sharedMemories: [...(localWorld.sharedMemories || []), newM],
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Memory</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {localWorld.sharedMemories?.map((mem, idx) => (
                  <div key={mem.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="date"
                          value={mem.date}
                          onChange={(e) => {
                            const arr = [...localWorld.sharedMemories];
                            arr[idx].date = e.target.value;
                            handleSave({ ...localWorld, sharedMemories: arr });
                          }}
                          className="font-mono text-xs text-sky-400 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={mem.title}
                          onChange={(e) => {
                            const arr = [...localWorld.sharedMemories];
                            arr[idx].title = e.target.value;
                            handleSave({ ...localWorld, sharedMemories: arr });
                          }}
                          className="font-semibold text-xs text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-sky-500 focus:outline-none px-1 py-0.5 rounded flex-1"
                        />
                      </div>

                      <button
                        onClick={() => {
                          const arr = localWorld.sharedMemories.filter((_, i) => i !== idx);
                          handleSave({ ...localWorld, sharedMemories: arr });
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      value={mem.description}
                      onChange={(e) => {
                        const arr = [...localWorld.sharedMemories];
                        arr[idx].description = e.target.value;
                        handleSave({ ...localWorld, sharedMemories: arr });
                      }}
                      rows={2}
                      className="w-full text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded p-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ELARA'S PERSONAL LIFE */}
          {activeTab === 'elaraLife' && (
            <div className="space-y-6">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="border-b border-zinc-800/80 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Elara’s Independent Personal Life & Interests</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Gives Elara autonomous pursuits, ongoing study topics, research ideas, and personal goals.
                  </p>
                </div>

                {/* Array editors */}
                {[
                  { key: 'personalProjects', label: 'Personal Projects & Inventions' },
                  { key: 'booksReading', label: 'Books Reading' },
                  { key: 'subjectsResearching', label: 'Subjects Researching & Studying' },
                  { key: 'curiosities', label: 'Curiosities & Ideas Developing' },
                  { key: 'ongoingGoals', label: 'Ongoing Personal Goals' },
                ].map((field) => {
                  const items: string[] = (localWorld.elaraPersonalLife as any)?.[field.key] || [];

                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">{field.label}</label>
                        <button
                          onClick={() => {
                            const updatedPL = {
                              ...localWorld.elaraPersonalLife,
                              [field.key]: [...items, 'New item...'],
                            };
                            handleSave({ ...localWorld, elaraPersonalLife: updatedPL });
                          }}
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newArr = [...items];
                                newArr[idx] = e.target.value;
                                const updatedPL = {
                                  ...localWorld.elaraPersonalLife,
                                  [field.key]: newArr,
                                };
                                handleSave({ ...localWorld, elaraPersonalLife: updatedPL });
                              }}
                              className="flex-1 text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
                            />
                            <button
                              onClick={() => {
                                const newArr = items.filter((_, i) => i !== idx);
                                const updatedPL = {
                                  ...localWorld.elaraPersonalLife,
                                  [field.key]: newArr,
                                };
                                handleSave({ ...localWorld, elaraPersonalLife: updatedPL });
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Preferences & Shared Habits ({localWorld.preferences?.length || 0})
                  </h3>
                </div>

                <button
                  onClick={() => {
                    const newPref: PreferenceEntry = {
                      id: 'pref_' + Date.now(),
                      category: 'General',
                      detail: 'Preference description...',
                      owner: 'elara',
                    };
                    handleSave({
                      ...localWorld,
                      preferences: [...(localWorld.preferences || []), newPref],
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Preference</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {localWorld.preferences?.map((pref, idx) => (
                  <div key={pref.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                    <select
                      value={pref.owner}
                      onChange={(e) => {
                        const arr = [...localWorld.preferences];
                        arr[idx].owner = e.target.value as any;
                        handleSave({ ...localWorld, preferences: arr });
                      }}
                      className="text-xs bg-zinc-950 border border-zinc-800 text-sky-400 font-semibold rounded px-2 py-1.5 focus:outline-none"
                    >
                      <option value="elara">Elara</option>
                      <option value="user">{userName}</option>
                      <option value="shared">Shared</option>
                    </select>

                    <input
                      type="text"
                      value={pref.category}
                      onChange={(e) => {
                        const arr = [...localWorld.preferences];
                        arr[idx].category = e.target.value;
                        handleSave({ ...localWorld, preferences: arr });
                      }}
                      className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 rounded px-2 py-1.5 w-32 focus:outline-none"
                      placeholder="Category"
                    />

                    <input
                      type="text"
                      value={pref.detail}
                      onChange={(e) => {
                        const arr = [...localWorld.preferences];
                        arr[idx].detail = e.target.value;
                        handleSave({ ...localWorld, preferences: arr });
                      }}
                      className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 rounded px-2.5 py-1.5 flex-1 focus:outline-none focus:border-sky-500"
                      placeholder="Preference detail"
                    />

                    <button
                      onClick={() => {
                        const arr = localWorld.preferences.filter((_, i) => i !== idx);
                        handleSave({ ...localWorld, preferences: arr });
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: RAW JSON / BACKUP */}
          {activeTab === 'rawJson' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Raw World State JSON Editor
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Advanced direct JSON inspection, backup, import, and export.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onExportWorldState}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Import JSON</span>
                  </button>

                  <button
                    onClick={onResetWorldState}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-medium border border-amber-800/60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              {rawJsonError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{rawJsonError}</span>
                </div>
              )}

              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                rows={18}
                className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleApplyRawJson}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-900/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Apply Raw JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>All edits automatically synchronized to client storage</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close World Manager
          </button>
        </div>
      </div>
    </div>
  );
};
