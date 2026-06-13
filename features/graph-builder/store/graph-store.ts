import { createEntity } from '@/features/project/api/create-entity';
import { deleteEntity } from '@/features/project/api/delete-entity';
import { listEntities } from '@/features/project/api/list-entities';
import { readEntity } from '@/features/project/api/read-entity';
import { updateEntity } from '@/features/project/api/update-entity';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Entity } from '../types/types';
import type { CreateEntityData, UpdateEntityData } from '@/features/project/types/types';
import deepEqual from 'fast-deep-equal';

// ====================== TYPES ======================
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  selected?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface UserAwareness {
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

interface Draft {
  entity: Entity;
  nodes: FlowNode[];
  edges: FlowEdge[];
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  isCollaborative: boolean;
  isSynced: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionError?: string;
}

interface CollabSession {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  unobserveNodes: () => void;
  unobserveEdges: () => void;
  unsubscribeAwareness: () => void;
}

// ====================== HELPERS ======================
const HOCUSPOCUS_URL = "wss://ez5c0rv0qswls1v5jm2yzvdc.getmost.app";

const COLLAB_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

const getRandomColor = (): string => COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
const generateUserName = (): string => `User ${Math.floor(Math.random() * 10000)}${Date.now()}`;

const yMapToArray = <T>(map: Y.Map<T>): T[] => Array.from(map.values());

const fastEqual = <T>(a: T[], b: T[]): boolean => deepEqual(a, b);

// Global collab sessions (kept for simplicity)
const collabSessions = new Map<string, CollabSession>();

const getCollabSession = (entityId: string) => collabSessions.get(entityId);

const removeCollabSession = (entityId: string) => {
  const session = collabSessions.get(entityId);
  if (!session) return;
  session.unobserveNodes?.();
  session.unobserveEdges?.();
  session.unsubscribeAwareness?.();
  session.provider.destroy();
  session.ydoc.destroy();
  collabSessions.delete(entityId);
};

const removeAllCollabSessions = () => {
  Array.from(collabSessions.keys()).forEach(removeCollabSession);
};

// ====================== COLLAB HELPERS ======================
const initCollabSession = (
  entityId: string,
  initialDraft: Draft,
  currentUser: UserAwareness,
  set: any,
  get: any
) => {
  removeCollabSession(entityId);

  const ydoc = new Y.Doc();
  const yNodes = ydoc.getMap<FlowNode>('nodes');
  const yEdges = ydoc.getMap<FlowEdge>('edges');

  const provider = new HocuspocusProvider({
    url: HOCUSPOCUS_URL,
    name: `entity-${entityId}`,
    document: ydoc,
  });

  let initialSyncDone = false;

  const handleStatus = (event: any) => {
    set((state: any) => {
      const d = state.drafts[entityId];
      if (!d) return state;
      return { drafts: { ...state.drafts, [entityId]: { ...d, connectionStatus: event.status } } };
    });
  };

  const handleError = (err: any) => {
    console.error('Hocuspocus error:', err);
    set((state: any) => {
      const d = state.drafts[entityId];
      if (!d) return state;
      return { drafts: { ...state.drafts, [entityId]: { ...d, connectionStatus: 'error', connectionError: String(err) } } };
    });
  };

  const handleSynced = () => {
    if (initialSyncDone) return;
    initialSyncDone = true;

    const currentDraft = get().drafts[entityId];
    if (!currentDraft) return;

    const isEmpty = yNodes.size === 0 && yEdges.size === 0;

    if (isEmpty && (currentDraft.nodes.length || currentDraft.edges.length)) {
      // CHANGED: strip computed 'templates' (and 'selected') before writing to Yjs
      ydoc.transact(() => {
        currentDraft.nodes.forEach((n) => {
          const { selected, templates, ...cleanData } = n.data; // remove computed fields
          yNodes.set(n.id, { ...n, data: cleanData });
        });
        currentDraft.edges.forEach((e) => yEdges.set(e.id, e));
      });
    } else if (!isEmpty) {
      set((state: any) => ({
        drafts: {
          ...state.drafts,
          [entityId]: {
            ...state.drafts[entityId]!,
            nodes: yMapToArray(yNodes),
            edges: yMapToArray(yEdges),
            isDirty: false,
          },
        },
      }));
    }

    set((state: any) => ({
      drafts: { ...state.drafts, [entityId]: { ...state.drafts[entityId]!, isSynced: true } },
    }));
  };

  const updateFromYjs = () => {
    const newNodes = yMapToArray(yNodes);
    const newEdges = yMapToArray(yEdges);

    set((state: any) => {
      const d = state.drafts[entityId];
      if (!d) return state;

      // CHANGED: merge remote nodes with local templates to preserve computed values
      const mergedNodes = newNodes.map((rn) => {
        const local = d.nodes.find((n) => n.id === rn.id);
        if (local && local.data?.templates) {
          return { ...rn, data: { ...rn.data, templates: local.data.templates } };
        }
        return rn;
      });

      if (fastEqual(d.nodes, mergedNodes) && fastEqual(d.edges, newEdges)) return state;
      return { drafts: { ...state.drafts, [entityId]: { ...d, nodes: mergedNodes, edges: newEdges } } };
    });
  };

  provider.on('status', handleStatus);
  provider.on('error', handleError);
  provider.on('synced', handleSynced);

  yNodes.observe(updateFromYjs);
  yEdges.observe(updateFromYjs);

  provider.awareness.setLocalStateField('user', currentUser);

  const updateAwareness = () => {
    const awarenessUsers = Array.from(provider.awareness.getStates().values())
      .map((s: any) => s?.user)
      .filter(Boolean);
    set({ awarenessUsers });
  };

  provider.awareness.on('change', updateAwareness);
  updateAwareness();

  collabSessions.set(entityId, {
    ydoc,
    provider,
    unobserveNodes: () => yNodes.unobserve(updateFromYjs),
    unobserveEdges: () => yEdges.unobserve(updateFromYjs),
    unsubscribeAwareness: () => provider.awareness.off('change', updateAwareness),
  });

  return { yNodes, yEdges };
};

// ====================== STORE ======================
export const useGraphStore = create<GraphStore>()(
  devtools((set, get) => ({
    // State
    entities: [],
    total: 0,
    isLoading: false,
    listError: null,
    activeEntityId: null,
    drafts: {},
    awarenessUsers: [],
    currentUser: { name: generateUserName(), color: getRandomColor(), cursor: null },
    _cursorThrottleTimers: {} as Record<string, NodeJS.Timeout | null>,

    // Selectors
    currentEntity: () => {
      const { activeEntityId, drafts } = get();
      return activeEntityId ? drafts[activeEntityId]?.entity ?? null : null;
    },

    currentDraft: () => {
      const { activeEntityId, drafts } = get();
      return activeEntityId ? drafts[activeEntityId] ?? null : null;
    },

    currentNodes: () => get().currentDraft()?.nodes ?? [],
    currentEdges: () => get().currentDraft()?.edges ?? [],

    // User & Awareness
    setCurrentUser: (user) => {
      set((state) => ({ currentUser: { ...state.currentUser, ...user } }));
      const activeId = get().activeEntityId;
      if (activeId) {
        getCollabSession(activeId)?.provider.awareness.setLocalStateField('user', {
          ...get().currentUser,
          ...user,
        });
      }
    },

    _updateAwarenessUsers: (users) => set({ awarenessUsers: users }),

    // Entities CRUD
    loadEntities: async (params = {}) => {
      set({ isLoading: true, listError: null });
      try {
        const result = await listEntities(params);
        set({ entities: result.entities, total: result.total, isLoading: false });
      } catch (err) {
        set({ listError: String(err), isLoading: false });
      }
    },

    createNewEntity: async (data) => {
      const entity = await createEntity(data);
      set((state) => ({ entities: [entity, ...state.entities], total: state.total + 1 }));
      return entity;
    },

    deleteEntity: async (entityId) => {
      await deleteEntity(entityId);
      removeCollabSession(entityId);

      set((state) => {
        const newDrafts = { ...state.drafts };
        delete newDrafts[entityId];
        const timers = { ...state._cursorThrottleTimers };
        if (timers[entityId]) {
          clearTimeout(timers[entityId]!);
          delete timers[entityId];
        }

        return {
          entities: state.entities.filter((e) => e.$id !== entityId),
          total: state.total - 1,
          drafts: newDrafts,
          activeEntityId: state.activeEntityId === entityId ? null : state.activeEntityId,
          awarenessUsers: state.activeEntityId === entityId ? [] : state.awarenessUsers,
          _cursorThrottleTimers: timers,
        };
      });
    },

    renameEntity: async (entityId, name) => {
      const updated = await updateEntity(entityId, { name });
      set((state) => {
        const newDrafts = { ...state.drafts };
        if (newDrafts[entityId]) {
          newDrafts[entityId] = {
            ...newDrafts[entityId],
            entity: { ...newDrafts[entityId].entity, name, $updatedAt: updated.$updatedAt },
          };
        }
        return {
          drafts: newDrafts,
          entities: state.entities.map((e) =>
            e.$id === entityId ? { ...e, name, $updatedAt: updated.$updatedAt } : e
          ),
        };
      });
    },

    updateEntityField: async <K extends keyof Entity>(field: K, value: Entity[K]) => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;
      const draft = drafts[activeEntityId];

      set((state) => ({
        drafts: { ...state.drafts, [activeEntityId]: { ...state.drafts[activeEntityId]!, isSaving: true, saveError: null } },
      }));

      try {
        const updated = await updateEntity(activeEntityId, { [field]: value } as UpdateEntityData);
        set((state) => ({
          drafts: {
            ...state.drafts,
            [activeEntityId]: { ...state.drafts[activeEntityId]!, entity: { ...draft.entity, ...updated, [field]: value }, isSaving: false },
          },
          entities: state.entities.map((e) => (e.$id === updated.$id ? updated : e)),
        }));
      } catch (err) {
        set((state) => ({
          drafts: { ...state.drafts, [activeEntityId]: { ...state.drafts[activeEntityId]!, isSaving: false, saveError: String(err) } },
        }));
        throw err;
      }
    },

    // Core Graph Operations
    openEntity: (entity) => {
      get().disableCollaboration(entity.$id);

      let nodes: FlowNode[] = [];
      let edges: FlowEdge[] = [];
      try {
        const parsed = typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data;
        nodes = parsed.nodes || [];
        edges = parsed.edges || [];
      } catch (e) {
        console.error('Failed to parse entity data', e);
      }

      const newDraft: Draft = {
        entity,
        nodes,
        edges,
        isDirty: false,
        isSaving: false,
        saveError: null,
        lastSavedAt: Date.now(),
        isCollaborative: false,
        isSynced: false,
        connectionStatus: 'disconnected',
      };

      set((state) => ({
        activeEntityId: entity.$id,
        drafts: { ...state.drafts, [entity.$id]: newDraft },
        entities: state.entities.map((e) => (e.$id === entity.$id ? entity : e)),
      }));
    },

    switchEntity: async (entityId) => {
      const currentId = get().activeEntityId;
      if (currentId && currentId !== entityId) {
        get().disableCollaboration(currentId);
      }

      if (get().drafts[entityId]) {
        set({ activeEntityId: entityId });
        return;
      }
      try {
        const entity = await readEntity(entityId);
        get().openEntity(entity);
      } catch (err) {
        set({ listError: String(err) });
      }
    },

    closeEntity: (entityId) => {
      const { activeEntityId } = get();
      const targetId = entityId ?? activeEntityId;
      if (!targetId) return;

      removeCollabSession(targetId);

      set((state) => {
        const newDrafts = { ...state.drafts };
        delete newDrafts[targetId];
        const timers = { ...state._cursorThrottleTimers };
        if (timers[targetId]) {
          clearTimeout(timers[targetId]!);
          delete timers[targetId];
        }

        return {
          drafts: newDrafts,
          activeEntityId: activeEntityId === targetId ? null : activeEntityId,
          awarenessUsers: activeEntityId === targetId ? [] : state.awarenessUsers,
          _cursorThrottleTimers: timers,
        };
      });
    },

    resetWorkspace: () => {
      removeAllCollabSessions();
      set({
        activeEntityId: null,
        drafts: {},
        entities: [],
        total: 0,
        listError: null,
        isLoading: false,
        awarenessUsers: [],
        _cursorThrottleTimers: {},
      });
    },

    // Nodes & Edges
    setNodes: (nodes) => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;
      const draft = drafts[activeEntityId];
      if (!draft) return;

      if (draft.isCollaborative) {
        const session = getCollabSession(activeEntityId);
        if (session) {
          const yNodes = session.ydoc.getMap<FlowNode>('nodes');
          session.ydoc.transact(() => {
            const currentIds = new Set(nodes.map((n) => n.id));
            yNodes.forEach((_, key) => { if (!currentIds.has(key)) yNodes.delete(key); });

            nodes.forEach((node) => {
              // CHANGED: strip 'selected' and 'templates' (any computed field) before syncing
              const { selected, ...rest } = node;
              const { templates, ...cleanData } = rest.data;
              yNodes.set(node.id, { ...rest, data: cleanData });
            });
          });
        }
      }

      set((state) => ({
        drafts: {
          ...state.drafts,
          [activeEntityId]: {
            ...state.drafts[activeEntityId]!,
            nodes,
            isDirty: !draft.isCollaborative,
          },
        },
      }));
    },

    setEdges: (edges) => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;
      const draft = drafts[activeEntityId];
      if (!draft) return;

      if (draft.isCollaborative) {
        const session = getCollabSession(activeEntityId);
        if (session) {
          const yEdges = session.ydoc.getMap<FlowEdge>('edges');
          session.ydoc.transact(() => {
            const currentIds = new Set(edges.map((e) => e.id));
            yEdges.forEach((_, key) => { if (!currentIds.has(key)) yEdges.delete(key); });

            edges.forEach((edge) => {
              const { selected, ...cleanEdge } = edge;
              yEdges.set(edge.id, cleanEdge);
            });
          });
        }
      }

      set((state) => ({
        drafts: {
          ...state.drafts,
          [activeEntityId]: {
            ...state.drafts[activeEntityId]!,
            edges,
            isDirty: !draft.isCollaborative,
          },
        },
      }));
    },

    saveGraph: async () => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;
      const draft = drafts[activeEntityId];
      if (!draft) return;

      set((state) => ({
        drafts: { ...state.drafts, [activeEntityId]: { ...state.drafts[activeEntityId]!, isSaving: true, saveError: null } },
      }));

      try {
        let nodesToSave = draft.nodes;
        let edgesToSave = draft.edges;

        if (draft.isCollaborative) {
          const session = getCollabSession(activeEntityId);
          if (session) {
            nodesToSave = yMapToArray(session.ydoc.getMap<FlowNode>('nodes'));
            edgesToSave = yMapToArray(session.ydoc.getMap<FlowEdge>('edges'));
          }
        }

        // OPTIONAL: also strip templates before saving to Appwrite for cleanliness
        nodesToSave = nodesToSave.map(n => {
          const { templates, ...cleanData } = n.data;
          return { ...n, data: cleanData };
        });

        const dataToSave = JSON.stringify({ nodes: nodesToSave, edges: edgesToSave });
        const updated = await updateEntity(activeEntityId, { data: dataToSave });

        set((state) => ({
          drafts: {
            ...state.drafts,
            [activeEntityId]: { ...state.drafts[activeEntityId]!, entity: updated, isDirty: false, isSaving: false, lastSavedAt: Date.now() },
          },
          entities: state.entities.map((e) => (e.$id === updated.$id ? updated : e)),
        }));
      } catch (err) {
        set((state) => ({
          drafts: { ...state.drafts, [activeEntityId]: { ...state.drafts[activeEntityId]!, isSaving: false, saveError: String(err) } },
        }));
        throw err;
      }
    },

    // Collaboration
    enableCollaboration: (entityId) => {
      const { drafts, currentUser } = get();
      const draft = drafts[entityId];
      if (!draft || draft.isCollaborative) return;

      initCollabSession(entityId, draft, currentUser, set, get);

      set((state) => ({
        drafts: { ...state.drafts, [entityId]: { ...draft, isCollaborative: true, connectionStatus: 'connecting' } },
      }));
    },

    disableCollaboration: (entityId) => {
      set((state) => {
        const timers = { ...state._cursorThrottleTimers };
        if (timers[entityId]) {
          clearTimeout(timers[entityId]!);
          delete timers[entityId];
        }
        return { _cursorThrottleTimers: timers };
      });

      removeCollabSession(entityId);
      set((state) => ({
        drafts: {
          ...state.drafts,
          [entityId]: {
            ...state.drafts[entityId]!,
            isCollaborative: false,
            isSynced: false,
            connectionStatus: 'disconnected',
            connectionError: undefined,
          },
        },
        awarenessUsers: [],
      }));
    },

    currentIsDirty: () => get().currentDraft()?.isDirty ?? false,
    currentIsSaving: () => get().currentDraft()?.isSaving ?? false,

    updateCursorPosition: (position) => {
      const { activeEntityId, currentUser, _cursorThrottleTimers } = get();
      if (!activeEntityId) return;

      const updatedUser = { ...currentUser, cursor: position };
      set({ currentUser: updatedUser });

      const session = getCollabSession(activeEntityId);
      if (!session) return;
      if (_cursorThrottleTimers[activeEntityId]) return;

      const timer = setTimeout(() => {
        getCollabSession(activeEntityId)?.provider.awareness.setLocalStateField('user', get().currentUser);
        set((s) => ({
          _cursorThrottleTimers: { ...s._cursorThrottleTimers, [activeEntityId]: null },
        }));
      }, 40);

      set((s) => ({
        _cursorThrottleTimers: { ...s._cursorThrottleTimers, [activeEntityId]: timer },
      }));
    },
  }))
);

// ====================== SELECTORS ======================
import { useShallow } from 'zustand/react/shallow';

export const useCurrentNodes = () => useGraphStore(useShallow((s) => s.currentNodes()));
export const useCurrentEdges = () => useGraphStore(useShallow((s) => s.currentEdges()));
export const useAwarenessUsers = () => useGraphStore(useShallow((s) => s.awarenessUsers));
export const useCurrentDraft = () => useGraphStore(useShallow((s) => s.currentDraft()));
