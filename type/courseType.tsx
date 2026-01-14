export type Course={
    courseId:string;
    courseName: string;
    type:string;
    createdAt:string;
    id:number;
    courseLayout:courseLayout;
}

export type courseLayout={
    courseName:string;
    courseDescription:string;
    courseId:string;
    level:string;
    totalChapters:number;
    chapters:chapter[];
}
export type chapter={
    chapterId:string;
    chapterTitle:string;
    subContent:string[]
}