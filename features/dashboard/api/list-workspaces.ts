import { teams, ID, databases, Query } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

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

    const response = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      queries
    );

    return {
      workspaces: response.documents.map((doc: any) => ({
        $id: doc.$id,
        name: doc.name,
        ownerId: doc.ownerId,
        teamId: doc.teamId,
        entities: doc.entities,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
      })),
      total: response.total,
    };
  } catch (error) {
    console.error("Error listing workspaces:", error);
    throw error;
  }
}
