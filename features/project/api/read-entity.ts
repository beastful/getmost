import { tables } from "@/lib/appwrite";
import { Entity } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function readEntity(entityId: string): Promise<Entity> {
  try {
    const row = await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: ENTITIES_TABLE_NAME,
      rowId: entityId,
    });
    return row as unknown as Entity;
  } catch (error) {
    console.error('Error reading entity:', error);
    throw error;
  }
}
