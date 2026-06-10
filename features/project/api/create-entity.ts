import { readWorkspace } from "@/features/dashboard/api/read-workspace";
import { databases, ID, Permission, Role } from "@/lib/appwrite";
import { CreateEntityData, Entity } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function createEntity(data: CreateEntityData): Promise<Entity> {
    try {
        const workspace = await readWorkspace(data.workspaceId);

        const permissions = [
            Permission.read(Role.team(workspace.teamId)),
            Permission.update(Role.team(workspace.teamId)),
            Permission.delete(Role.user(workspace.ownerId)),
        ];

        const document = await databases.createDocument(
            DATABASE_ID,
            ENTITIES_COLLECTION_ID,
            ID.unique(),
            {
                name: data.name,
                description: data.description || '',
                folders: data.folders || [],
                editor: data.editor,
                data: data.data,
                metadata: data.metadata || '{}',
                workspaceId: data.workspaceId,
                public: data.public ?? false,
                featured: data.featured ?? false,
                store: data.store ?? false,
                price: data.price ?? 0,
            },
            permissions
        );

        return document as unknown as Entity;
    } catch (error) {
        console.error('Error creating entity:', error);
        throw error;
    }
}
