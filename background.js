/// <reference types="chrome" />
/* globals chrome */

// Get cookie using chrome.cookies API with async/await
async function getCookie(cookieName) {
  return new Promise((resolve) => {
    chrome.cookies.get(
      {
        url: 'https://www.zeptonow.com',
        name: cookieName,
      },
      function (cookie) {
        if (cookie) {
          resolve({ success: true, cookie: cookie.value });
        } else {
          resolve({ success: false });
        }
      }
    );
  });
}

async function fetchCookies(message) {
  if (message.action === "fetchSummary") {
    const { cookie: deviceID } = await getCookie("device_id");
    const { cookie: xsrfToken } = await getCookie("XSRF-TOKEN");
    const { cookie: csrfSecret } = await getCookie("csrfSecret");

    message.cookies = {
      deviceID,
      xsrfToken,
      csrfSecret
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message in background script:', message);

  if (
    message.action === 'fetchSummary' ||
    message.action === 'isUserLoggedIn'
  ) {
    // Forward the message to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {

        fetchCookies(message).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            sendResponse(response);
          });
        });


      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });

    // Indicate that the response will be sent asynchronously
    return true;
  }
});
