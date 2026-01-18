import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Course } from "@/type/courseType";
import { Calendar, Dot, Layers, Play } from "lucide-react";
import React from "react";
import moment from "moment";
import Link from "next/link";

type Props = {
  courseItem: Course;
};

function CourseListCard({ courseItem }: Props) {
  return (
    <Card className="bg-white z-10 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        {/* Title + Level */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="font-semibold text-base sm:text-md truncate">
            {courseItem.courseName}
          </h2>
          <h2 className="text-primary text-xs sm:text-sm bg-primary/10 p-1 px-2 border rounded-full border-primary w-fit">
            {courseItem.courseLayout.level}
          </h2>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center mt-2">
          <h2 className="flex items-center gap-1 sm:gap-2 text-slate-600 text-xs bg-slate-400/10 p-1 px-2 border rounded-full border-slate-400">
            <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
            {courseItem.courseLayout.totalChapters}
          </h2>
          <h2 className="flex items-center gap-1 sm:gap-2 text-slate-600 text-xs bg-slate-400/10 p-1 px-2 border rounded-full border-slate-400">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            {moment(courseItem.createdAt).format("MMM DD, YYYY")}
            <Dot className="h-3 w-3 sm:h-4 sm:w-4" />
            {moment(courseItem.createdAt).fromNow()}
          </h2>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-sm text-slate-700">Keep Learning...</p>
          <Link href={"/course/" + courseItem.courseId} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto flex items-center gap-2">
              Watch Now
              <Play className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default CourseListCard;
