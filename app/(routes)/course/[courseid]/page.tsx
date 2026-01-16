'use client'
import React, { useEffect, useState } from 'react'
import CourseInfoCard from './_components/courseinfocard'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { Course } from '@/type/courseType'
import CourseChapters from './_components/CourseChapters'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'

function CoursePreview() {
  const { courseid } = useParams()
  const { user, isLoaded } = useUser() // Add isLoaded
  const [courseDetails, setCourseDetails] = useState<Course | null>(null)
  const [userCredits, setUserCredits] = useState<number | null>(null)

  useEffect(() => {
    const getCourseDetails = async () => {
      const loadingToast = toast.loading('Fetching Course Details...')
      try {
        const result = await axios.get(`/api/course?courseId=${courseid}`)
        setCourseDetails(result.data)
        toast.success('Course Details Fetched Successfully!', { id: loadingToast })
        
        if(result.data?.chapterContentSlides?.length === 0){
          toast.dismiss(loadingToast)
          
          // Wait for Clerk to load before checking credits
          if (!isLoaded) {
            console.log('⏳ Waiting for Clerk to load...')
            toast.loading('Loading user information...')
            return
          }
          
          checkCreditsAndGenerate(result?.data)
        }
      } catch (error) {
        toast.error('Failed to fetch course details', { id: loadingToast })
        console.error('Error fetching course details:', error)
      }
    }

    // Only fetch course when both courseid and Clerk are ready
    if (courseid && isLoaded) {
      getCourseDetails()
    }
  }, [courseid, isLoaded]) // Add isLoaded to dependencies

  const checkCreditsAndGenerate = async (course: Course) => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress
      
      if (!userEmail) {
        console.error('❌ User email not available')
        console.log('User object:', user)
        console.log('Is loaded:', isLoaded)
        toast.error('User email not found. Please sign in again.')
        return
      }

      console.log('📧 Checking credits for email:', userEmail)
      
      // Fetch user credits
      const creditsResponse = await axios.get(`/api/user-credits?email=${userEmail}`)
      
      console.log('📥 Credits response:', creditsResponse.data)
      
      const credits = creditsResponse.data.credits
      
      setUserCredits(credits)
      
      if (credits <= 0) {
        toast.error('Insufficient credits. Please purchase more credits to generate content.', {
          duration: 5000
        })
        console.log('❌ No credits available. Skipping content generation.')
        return
      }
      
      console.log(`✓ User has ${credits} credits available`)
      // Proceed with generation
      generateVideoContent(course)
      
    } catch (error: any) {
      console.error('❌ Error checking credits:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      // If user doesn't exist, create them with default credits
      if (error.response?.status === 404) {
        console.log('📝 User not found, attempting to create...')
        toast.loading('Setting up your account...')
        
        try {
          // Create user with default credits
          await axios.post('/api/create-user', {
            email: user?.primaryEmailAddress?.emailAddress,
            name: user?.fullName || 'User'
          })
          
          // Retry credit check
          const retryResponse = await axios.get(`/api/user-credits?email=${user?.primaryEmailAddress?.emailAddress}`)
          const credits = retryResponse.data.credits
          setUserCredits(credits)
          
          toast.success('Account created! Starting generation...')
          generateVideoContent(course)
          
        } catch (createError) {
          console.error('Failed to create user:', createError)
          toast.error('Could not verify credits. Please contact support.')
        }
      } else {
        toast.error('Could not verify credits. Content generation skipped.', {
          duration: 5000
        })
      }
    }
  }

  const generateVideoContent = async (course: Course) => {
    const generatingToast = toast.loading('Generating Video Content...')
    
    try {
      const allSlidesMetadata = []
      
      for(let i = 0; i < course?.courseLayout?.chapters?.length; i++){
        const chapter = course.courseLayout.chapters[i]
        
        const hasExistingSlides = course.chapterContentSlides?.some(
          slide => slide.chapterId === chapter.chapterId
        )
        
        if (hasExistingSlides) {
          console.log(`✓ Skipping chapter ${i+1}: ${chapter.chapterTitle} - content already exists`)
          continue
        }
        
        toast.loading(
          `Generating content for chapter ${i+1} of ${course?.courseLayout?.chapters?.length}`, 
          { id: generatingToast }
        )
        
        try {
          console.log(`\n--- Chapter ${i+1}: ${chapter.chapterTitle} ---`);
          
          const result = await axios.post('/api/generate-video-content', {
            courseName: course.courseName,
            chapterTitle: chapter.chapterTitle,
            chapterSlug: chapter.chapterId,
            subContent: chapter.subContent
          }, {
            timeout: 300000
          })
          
          console.log('✓ Video content generated:', result.data)
          
          const slidesMetadata = result.data
          
          if (!slidesMetadata || typeof slidesMetadata !== 'object') {
            throw new Error('Invalid response from video content API')
          }

          const slidesArray = []
          for (const key in slidesMetadata) {
            const slide = slidesMetadata[key]
            
            if (!slide || typeof slide !== 'object') {
              console.warn(`⚠️ Invalid slide at key ${key}`)
              continue
            }
            
            if (!slide.slideId) {
              console.error(`❌ Slide ${key} missing slideId`)
              continue
            }
            
            const slideData = {
              courseId: course.courseId,
              chapterId: chapter.chapterId,
              slideId: slide.slideId,
              slideIndex: slide.slideIndex,
              audioFileName: slide.audioFileName,
              narration: slide.narration,
              revealData: slide.revealData,
              html: slide.html || null
            }
            
            slidesArray.push(slideData)
            allSlidesMetadata.push(slideData)
          }
          
          if (slidesArray.length === 0) {
            throw new Error('No valid slides generated')
          }
          
          console.log(`✓ Chapter ${i+1}: ${slidesArray.length} slides ready`)
          
          toast.loading(
            `Generating audio for chapter ${i+1}...`, 
            { id: generatingToast }
          )
          
          try {
            const audioResult = await axios.post('/api/generate-audio', {
              slides: slidesArray
            }, {
              timeout: 300000
            })
            
            console.log(`✓ Audio generated for chapter ${i+1}:`, audioResult.data)
            
            const slidesWithAudio = slidesArray.map((slide, idx) => {
              const audioData = audioResult.data.results?.[idx]
              return {
                ...slide,
                audioFileUrl: audioData?.audioUrl || null,
                caption: audioData?.captions || null
              }
            })
            
            console.log('✓ Slides with audio:', slidesWithAudio.length)
            
            toast.loading(
              `Saving chapter ${i+1} to database...`, 
              { id: generatingToast }
            )
            
            try {
              const saveResult = await axios.post('/api/save-slides', {
                courseId: course.courseId,
                chapterId: chapter.chapterId,
                slides: slidesWithAudio
              })
              
              console.log(`✓ Chapter ${i+1} saved:`, saveResult.data)
              toast.success(`Chapter ${i+1} completed!`, { id: generatingToast })
              
            } catch (saveError: any) {
              console.error(`❌ Failed to save chapter ${i+1}:`, saveError)
              toast.error(`Failed to save chapter ${i+1}`, { id: generatingToast })
            }
            
          } catch (audioError: any) {
            console.error(`⚠ Audio generation failed for chapter ${i+1}:`, audioError)
            toast.error(`Audio failed for chapter ${i+1}`, { id: generatingToast })
          }
          
        } catch (chapterError: any) {
          console.error(`✗ Failed chapter ${i+1}:`, chapterError)
          const errorMsg = chapterError.response?.data?.details || 
                          chapterError.response?.data?.error || 
                          chapterError.message
          toast.error(`Chapter ${i+1} failed: ${errorMsg}`, { id: generatingToast })
          continue
        }
      }
      
      console.log('\n========== ALL CHAPTERS COMPLETED ==========')
      console.log(`Total slides: ${allSlidesMetadata.length}`)
      console.log('============================================\n')
      
      if (allSlidesMetadata.length > 0) {
        toast.success(`Generated ${allSlidesMetadata.length} slides successfully!`, { id: generatingToast })
        
        try {
          await axios.post('/api/deduct-credit', {
            email: user?.primaryEmailAddress?.emailAddress
          })
          console.log('✓ Credit deducted')
          
          setUserCredits(prev => (prev !== null && prev > 0) ? prev - 1 : prev)
          
          const remainingCredits = userCredits !== null ? userCredits - 1 : 0
          toast.info(`1 credit used. ${remainingCredits} credits remaining.`, {
            duration: 3000
          })
        } catch (creditError) {
          console.error('Failed to deduct credit:', creditError)
        }
        
        const updatedCourse = await axios.get(`/api/course?courseId=${courseid}`)
        setCourseDetails(updatedCourse.data)
      } else {
        toast.info('No new content generated', { id: generatingToast })
      }
      
    } catch (error: any) {
      console.error('❌ Critical error:', error)
      toast.error('Failed to generate video content', { id: generatingToast })
    }
  }

  // Show loading state while Clerk loads
  if (!isLoaded) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
        <p className='mt-4 text-gray-600'>Loading...</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center'>
      {userCredits !== null && userCredits <= 0 && (
        <div className='w-full max-w-4xl mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-center'>
          <p className='text-red-800 font-medium'>
            ⚠️ No credits available. Please purchase more credits to generate content.
          </p>
        </div>
      )}
      
      {userCredits !== null && userCredits > 0 && (
        <div className='w-full max-w-4xl mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center'>
          <p className='text-blue-800 text-sm'>
            💎 You have <strong>{userCredits}</strong> {userCredits === 1 ? 'credit' : 'credits'} remaining
          </p>
        </div>
      )}
      
      <CourseInfoCard course={courseDetails} />
      <CourseChapters course={courseDetails} />
    </div>
  )
}

export default CoursePreview