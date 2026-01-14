'use client'
import React, { useEffect, useState } from 'react'
import CourseInfoCard from './_components/courseinfocard'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { Course } from '@/type/courseType'
import CourseChapters from './_components/CourseChapters'

function CoursePreview() {
  const { courseid } = useParams()
  const [courseDetails, setCourseDetails] = useState<Course | null>(null)

  useEffect(() => {
    const getCourseDetails = async () => {
      try {
        const result = await axios.get(`/api/course?courseId=${courseid}`)
        setCourseDetails(result.data)
      } catch (error) {
        console.error('Error fetching course details:', error)
      }
    }

    if (courseid) {
      getCourseDetails()
    }
  }, [courseid])

  return (
    <div className='flex flex-col items-center'>
     
        <CourseInfoCard course={courseDetails} />
        <CourseChapters course={courseDetails}/>
    </div>
  )
}

export default CoursePreview
