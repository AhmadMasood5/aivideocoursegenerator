import { drizzle } from "drizzle-orm/neon-http"; // or neon-serverless depending on version
import { neon } from "@neondatabase/serverless";

let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!database) {
    const sql = neon(process.env.DATABASE_URL!);
    database = drizzle(sql);
  }

  return database;
}
