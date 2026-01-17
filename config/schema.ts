import { integer, json, pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  credit: integer().default(2)
});

export const coursesTable = pgTable("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull().references(() => usersTable.email),
  courseId: varchar({ length: 255 }).notNull().unique(), // MUST have .unique()
  courseName: varchar({ length: 255 }).notNull(),
  userInput: varchar({ length: 1024 }).notNull(),
  type: varchar({ length: 255 }).notNull(),
  courseLayout: json(),
  createdAt: timestamp().defaultNow(),
});

export const chapterContentSlides = pgTable('chapter_content_slides', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: varchar({ length: 255 }).notNull().references(() => coursesTable.courseId),
  chapterId: varchar({ length: 255 }).notNull(),
  slideId: varchar({ length: 255 }).notNull(),
  slideIndex: integer().notNull(),
  audioFileName: varchar({ length: 255 }),
  caption: json("caption"),
  audioFileUrl: varchar({ length: 1024 }),
  narration: json().notNull(),
  html: text(),
  revealData: json().notNull(),
});