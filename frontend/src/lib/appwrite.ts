import { Client, Databases } from "appwrite";

// Vite inyecta estos valores en tiempo de compilación
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);

export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    collectionId: import.meta.env.VITE_APPWRITE_COLLECTION_ID,
    envCollectionId: import.meta.env.VITE_APPWRITE_ENV_COLLECTION_ID,
};