import { teams, ID, databases, tables } from "@/lib/appwrite";
import { Workspace, CreateWorkspaceData } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<Omit<CreateWorkspaceData, "ownerId">>
): Promise<Workspace> {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.entities !== undefined) updateData.entities = JSON.stringify(data.entities);

    const updated = await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: WORKSPACES_TABLE_NAME,
      rowId: workspaceId,
      data: updateData,
    });

    return {
      $id: updated.$id,
      name: updated.name,
      ownerId: updated.ownerId,
      teamId: updated.teamId,
      entities: JSON.parse(updated.entities),
      $createdAt: updated.$createdAt,
      $updatedAt: updated.$updatedAt,
    };
  } catch (error) {
    console.error("Error updating workspace:", error);
    throw error;
  }
}
