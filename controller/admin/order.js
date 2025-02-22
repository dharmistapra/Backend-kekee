const generateOrderId = async (req, res) => {
  try {
    const options = {
      amount: req.body.amount,
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
    };

    const order = await razorpay.orders.create(options);
    console.log(order);
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
