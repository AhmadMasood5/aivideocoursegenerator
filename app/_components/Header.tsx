'use client';
import { Button } from '@/components/ui/button';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import Image from 'next/image'

const Header = () => {
    const {user} =useUser();
  return (
    <div className='flex items-center justify-between p-4'>
    <div className='flex gap-2 items-center'>
        <Image src={'/logo.png'} alt="Logo" width={40} height={40}/>
        <h2 className='text-lg font-bold'><span className='text-primary'>Vid</span>Course</h2>
    </div>
    <ul className='flex gap-8 items-center'>
        <li className='text-lg hover:text-primary font-medium cursor-pointer'>Home</li>
        <li className='text-lg hover:text-primary font-medium cursor-pointer'>Pricing</li>
    </ul>

    {user? <UserButton/> :<SignInButton mode='modal'><Button>Get Started</Button></SignInButton>}
    </div>
  )
}

export default Header