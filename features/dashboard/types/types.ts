// Types
export interface Workspace {
    $id: string;
    name: string;
    ownerId: string;      // Appwrite user ID
    teamId: string;       // Appwrite team ID (created automatically)
    entities: string[];   // Array of related document IDs (e.g., project IDs)
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateWorkspaceData {
    name: string;
    ownerId: string;
    entities?: string[];  // optional initial entities
}

export interface UpdateWorkspaceData {
    name?: string;
    ownerId?: string;
    teamId?: string;
    entities?: string[];
}
