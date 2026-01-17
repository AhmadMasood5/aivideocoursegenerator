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



export type CaptionChunk = {
  text: string;
  timestamp: [number, number];
};

export type Caption = {
  chunks: CaptionChunk[];
  text?: string;
};

export type chapterContentSlide = {
  id: number;
  courseId: string;
  chapterId: string;
  slideId: string;
  slideIndex: number;
  audioFileName: string | null;
  audioFileUrl: string | null;
  narration: { fullText: string } | null;
  caption: Caption | null; // ✅ Changed from { chunks: string[] }
  html: string | null;
  revealData: string[] | null;
};
