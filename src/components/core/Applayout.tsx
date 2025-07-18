import React from 'react'
import Sidebar from './sidebar'

const Applayout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='h-screen w-full flex items-center justify-between'>
        <Sidebar />
        <div className='w-full h-full overflow-y-auto'>
            {children}
        </div>
    </div>
  )
}

export default Applayout
