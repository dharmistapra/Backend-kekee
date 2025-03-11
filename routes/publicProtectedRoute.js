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
  updateUserbasicInfo,
} from "../controller/public/user/register.js";
import OrderPlace, {
  orderFailed,
  verifyOrder,
} from "../controller/public/orderPlace.js";
import {
  getOrderdetails,
  getOrderHistory,
} from "../controller/public/orderHistory.js";
import { getshipAddress, postshipAddress, } from "../controller/public/address.js";

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
publicProtected.post(
  "/user-update",
  [updateUserbasicInfoSchema],
  updateUserbasicInfo
);

publicProtected.post("/oreder/place", [orderPlaceSchema], OrderPlace);
publicProtected.post("/verify/order", verifyOrder);
publicProtected.post("/cancel/payment", orderFailed);
publicProtected.post("/order/details", getOrderdetails);
publicProtected.post("/order/history", getOrderHistory);

publicProtected.post("/shipping/address", postshipAddress);
publicProtected.get("/shipping/address", getshipAddress);
export default publicProtected;
