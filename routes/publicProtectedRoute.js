import express from "express";
const publicProtected = express.Router();
import {
  updateCartItem,
  postCartItem,
  getAllcartitem,
  deleteCartItem,
} from "../controller/public/cartItem.js";
import {
  cartSchema,
  editCartSchema,
  updateUserbasicInfoSchema,
  userchangePasswordSchema,
  wishListSchema,
} from "../schema/joi_schema.js";
import {
  deleteWishListItem,
  getWishLists,
  postWishList,
} from "../controller/public/wishList.js";
import { changePasswordusers, updateUserbasicInfo } from "../controller/public/user/register.js";
import OrderPlace, { orderFailed, verifyOrder } from "../controller/public/orderPlace.js";

// publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.put("/cart-item", editCartSchema, updateCartItem);
publicProtected.get("/cart-item/:id", getAllcartitem);
publicProtected.delete("/deletecart-item/:id", deleteCartItem);

publicProtected.post("/wish-list", wishListSchema, postWishList);
publicProtected.delete("/wish-list/:id", deleteWishListItem);
publicProtected.get("/wish-list", getWishLists);
publicProtected.post("/change-password", [userchangePasswordSchema], changePasswordusers);
publicProtected.post("/user-update", [updateUserbasicInfoSchema], updateUserbasicInfo);

publicProtected.post("/oreder/place", OrderPlace);
publicProtected.post("/verify/order", verifyOrder);
publicProtected.post("/cancel/payment", orderFailed);
export default publicProtected;
