import { databases } from "@/lib/appwrite";
import { Entity } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function readEntity(entityId: string): Promise<Entity> {
  try {
    const document = await databases.getDocument(
      DATABASE_ID,
      ENTITIES_COLLECTION_ID,
      entityId
    );
    return document as unknown as Entity;
  } catch (error) {
    console.error('Error reading entity:', error);
    throw error;
  }
}