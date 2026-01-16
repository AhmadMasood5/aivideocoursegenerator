CREATE TABLE "chapter_content_slides" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chapter_content_slides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"courseId" varchar(255) NOT NULL,
	"chapterId" varchar(255) NOT NULL,
	"slideId" varchar(255) NOT NULL,
	"slideIndex" integer NOT NULL,
	"audioFileName" varchar(255),
	"caption" json,
	"audioFileUrl" varchar(1024),
	"narration" json NOT NULL,
	"html" text,
	"revealData" json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "courses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" varchar(255) NOT NULL,
	"courseId" varchar(255) NOT NULL,
	"courseName" varchar(255) NOT NULL,
	"userInput" varchar(1024) NOT NULL,
	"type" varchar(255) NOT NULL,
	"courseLayout" json,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "courses_courseId_unique" UNIQUE("courseId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"credit" integer DEFAULT 2,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chapter_content_slides" ADD CONSTRAINT "chapter_content_slides_courseId_courses_courseId_fk" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("courseId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_userId_users_email_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;