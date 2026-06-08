import { teams, ID, tables, Permission, Role } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

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

        // 3. Insert row into 'workspaces' table with permissions
        const row = await tables.createRow({
            databaseId: DATABASE_ID,
            tableId: WORKSPACES_TABLE_NAME,
            rowId: ID.unique(),
            data: {
                name: data.name,
                ownerId: data.ownerId,
                teamId: team.$id,
                entities: data.entities || [],
            },
            permissions,
        });

        return {
            $id: row.$id,
            name: row.name,
            ownerId: row.ownerId,
            teamId: row.teamId,
            entities: row.entities,
            $createdAt: row.$createdAt,
            $updatedAt: row.$updatedAt,
        };
    } catch (error) {
        console.error("Error creating workspace:", error);
        throw error;
    }
}
