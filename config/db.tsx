import { drizzle } from "drizzle-orm/neon-http"; // or neon-serverless depending on version
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// This works: drizzle accepts the query function
export const db = drizzle(sql);
