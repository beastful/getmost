import { tables } from "@/lib/appwrite";
import { UpdateEntityData, Entity } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function updateEntity(entityId: string, data: UpdateEntityData): Promise<Entity> {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.folders !== undefined) updateData.folders = data.folders;
    if (data.editor !== undefined) updateData.editor = data.editor;
    if (data.data !== undefined) updateData.data = data.data;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.public !== undefined) updateData.public = data.public;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.store !== undefined) updateData.store = data.store;
    if (data.price !== undefined) updateData.price = data.price;

    const updated = await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: ENTITIES_TABLE_NAME,
      rowId: entityId,
      data: updateData,
    });
    return updated as unknown as Entity;
  } catch (error) {
    console.error('Error updating entity:', error);
    throw error;
  }
}
