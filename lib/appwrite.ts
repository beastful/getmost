import { Client, Account, Databases, Storage, Functions, Teams, TablesDB, Realtime } from 'appwrite';
import { CLIENT_PUBLIC_FILES_PATH } from 'next/dist/shared/lib/constants';

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setDevKey(process.env.NEXT_PRIVATE_APPWRITE_DEV_KEY!)

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const teams = new Teams(client);
export const tables = new TablesDB(client);
export const realtime = new Realtime(client);

export { client };
export { ID } from "appwrite";
export { Query } from "appwrite";
export { Permission } from "appwrite";
export { Role } from "appwrite";
