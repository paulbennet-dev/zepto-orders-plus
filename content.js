/// <reference types="chrome" />
/* globals chrome */

console.log('Content script is loaded');

async function generateSHA256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const generateRandomUUID = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
  let t = Math.random() * 16 | 0;
  return (e === "x" ? t : (t & 0x3 | 0x8)).toString(16);
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchSummary') {
    const aggregatedProducts = {};
    const selectedMonth = message.month; // Receive selected month from popup
    const currentYear = new Date().getFullYear();
    let page = 1;

    const fetchOrders = async () => {

      const {
        deviceID,
        xsrfToken,
        csrfSecret
      } = message.cookies;

      try {
        let continueFetching = true;
        while (continueFetching) {

          const requestID = generateRandomUUID();
          const requestIDHashContent = `undefined|${deviceID}|get|${requestID}|${decodeURIComponent(xsrfToken)}|/api/v2/order/?page_number=${page}`;

          const requestSignature = await generateSHA256Hex(requestIDHashContent);
          const requestTimezone = await generateSHA256Hex(requestSignature);

          const response = await fetch(
            `https://api.zeptonow.com/api/v2/order/?page_number=${page}`,
            {
              headers: {
                "x-csrf-secret": csrfSecret,
                "x-timezone": requestTimezone,
                "x-xsrf-token": decodeURIComponent(xsrfToken),
                'device_id': deviceID,
                'request_id': requestID,
                'request-signature': requestSignature,
                "x-chrome-extension-id": chrome.runtime.id
              },
              credentials: 'include',
            }
          );

          if (!response.ok) {
            throw new Error(
              `Network response was not ok: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data || !Array.isArray(data.orders)) {
            throw new Error('Invalid API response structure');
          }

          const orders = data.orders;

          // Filter orders for the selected month
          const filteredOrders = orders.filter((order) => {
            // order.status is string type
            if (order?.status?.toLowerCase() !== 'delivered') {
              return false;
            }

            const orderDate = new Date(order.placedTime);

            return (
              orderDate.getMonth() === selectedMonth &&
              orderDate.getFullYear() === currentYear
            );
          });

          filteredOrders.forEach((order) => {
            if (
              !order.productsNamesAndCounts ||
              !Array.isArray(order.productsNamesAndCounts)
            ) {
              console.warn('Invalid products data in order', order);
              return;
            }

            order.productsNamesAndCounts.forEach((product) => {
              const imageUrl = product.image?.path
                ? `https://cdn.zeptonow.com/production/${product.image.path}`
                : '';

              if (aggregatedProducts[product.name]) {
                aggregatedProducts[product.name].count += product.count;
                aggregatedProducts[product.name].orderDates.push(
                  order.placedTime
                ); // Add order date to the list
              } else {
                aggregatedProducts[product.name] = {
                  name: product.name,
                  count: product.count,
                  imageUrl: imageUrl,
                  orderDates: [order.placedTime], // Initialize with a list containing the order date
                };
              }
            });
          });

          const previousMonth = (selectedMonth - 1 + 12) % 12;
          const hasPreviousMonthOrders = orders.some((order) => {
            const orderDate = new Date(order.placedTime);
            return (
              orderDate.getMonth() === previousMonth &&
              orderDate.getFullYear() === currentYear
            );
          });

          if (orders.length === 0 || hasPreviousMonthOrders) {
            continueFetching = false;
          } else {
            page++;
          }
        }

        sendResponse({
          success: true,
          data: Object.values(aggregatedProducts),
        });
      } catch (error) {
        console.error('Error fetching orders:', error);
        sendResponse({ success: false, error: error.message });
      }
    };

    fetchOrders();
    return true; // Keep the message channel open for async response
  } else if (message.action === 'isUserLoggedIn') {
    const loginButton = document.querySelector('[data-testid="login-btn"]');

    const loggedIn = loginButton === null; // If login button is not present, user is logged in

    sendResponse({ success: true, loggedIn });
    return true; // Keep the message channel open for async response
  } else {
    sendResponse({ success: false, error: 'Unknown action' });
    return true;
  }
});
