/// <reference types="chrome" />
/* globals chrome */

console.log('Content script is loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchSummary') {
    const aggregatedProducts = {};
    const selectedMonth = message.month; // Receive selected month from popup
    const currentYear = new Date().getFullYear();
    let page = 1;

    const fetchOrders = async () => {
      try {
        let continueFetching = true;
        while (continueFetching) {
          const response = await fetch(
            `https://api.zeptonow.com/api/v2/order/?page_number=${page}`,
            {
              headers: {
                'request-signature':
                  'chrome-extension-mpjoccodbkaipkldddemmdlladmldooc',
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
