import { tables, Query } from "@/lib/appwrite";
import {Entity } from "../types/types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ENTITIES_TABLE_NAME = process.env.NEXT_PUBLIC_APPWRITE_ENTITIES_COLLECTION_ID!;

export async function listEntities({
  workspaceId,
  public: isPublic,
  featured,
  store,
  search,
  limit = 20,
  offset = 0,
}: {
  workspaceId?: string;
  public?: boolean;
  featured?: boolean;
  store?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  entities: Entity[];
  total: number;
}> {
  try {
    const queries: string[] = [];
    if (workspaceId) queries.push(Query.equal('workspaceId', workspaceId));
    if (isPublic !== undefined) queries.push(Query.equal('public', isPublic));
    if (featured !== undefined) queries.push(Query.equal('featured', featured));
    if (store !== undefined) queries.push(Query.equal('store', store));
    if (search) queries.push(Query.search('name', search));
    queries.push(Query.limit(limit), Query.offset(offset));

    const response = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: ENTITIES_TABLE_NAME,
      queries,
    });

    return {
      entities: response.rows as unknown as Entity[],
      total: response.total,
    };
  } catch (error) {
    console.error('Error listing entities:', error);
    throw error;
  }
}
