import { useEffect, useRef } from 'react';
import { realtime } from '@/lib/appwrite';
import { useGraphStore } from '../store/graph-store';
import type { RealtimeSubscription } from 'appwrite'; // или из вашего SDK

export function useRealtimeSync(entityId: string | null) {
    const { isDirty, updateGraphString, updateEntityMetadata, resetDirty } = useGraphStore();
    const isLocalChange = useRef(false);

    useEffect(() => {
        if (!entityId) return;

        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
        const collectionId = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;
        const channel = `databases.${databaseId}.collections.${collectionId}.documents.${entityId}`;

        let subscription: RealtimeSubscription | null = null;

        const setup = async () => {
            subscription = await realtime.subscribe(channel, (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                    const remoteEntity = response.payload;

                    if (isLocalChange.current) {
                        isLocalChange.current = false;
                        return;
                    }

                    if (isDirty) {
                        console.warn('Remote update ignored – local unsaved changes');
                        return;
                    }

                    updateGraphString(remoteEntity.data);
                    updateEntityMetadata(remoteEntity);
                    resetDirty();
                }
            });
        };

        setup();

        return () => {
            subscription?.unsubscribe(); // метод объекта, а не вызов функции
        };
    }, [entityId, isDirty, updateGraphString, updateEntityMetadata, resetDirty]);
}
