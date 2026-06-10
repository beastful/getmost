import { databases } from "@/lib/appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function deleteEntity(entityId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ENTITIES_COLLECTION_ID,
      entityId
    );
  } catch (error) {
    console.error('Error deleting entity:', error);
    throw error;
  }
}
