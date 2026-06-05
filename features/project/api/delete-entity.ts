import { tables } from "@/lib/appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function deleteEntity(entityId: string): Promise<void> {
  try {
    await tables.deleteRow({
      databaseId: DATABASE_ID,
      tableId: ENTITIES_TABLE_NAME,
      rowId: entityId,
    });
  } catch (error) {
    console.error('Error deleting entity:', error);
    throw error;
  }
}
