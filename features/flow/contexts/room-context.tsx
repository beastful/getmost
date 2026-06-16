'use client';

import * as React from 'react';

export type RoomContextValue = {
    roomId: string | null;
    setRoomId: (roomId: string | null) => void;
    isConnected: boolean;
    setIsConnected: (value: boolean) => void;
};

const RoomContext = React.createContext<RoomContextValue | null>(null);

export function RoomProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [roomId, setRoomId] = React.useState<string | null>(null);
    const [isConnected, setIsConnected] = React.useState(false);

    const value = React.useMemo(
        () => ({
            roomId,
            setRoomId,
            isConnected,
            setIsConnected,
        }),
        [roomId, isConnected]
    );

    return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
    const context = React.useContext(RoomContext);

    if (context === null) {
        throw new Error('useRoom must be used within a RoomProvider');
    }

    return context;
}
