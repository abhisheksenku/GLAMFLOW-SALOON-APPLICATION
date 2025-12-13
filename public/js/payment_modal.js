
document.addEventListener('DOMContentLoaded', () => {
    const cashfree = new Cashfree({ mode: "sandbox" });
    
    const premiumButton = document.getElementById("payButton");
    
    premiumButton.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        console.log("Sending token:", token); 
        try {
            const response = await axios.post(
                'http://localhost:3000/pay/pay',{},
                {
                    headers: {
                        Authorization: token
                    }
                }
            );

            const { paymentSessionId, orderId } = response.data;
            if (!paymentSessionId || !orderId) throw new Error("Invalid response");

            const checkoutOptions = {
                paymentSessionId,
                redirectTarget: "_modal"
            };

            const result = await cashfree.checkout(checkoutOptions);

            // User closed popup
            if (result.error) {
                console.error("Checkout error:", result.error);
                alert("Transaction Failed or Cancelled");

                await axios.post(
                    'http://localhost:3000/pay/payment-failed',
                    { orderId },
                    {
                        headers: {
                            Authorization: token
                        }
                    }
                );

                return;
            }

            // Payment Success
            if (result.paymentDetails) {
                console.log("Extracted paymentId:", result.paymentDetails?.paymentId); 
                console.log("Alternative payment_id:", result.paymentDetails?.payment_id);
                const paymentId = result.paymentDetails.paymentId;
                console.log("Payment Details:", result.paymentDetails);

                await axios.post(
                    'http://localhost:3000/pay/payment-success',
                    { orderId, paymentId },
                    {
                        headers: {
                            Authorization: token
                        }
                    }
                );

                alert("Transaction Successful!");
                window.location.reload();
            }

        } catch (error) {
            console.error("Payment initiation failed:", error);
            alert("Something went wrong. Try again.");
        }
    });
});
