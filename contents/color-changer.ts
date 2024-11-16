import type { PlasmoCSConfig } from "plasmo"
import { FIELDS, FieldName } from '../fields';

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

let isActive = false
let currentColor = "#FFFFFF"
let lastHighlightedElement: HTMLElement | null = null
let isSelectingDataSource = false
let observer: MutationObserver | null = null

function addListeners() {
  document.body.addEventListener('mouseover', handleMouseOver)
  document.body.addEventListener('mouseout', handleMouseOut)
  document.body.addEventListener('click', handleClick)
}

function removeListeners() {
  document.body.removeEventListener('mouseover', handleMouseOver)
  document.body.removeEventListener('mouseout', handleMouseOut)
  document.body.removeEventListener('click', handleClick)
}

function handleMouseOver(e: MouseEvent) {
  if (!isActive && !isSelectingDataSource) return
  const target = e.target as HTMLElement
  
  if (isSelectingDataSource) {
    target.style.backgroundColor = 'rgba(255, 165, 0, 0.3)' // Semi-transparent orange
  } else {
    target.style.outline = `2px solid ${currentColor}`
  }
  
  lastHighlightedElement = target
}

function handleMouseOut(e: MouseEvent) {
  if (!isActive && !isSelectingDataSource) return
  const target = e.target as HTMLElement
  if (target === lastHighlightedElement) {
    if (isSelectingDataSource) {
      target.style.backgroundColor = ''
    } else {
      target.style.outline = 'none'
    }
    lastHighlightedElement = null
  }
}

function handleClick(e: MouseEvent) {
  if (!isActive && !isSelectingDataSource) return
  e.preventDefault()
  const target = e.target as HTMLElement
  
  if (isSelectingDataSource) {
    const xpath = getXPath(target)
    chrome.runtime.sendMessage({
      type: "DATA_SOURCE_SELECTED",
      xpath: xpath
    })
    isSelectingDataSource = false
    target.style.backgroundColor = '' // Remove the background
  } else {
    const xpath = getXPath(target)
    const content = target.textContent || 'No content'
    chrome.runtime.sendMessage({
      type: "ADD_ELEMENT_INFO",
      info: { xpath, content }
    })
  }
}

function getXPath(element: HTMLElement): string {
  if (element === document.body)
    return '/html/body'

  let xpath = ''
  let parent = element.parentNode as HTMLElement

  while (parent && parent !== document.documentElement) {
    const tag = element.tagName.toLowerCase()
    const sameTagSiblings = Array.from(parent.children).filter(child => 
      child.tagName.toLowerCase() === tag
    )

    const index = sameTagSiblings.indexOf(element) + 1
    xpath = `/${tag}[${index}]${xpath}`

    element = parent
    parent = element.parentNode as HTMLElement
  }

  return `/html/body${xpath}`
}

function setupDataSourceMonitoring(dataSources: { name: FieldName; xpath: string | null }[]) {
    if (observer) {
      console.log("setting up data source monitoring with : ", dataSources)
      observer.disconnect();
    }
  
    const observerConfig = {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    };
  
    function getElementValue(element: HTMLElement): string {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value;
      } else if (element instanceof HTMLSelectElement) {
        return element.options[element.selectedIndex].text;
      } else {
        return element.textContent || '';
      }
    }
  
    function sendUpdateMessage(name: FieldName, element: HTMLElement) {
        const newData = getElementValue(element);
        console.log(`Sending update for ${name}. New data:`, newData);
        chrome.runtime.sendMessage({
          type: "DATA_UPDATED",
          field: name,
          data: newData.trim()
        });
      }
  
    observer = new MutationObserver((mutations) => {
      console.log("Mutations detected : ", mutations)
      dataSources.forEach(({ name, xpath }) => {
        if (!xpath) return;
  
        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
        if (!element) return;
  
        mutations.forEach((mutation) => {
          if (mutation.target === element || element.contains(mutation.target as Node)) {
            sendUpdateMessage(name, element);
          }
        });
      });
    });
  
    dataSources.forEach(({ name, xpath }) => {
      if (xpath) {
        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
        if (element) {
          observer.observe(element, observerConfig);
          
          // Add event listeners for different element types
          if (element instanceof HTMLSelectElement) {
            element.addEventListener('change', () => sendUpdateMessage(name, element));
          } else if (element instanceof HTMLInputElement) {
            element.addEventListener('input', () => sendUpdateMessage(name, element));
          }
  
          // Send initial value
          sendUpdateMessage(name, element);
        }
      }
    });
  }
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_COLOR_CHANGER") {
    isActive = message.isActive
    currentColor = message.color || "#FFFFFF"

    if (isActive) {
      addListeners()
    } else {
      removeListeners()
      if (lastHighlightedElement) {
        lastHighlightedElement.style.outline = 'none'
        lastHighlightedElement.style.backgroundColor = ''
        lastHighlightedElement = null
      }
    }

    sendResponse({ success: true })
  } else if (message.type === "SELECT_DATA_SOURCE") {
    isSelectingDataSource = true
    addListeners()
  } else if (message.type === "SETUP_DATA_SOURCE_MONITORING") {
    setupDataSourceMonitoring(message.dataSources)
  }
})

// Setup data source monitoring on page load
chrome.runtime.sendMessage({ type: "GET_STORED_DATA" }, (response) => {
  if (response && response.dataSources) {
    setupDataSourceMonitoring(response.dataSources);
  }
})

// Listen for page reloads
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect()
  }
})

console.log("Color Changer content script loaded")