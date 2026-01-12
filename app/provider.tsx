'use client'
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { userDetailContext } from '../context/userDetailContext'

const provider = ({children} : {children:React.ReactNode}) => {
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
        {children}
      </userDetailContext.Provider>
      </div>
  )
}

export default provider