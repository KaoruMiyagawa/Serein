import { useState } from 'react'
import './Pet.css'

const reactions = ['喵～', '看到你啦', '今天也要好好生活', '给你一个抱抱']

export default function Pet() {
  const [reaction, setReaction] = useState('')

  function handleClick() {
    setReaction(reactions[Math.floor(Math.random() * reactions.length)])
    window.setTimeout(() => setReaction(''), 2200)
  }

  return (
    <div className="pet-wrap">
      {reaction && <div className="pet-bubble">{reaction}</div>}
      <button className="pet-button" type="button" onClick={handleClick} aria-label="点击橘猫互动">
        <img src="/orange-cat-mascot.png" alt="沉沦橘猫" />
      </button>
    </div>
  )
}
