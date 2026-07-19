export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  CACHE: KVNamespace;
  GOAPI_API_KEY: string;
  SECTORS_APP_API_KEY: string;
}
