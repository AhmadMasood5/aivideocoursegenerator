export type Course={
    courseId:string;
    courseName: string;
    type:string;
    createdAt:string;
    id:number;
    courseLayout:courseLayout;
    chapterContentSlides:chapterContentSlide[];
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

export type chapterContentSlide={
 id:number;
    courseId:string;
    chapterId:string;
    slideId:string;
    slideIndex:number;
    audioFileName:string;
    narration:{
        fullText:string;
    },
    html:string;
    revealData:string[];
}