import Razorpay from "razorpay";
import "dotenv/config";
const rozarpay = new Razorpay({
    key_id: process.env.ROZARPAY_KEY_ID,
    key_secret: process.env.ROZARPAY_KEY_SECRET
})
export { rozarpay }