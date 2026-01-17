'use client'
import { Course } from '@/type/courseType';
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import CourseListCard from './courseListCard';

const CourseList = () => {
  const [courseList , setCourseList] = useState<Course[]>([]);
  useEffect(()=>{
    getCourseList();
  },[])
  const getCourseList =async()=>{
    const result =await axios.get('/api/course');
    console.log(result.data)
    setCourseList(result.data)

  }
  return (
    <div className='max-w-6xl mt-10'>
      <h2 className='font-bold text-2xl '>My Courses</h2>
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5'>
        {courseList.map((course, index)=>(
          <CourseListCard courseItem={course} key={index}/>
        ))}
      </div>
    </div>
  )
}

export default CourseList