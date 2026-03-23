import { Client, Databases } from "appwrite";

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('69ab0d85002721c4effc');

export const databases = new Databases(client);

export const APPWRITE_CONFIG = {
    databaseId: '69ab0f140034a79ea5b7',
    collectionId: 'venestock',
    envCollectionId: 'venestock_env',
};
