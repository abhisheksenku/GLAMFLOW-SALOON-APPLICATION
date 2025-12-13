const { Cashfree, CFEnvironment } = require("cashfree-pg");
require('dotenv').config();

console.log("Using App ID:", process.env.CF_APP_ID);
console.log("Using Secret Key:", process.env.CF_SECRET_KEY);
// Initialize Cashfree client (consider moving to utils/cashfreeClient.js for cleaner architecture)
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX, // Change to CFEnvironment.PRODUCTION for live
  process.env.CF_APP_ID,
  process.env.CF_SECRET_KEY 
);

// Create order function
const createOrder = async (
  orderId,
  orderAmount,
  orderCurrency = "INR", // Use "INR", not "IND"
  customerID,
  customerPhone
) => {
  try {
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    const formattedExpiryDate = expiryDate.toISOString();

    const request = {
      order_amount: orderAmount,
      order_currency: orderCurrency,
      order_id: orderId,
      customer_details: {
        customer_id: customerID,
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: `http://localhost:3000/premium/payment-status/${orderId}`,
        payment_methods: "cc,dc,upi"
      },
      order_expiry_time: formattedExpiryDate
    };

    const response = await cashfree.PGCreateOrder( request);
    return response.data.payment_session_id;

  } catch (error) {
    console.error("Error creating order:", error.message);
    throw error;
  }
};

// Check payment status
const getPaymentStatus = async (orderId) => {
  try {
    const response = await cashfree.PGOrderFetchPayments(orderId);
    const transactions = response.data;

    let orderStatus = "Failure";
    if (transactions.some(txn => txn.payment_status === "SUCCESS")) {
      orderStatus = "Success";
    } else if (transactions.some(txn => txn.payment_status === "PENDING")) {
      orderStatus = "Pending";
    }

    return orderStatus;

  } catch (error) {
    console.error("Error fetching order status:", error.message);
    throw error;
  }
};

module.exports = {
    createOrder,
    getPaymentStatus
}