import { teams, ID, databases, Query, tables } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function listWorkspaces({
  ownerId,
  limit = 20,
  offset = 0,
  search,
}: {
  ownerId?: string;
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{
  workspaces: Workspace[];
  total: number;
}> {
  try {
    const queries: string[] = [];

    if (ownerId) {
      queries.push(Query.equal("ownerId", ownerId));
    }
    if (search) {
      queries.push(Query.search("name", search));
    }
    queries.push(Query.limit(limit), Query.offset(offset));

    const response = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: WORKSPACES_TABLE_NAME,
      queries,
    });

    return {
      workspaces: response.rows.map((row: any) => ({
        $id: row.$id,
        name: row.name,
        ownerId: row.ownerId,
        teamId: row.teamId,
        entities: row.entities,
        $createdAt: row.$createdAt,
        $updatedAt: row.$updatedAt,
      })),
      total: response.total,
    };
  } catch (error) {
    console.error("Error listing workspaces:", error);
    throw error;
  }
}
