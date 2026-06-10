import { teams, ID, databases } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function readWorkspace(workspaceId: string): Promise<Workspace> {
  try {
    const document = await databases.getDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      workspaceId
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
    console.error("Error reading workspace:", error);
    throw error;
  }
}
