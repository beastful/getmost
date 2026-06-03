import { teams, ID, databases, tables } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function readWorkspace(workspaceId: string): Promise<Workspace> {
  try {
    const row = await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: WORKSPACES_TABLE_NAME,
      rowId: workspaceId,
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
    console.error("Error reading workspace:", error);
    throw error;
  }
}
