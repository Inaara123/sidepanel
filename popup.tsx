// First, create a new file: popup.tsx
import { useState, useEffect } from "react"

const Popup = () => {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    // Get initial state
    chrome.storage.local.get(['extensionActive'], (result) => {
      setIsActive(result.extensionActive ?? false)
    })
  }, [])

  const toggleExtension = () => {
    const newState = !isActive
    setIsActive(newState)
    
    // Save state
    chrome.storage.local.set({ extensionActive: newState })
    
    // Update icon
    chrome.action.setIcon({
      path: newState ? {
        "16": "icons/active-16.png",
        "48": "icons/active-48.png",
        "128": "icons/active-128.png"
      } : {
        "16": "icons/inactive-16.png",
        "48": "icons/inactive-48.png",
        "128": "icons/inactive-128.png"
      }
    })

    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "TOGGLE_COLOR_CHANGER",
          isActive: newState
        })
      }
    })
  }

  return (
    <div style={{ padding: "16px", width: "200px" }}>
      <label className="flex items-center space-x-2">
        <span>Extension Active</span>
        <input
          type="checkbox"
          checked={isActive}
          onChange={toggleExtension}
          className="toggle"
        />
      </label>
    </div>
  )
}

export default Popup