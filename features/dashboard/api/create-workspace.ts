import { teams, ID, databases, Permission, Role } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    try {
        // 1. Create Appwrite team
        const team = await teams.create({
            teamId: ID.unique(),
            name: data.name
        });

        // 2. Permissions: owner (full control), team members (read, write)
        const permissions = [
            Permission.read(Role.user(data.ownerId)),
            Permission.update(Role.user(data.ownerId)),
            Permission.delete(Role.user(data.ownerId)),
            Permission.read(Role.team(team.$id)),
            Permission.read(Role.any()),
            Permission.update(Role.team(team.$id)),
        ];

        // 3. Insert document into 'workspaces' collection with permissions
        const document = await databases.createDocument(
            DATABASE_ID,
            WORKSPACES_COLLECTION_ID,
            ID.unique(),
            {
                name: data.name,
                ownerId: data.ownerId,
                teamId: team.$id,
                entities: data.entities || [],
            },
            permissions
        );

        return {
            $id: document.$id,
            name: document.name,
            ownerId: document.ownerId,
            teamId: document.teamId,
            entities: document.entities,
            $createdAt: document.$createdAt,
            $updatedAt: document.$updatedAt,
        };
    } catch (error) {
        console.error("Error creating workspace:", error);
        throw error;
    }
}
