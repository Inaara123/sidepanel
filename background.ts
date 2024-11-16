// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ extensionActive: false })
  chrome.action.setIcon({
    path: {
      "16": "icons/inactive-16.png",
      "48": "icons/inactive-48.png",
      "128": "icons/inactive-128.png"
    }
  })
})
let storedData: { [key: string]: any } = {};

// Check if chrome.storage is available
if (chrome.storage && chrome.storage.local) {
  // Use chrome.storage.local for persistent storage
  chrome.storage.local.get(['dataSources'], (result) => {
    if (result.dataSources) {
      console.log('Loaded stored data sources:', result.dataSources);
      storedData = result;
    } else {
      console.log('No stored data sources found.');
    }
  });
} else {
  console.warn('chrome.storage.local is not available. Using in-memory storage instead.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_STORED_DATA") {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [message.key]: message.value }, () => {
        console.log(`Data stored for key: ${message.key}`);
        storedData[message.key] = message.value;
        sendResponse({ success: true });
      });
    } else {
      storedData[message.key] = message.value;
      console.log(`Data stored in memory for key: ${message.key}`);
      sendResponse({ success: true });
    }
    return true; // Indicates that the response is sent asynchronously
  } else if (message.type === "GET_STORED_DATA") {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([message.key], (result) => {
        console.log(`Retrieved data for key: ${message.key}`, result[message.key]);
        sendResponse(result);
      });
    } else {
      console.log(`Retrieved data from memory for key: ${message.key}`, storedData[message.key]);
      sendResponse({ [message.key]: storedData[message.key] });
    }
    return true; // Indicates that the response is sent asynchronously
  } else if (message.type === "DATA_SOURCE_SELECTED") {
    // Forward the message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  } else if (message.type === "DATA_UPDATED") {
    // Forward the message to the sidepanel
    console.log('background script recieved data with following message',message)
    chrome.runtime.sendMessage(message);
  }
});

// Listen for tab updates to reinject content script if necessary
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    chrome.tabs.sendMessage(tabId, { type: "TAB_UPDATED" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script is not injected, so inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-script.js']
        }).then(() => {
          console.log('Content script injected successfully');
        }).catch((error) => {
          console.error('Failed to inject content script:', error);
        });
      }
    });
  }
});

console.log("Background script loaded");