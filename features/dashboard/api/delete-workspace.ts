import { teams, ID, databases } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";
import { readWorkspace } from "./read-workspace";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function deleteWorkspace(workspaceId: string, deleteTeam = false): Promise<void> {
  try {
    // First fetch to get teamId
    const workspace = await readWorkspace(workspaceId);

    // Delete the document from the collection
    await databases.deleteDocument(
      DATABASE_ID,
      WORKSPACES_COLLECTION_ID,
      workspaceId
    );

    // Optionally delete the associated Appwrite team
    if (deleteTeam && workspace.teamId) {
      await teams.delete(workspace.teamId);
    }
  } catch (error) {
    console.error("Error deleting workspace:", error);
    throw error;
  }
}
