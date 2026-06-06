import { createEntity } from '@/features/project/api/create-entity';
import { deleteEntity } from '@/features/project/api/delete-entity';
import { listEntities } from '@/features/project/api/list-entities';
import { readEntity } from '@/features/project/api/read-entity'
import { updateEntity } from '@/features/project/api/update-entity'
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { realtime } from '@/lib/appwrite';
import type { RealtimeSubscription } from 'appwrite';
import type { Entity } from '../types/types';
import type { CreateEntityData, UpdateEntityData } from '@/features/project/types/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

// ── Черновик конкретной сущности ──
interface Draft {
  entity: Entity;
  graphString: string;
  originalGraphString: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
}

// ── Состояние списка ──
interface ListState {
  entities: Entity[];
  total: number;
  isLoading: boolean;
  listError: string | null;
}

// ── Состояние редактора ──
interface EditorState {
  activeEntityId: string | null;        // текущий файл
  drafts: Record<string, Draft>;        // все открытые/изменённые файлы
}

interface GraphStore extends ListState, EditorState {
  // ── Список ──
  loadEntities: (params?: {
    workspaceId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;

  // ── Навигация между файлами ──
  openEntity: (entity: Entity) => void;
  switchEntity: (entityId: string) => Promise<void>;
  closeEntity: (entityId?: string) => void;

  // ── Редактирование текущего ──
  updateGraphString: (newString: string) => void;
  addNode: (nodeType: string, position?: { x: number; y: number }) => void;
  saveGraph: () => Promise<void>;
  updateEntityField: <K extends keyof Entity>(field: K, value: Entity[K]) => Promise<void>;

  // ── CRUD ──
  createNewEntity: (data: CreateEntityData) => Promise<Entity>;
  deleteEntity: (entityId: string) => Promise<void>;
  renameEntity: (entityId: string, name: string) => Promise<void>;

  // ── Селекторы (через get) ──
  currentEntity: () => Entity | null;
  currentDraft: () => Draft | null;
  currentGraphString: () => string;
  currentIsDirty: () => boolean;
  currentIsSaving: () => boolean;

  // ── Сброс при смене рабочей области ──
  resetWorkspace: () => void;

  // ── Realtime ──
  _applyRemoteUpdate: (remote: Entity) => void;
}

// ── Realtime (module-level, не сериализуется) ──
let activeSubscription: RealtimeSubscription | null = null;
let subscribedEntityId: string | null = null;

function subscribeToRealtime(entityId: string, store: GraphStore) {
  if (subscribedEntityId === entityId) return;

  activeSubscription?.unsubscribe();
  subscribedEntityId = entityId;

  const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents.${entityId}`;

  realtime.subscribe(channel, (response) => {
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      store._applyRemoteUpdate(response.payload as unknown as Entity);
    }
  }).then((sub) => {
    if (subscribedEntityId === entityId) {
      activeSubscription = sub;
    } else {
      sub.unsubscribe(); // race condition: уже переключились
    }
  });
}

function unsubscribeRealtime() {
  activeSubscription?.unsubscribe();
  activeSubscription = null;
  subscribedEntityId = null;
}

export const useGraphStore = create<GraphStore>()(
  devtools((set, get) => ({
    // ═══════════════════════════════════════
    // НАЧАЛЬНОЕ СОСТОЯНИЕ
    // ═══════════════════════════════════════

    entities: [],
    total: 0,
    isLoading: false,
    listError: null,

    activeEntityId: null,
    drafts: {},

    // ═══════════════════════════════════════
    // СЕЛЕКТОРЫ (computed, не храним в state)
    // ═══════════════════════════════════════

    currentEntity: () => {
      const { activeEntityId, drafts } = get();
      return activeEntityId ? drafts[activeEntityId]?.entity ?? null : null;
    },

    currentDraft: () => {
      const { activeEntityId, drafts } = get();
      return activeEntityId ? drafts[activeEntityId] ?? null : null;
    },

    currentGraphString: () => {
      return get().currentDraft()?.graphString ?? '';
    },

    currentIsDirty: () => {
      return get().currentDraft()?.isDirty ?? false;
    },

    currentIsSaving: () => {
      return get().currentDraft()?.isSaving ?? false;
    },

    // ═══════════════════════════════════════
    // СПИСОК
    // ═══════════════════════════════════════

    loadEntities: async (params = {}) => {
      set({ isLoading: true, listError: null });
      try {
        const result = await listEntities(params);
        set({
          entities: result.entities,
          total: result.total,
          isLoading: false,
        });
      } catch (err) {
        set({ listError: String(err), isLoading: false });
      }
    },

    // ═══════════════════════════════════════
    // СБРОС ПРИ СМЕНЕ РАБОЧЕЙ ОБЛАСТИ
    // ═══════════════════════════════════════

    resetWorkspace: () => {
      unsubscribeRealtime();
      set({
        activeEntityId: null,
        drafts: {},
        entities: [],
        total: 0,
        listError: null,
        isLoading: false,
      });
    },

    // ═══════════════════════════════════════
    // НАВИГАЦИЯ МЕЖДУ ФАЙЛАМИ
    // ═══════════════════════════════════════

    openEntity: (entity) => {
      const { drafts, activeEntityId } = get();

      // 1. Отписываемся от старой сущности
      if (activeEntityId && activeEntityId !== entity.$id) {
        // Старая остаётся в drafts — изменения не теряются
      }

      // 2. Создаём черновик, если ещё нет
      const existingDraft = drafts[entity.$id];
      const newDrafts = { ...drafts };

      if (!existingDraft) {
        newDrafts[entity.$id] = {
          entity,
          graphString: entity.data,
          originalGraphString: entity.data,
          isDirty: false,
          isSaving: false,
          saveError: null,
          lastSavedAt: Date.now(),
        };
      }

      // 3. Обновляем список (метаданные могли измениться)
      set((state) => ({
        activeEntityId: entity.$id,
        drafts: newDrafts,
        entities: state.entities.map((e) =>
          e.$id === entity.$id ? entity : e
        ),
      }));

      // 4. Подписываемся на realtime
      subscribeToRealtime(entity.$id, get());
    },

    switchEntity: async (entityId) => {
      const { drafts, openEntity } = get();

      // Если черновик уже есть — просто переключаемся
      if (drafts[entityId]) {
        set({ activeEntityId: entityId });
        subscribeToRealtime(entityId, get());
        return;
      }

      // Иначе загружаем с сервера
      try {
        const entity = await readEntity(entityId);
        openEntity(entity);
      } catch (err) {
        set({ listError: String(err) });
      }
    },

    closeEntity: (entityId) => {
      const { activeEntityId, drafts } = get();
      const targetId = entityId ?? activeEntityId;
      if (!targetId) return;

      const newDrafts = { ...drafts };
      const draft = newDrafts[targetId];

      // Если чистый — удаляем из памяти
      if (draft && !draft.isDirty) {
        delete newDrafts[targetId];
      }

      // Если закрываем текущий — сбрасываем activeEntityId
      const newActiveId = activeEntityId === targetId ? null : activeEntityId;

      if (newActiveId === null) {
        unsubscribeRealtime();
      }

      set({
        drafts: newDrafts,
        activeEntityId: newActiveId,
      });
    },

    // ═══════════════════════════════════════
    // РЕДАКТИРОВАНИЕ
    // ═══════════════════════════════════════

    updateGraphString: (newString) => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;

      const draft = drafts[activeEntityId];
      if (!draft) return;

      const newDrafts = {
        ...drafts,
        [activeEntityId]: {
          ...draft,
          graphString: newString,
          isDirty: newString !== draft.originalGraphString,
        },
      };

      set({ drafts: newDrafts });
    },

    addNode: (nodeType, position = { x: 100, y: 100 }) => {
      const { currentGraphString, updateGraphString } = get();
      let graph = { nodes: [], edges: [] };
      try {
        graph = JSON.parse(currentGraphString() || '{}');
        if (!graph.nodes) graph.nodes = [];
        if (!graph.edges) graph.edges = [];
      } catch {
        // пустой граф
      }

      const newNode = {
        id: `${nodeType}-${Date.now()}`,
        type: 'flowNode',
        position,
        data: { nodeType, state: {} },
      };
      graph.nodes.push(newNode);
      updateGraphString(JSON.stringify(graph));
    },

    // ═══════════════════════════════════════
    // СОХРАНЕНИЕ
    // ═══════════════════════════════════════

    saveGraph: async () => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;

      const draft = drafts[activeEntityId];
      if (!draft || !draft.isDirty) return;

      // Помечаем сохраняющимся
      set({
        drafts: {
          ...drafts,
          [activeEntityId]: { ...draft, isSaving: true, saveError: null },
        },
      });

      try {
        const updated = await updateEntity(activeEntityId, {
          data: draft.graphString,
        });

        const savedDraft: Draft = {
          ...draft,
          entity: updated,
          graphString: updated.data,
          originalGraphString: updated.data,
          isDirty: false,
          isSaving: false,
          lastSavedAt: Date.now(),
        };

        set({
          drafts: { ...drafts, [activeEntityId]: savedDraft },
          entities: get().entities.map((e) =>
            e.$id === updated.$id ? updated : e
          ),
        });
      } catch (err) {
        set({
          drafts: {
            ...drafts,
            [activeEntityId]: {
              ...draft,
              isSaving: false,
              saveError: String(err),
            },
          },
        });
        throw err;
      }
    },

    updateEntityField: async (field, value) => {
      const { activeEntityId, drafts } = get();
      if (!activeEntityId) return;

      const draft = drafts[activeEntityId];
      if (!draft) return;

      set({
        drafts: {
          ...drafts,
          [activeEntityId]: { ...draft, isSaving: true, saveError: null },
        },
      });

      try {
        const updated = await updateEntity(activeEntityId, {
          [field]: value,
        } as UpdateEntityData);

        const newDraft: Draft = {
          ...draft,
          entity: { ...draft.entity, ...updated, [field]: value },
          isSaving: false,
          lastSavedAt: Date.now(),
        };

        set({
          drafts: { ...drafts, [activeEntityId]: newDraft },
          entities: get().entities.map((e) =>
            e.$id === updated.$id ? updated : e
          ),
        });
      } catch (err) {
        set({
          drafts: {
            ...drafts,
            [activeEntityId]: { ...draft, isSaving: false, saveError: String(err) },
          },
        });
        throw err;
      }
    },

    // ═══════════════════════════════════════
    // CRUD
    // ═══════════════════════════════════════

    createNewEntity: async (data) => {
      const entity = await createEntity(data);
      set((state) => ({
        entities: [entity, ...state.entities],
        total: state.total + 1,
      }));
      return entity;
    },

    deleteEntity: async (entityId) => {
      await deleteEntity(entityId);
      const { activeEntityId, drafts, closeEntity } = get();

      const newDrafts = { ...drafts };
      delete newDrafts[entityId];

      set((state) => ({
        entities: state.entities.filter((e) => e.$id !== entityId),
        total: state.total - 1,
        drafts: newDrafts,
        activeEntityId: activeEntityId === entityId ? null : activeEntityId,
      }));

      if (activeEntityId === entityId) {
        unsubscribeRealtime();
      }
    },

    renameEntity: async (entityId, name) => {
      const updated = await updateEntity(entityId, { name });
      const { drafts, activeEntityId } = get();

      const newDrafts = { ...drafts };
      if (newDrafts[entityId]) {
        newDrafts[entityId] = {
          ...newDrafts[entityId],
          entity: { ...newDrafts[entityId].entity, name, $updatedAt: updated.$updatedAt },
        };
      }

      set({
        drafts: newDrafts,
        entities: get().entities.map((e) =>
          e.$id === entityId ? { ...e, name, $updatedAt: updated.$updatedAt } : e
        ),
      });
    },

    // ═══════════════════════════════════════
    // REALTIME
    // ═══════════════════════════════════════

    _applyRemoteUpdate: (remote) => {
      const { activeEntityId, drafts } = get();

      // Обновляем в списке всегда
      set((state) => ({
        entities: state.entities.map((e) =>
          e.$id === remote.$id ? remote : e
        ),
      }));

      // Если нет черновика — нечего обновлять
      const draft = drafts[remote.$id];
      if (!draft) return;

      // Подтверждение нашего сохранения?
      const isOurAck =
        !draft.isSaving &&
        draft.lastSavedAt &&
        Date.now() - draft.lastSavedAt < 3000 &&
        remote.data === draft.graphString;

      if (isOurAck) {
        // Наше сохранение подтверждено — ничего не делаем
        return;
      }

      // Чужое обновление
      if (draft.isDirty) {
        // Конфликт: помечаем ошибкой, но НЕ перезаписываем
        const newDrafts = {
          ...drafts,
          [remote.$id]: {
            ...draft,
            saveError: 'Конфликт: на сервере новая версия. Сохраните или перезагрузите.',
          },
        };
        set({ drafts: newDrafts });
        return;
      }

      // Безопасно применяем
      const newDrafts = {
        ...drafts,
        [remote.$id]: {
          ...draft,
          entity: remote,
          graphString: remote.data,
          originalGraphString: remote.data,
          isDirty: false,
        },
      };
      set({ drafts: newDrafts });
    },
  }))
);
