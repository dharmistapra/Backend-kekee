import express from "express";
const publicProtected = express.Router();
import {
  updateCartItem,
  deleteCartItem,
  postCartItemOptimizeCode,
  getAllcartitemOptimizecode,
} from "../controller/public/cartItem.js";
import {
  cartSchema,
  editCartSchema,
  orderPlaceSchema,
  postaddressSchema,
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
  orderFailed,
  verifyOrder,
} from "../controller/public/orderPlace.js";
import {
  getOrderdetails,
  getOrderHistory,
  getuserAddresspagiantion,
} from "../controller/public/orderHistory.js";
import {
  deleteshipAddress,
  getshipAddress,
  postshipAddress,
  shippingDefaultStatus,
} from "../controller/public/address.js";

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

publicProtected.post("/order/place", [orderPlaceSchema], OrderPlace);
publicProtected.post("/verify/order", verifyOrder);
publicProtected.post("/cancel/payment", orderFailed);
publicProtected.post("/order/details", getOrderdetails);
publicProtected.post("/order/history", getOrderHistory);

publicProtected.post("/shipping/address", [postaddressSchema], postshipAddress);
publicProtected.get("/shipping/address/:id", getshipAddress);
publicProtected.get("/user/default-status/:id", shippingDefaultStatus);
publicProtected.delete("/shipping/address/:id", deleteshipAddress);
publicProtected.get("/user/address/:id", getuserAddresspagiantion);

publicProtected.get("/user/profile/:id", getuserById);
export default publicProtected;
