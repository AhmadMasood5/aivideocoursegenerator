'use client'
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { userDetailContext } from '../context/userDetailContext'

const Provider = ({children} : {children:React.ReactNode}) => {
    const [userDetail,setUserDetail] = useState(null)

     useEffect(()=>{
        createNewUser()
    },[])
    const createNewUser=async()=>{
        const  result = await axios.post('/api/user',{})
        console.log(result.data);
        setUserDetail(result.data)
    }
  return (
    <div>
      <userDetailContext.Provider value={{}}>
       <div className='max-w-7xl mx-auto'>
         {children}
       </div>
      </userDetailContext.Provider>
      </div>
  )
}

export default Provider