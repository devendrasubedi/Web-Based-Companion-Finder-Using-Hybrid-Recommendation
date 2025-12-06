import { useState } from 'react'
import './App.css'
import NavBar from './component/NavBar'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <div className="container border-4">hello</div>
     <NavBar />
     
    </>
  )
}

export default App