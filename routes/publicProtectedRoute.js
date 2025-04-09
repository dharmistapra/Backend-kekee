import express from "express";
const publicProtected = express.Router();
import {
  updateCartItem,
  deleteCartItem,
  postCartItemOptimizeCode,
  getAllcartitemOptimizecode,
} from "../controller/public/cartItem.js";
import {
  bankPaymentSchema,
  cartSchema,
  editCartSchema,
  orderId_generate_Validation_Schema,
  orderPlaceSchema,
  pageSchema,
  postaddressSchema,
  razorpayOrderSchema,
  updateUserbasicInfoSchema,
  userchangePasswordSchema,
  wishListSchema,
} from "../schema/joi_schema.js";
import {
  deleteWishListItem,
  getWishLists,
  postWishList,
} from "../controller/public/wishList.js";
import {
  changePasswordusers,
  getuserById,
  updateUserbasicInfo,
} from "../controller/public/user/register.js";
import OrderPlace, {
  bankPayment,
  generateOrderId,
  orderFailed,
  razorpayOrderCreate,
  verifyOrder,
} from "../controller/public/orderPlace.js";
import {
  getOrderdetails,
  getOrderHistory,
  getOrderPendingPayment,
  getuserAddresspagiantion,
} from "../controller/public/orderHistory.js";
import {
  deleteshipAddress,
  getshipAddress,
  postshipAddress,
  shippingDefaultStatus,
} from "../controller/public/address.js";
import { getShippingMethod } from "../controller/admin/shippingRate.js";
import { uploadBankPaymentReceipt } from "../middleware/uploads.js";

// publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.post("/cart-item", cartSchema, postCartItemOptimizeCode);
// publicProtected.get("/getcart-item/:id", getAllcartitemOptimizecode);
publicProtected.put("/cart-item", editCartSchema, updateCartItem);
publicProtected.get("/cart-item/:id", getAllcartitemOptimizecode);
publicProtected.delete("/deletecart-item/:id", deleteCartItem);

publicProtected.post("/wish-list", wishListSchema, postWishList);
publicProtected.delete("/wish-list/:id", deleteWishListItem);
publicProtected.get("/wish-list", getWishLists);
publicProtected.post(
  "/change-password",
  [userchangePasswordSchema],
  changePasswordusers
);
publicProtected.put(
  "/user-update/:id",
  [updateUserbasicInfoSchema],
  updateUserbasicInfo
);

publicProtected.post("/generate/orderId", [orderId_generate_Validation_Schema], generateOrderId);
publicProtected.post("/razorpay/create-order", [razorpayOrderSchema], razorpayOrderCreate);
publicProtected.post("/bank/payent", [uploadBankPaymentReceipt, bankPaymentSchema], bankPayment); // Wotjking This Modduleu
publicProtected.post("/order/place", [orderPlaceSchema], OrderPlace);
publicProtected.post("/verify/order", verifyOrder);
publicProtected.post("/cancel/payment", orderFailed);
publicProtected.get("/order/details/:orderId", getOrderdetails);
publicProtected.post("/order/history", getOrderHistory);

publicProtected.post("/shipping/address", [postaddressSchema], postshipAddress);
publicProtected.post("/shipping/address/:id", [pageSchema], getshipAddress);
publicProtected.get("/user/default-status/:id", shippingDefaultStatus);
publicProtected.delete("/shipping/address/:id", deleteshipAddress);
publicProtected.get("/user/address/:id", getuserAddresspagiantion);

publicProtected.get("/user/profile/:id", getuserById);

publicProtected.get("/get/shippingmethod", getShippingMethod);
publicProtected.get("/order-details/pending-payment/:orderId", getOrderPendingPayment);

export default publicProtected;
