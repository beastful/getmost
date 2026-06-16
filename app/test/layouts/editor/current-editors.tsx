'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarGroup } from '@/components/ui/avatar';
import { getCurrentEditors, getCurrentEntityRoom } from './appwrite-sync';

type Editor = {
    userId: string;
    sessionId: string;
    email: string;
    name: string;
    entityId: string;
    joinedAt: number;
};

export function CurrentEditors() {
    const [editors, setEditors] = useState<Editor[]>([]);

    useEffect(() => {
        const session = getCurrentEntityRoom();
        if (!session) return;

        const update = () => {
            setEditors(getCurrentEditors() as Editor[]);
        };

        session.provider.on('awarenessUpdate', update);
        session.provider.on('awarenessChange', update);
        update();

        return () => {
            session.provider.off('awarenessUpdate', update);
            session.provider.off('awarenessChange', update);
        };
    }, []);

    if (editors.length === 0) return null;

    return (
        <AvatarGroup className="grayscale">
            {editors.map((editor) => (
                <Avatar key={`${editor.userId}:${editor.sessionId}`}>
                    <AvatarFallback>
                        {(editor.name?.[0] || editor.email?.[0] || '?').toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            ))}
        </AvatarGroup>
    );
}
