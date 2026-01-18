'use client'
import { Course } from '@/type/courseType';
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import CourseListCard from './courseListCard';

const CourseList = () => {
  const [courseList, setCourseList] = useState<Course[]>([]);

  const getCourseList = async () => {
    try {
      const result = await axios.get('/api/course');
      console.log(result.data);
      setCourseList(result.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  useEffect(() => {
    getCourseList();
  }, []);

  return (
    <div className="max-w-6xl mt-10 px-4 sm:px-6 lg:px-8">
      <h2 className="font-bold text-xl sm:text-2xl mb-6 text-center sm:text-left">
        My Courses
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {courseList.map((course, index) => (
          <CourseListCard courseItem={course} key={course.courseId || index} />
        ))}
      </div>
    </div>
  );
};

export default CourseList;
