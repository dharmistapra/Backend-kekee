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
  wishListSchema,
} from "../schema/joi_schema.js";
import {
  deleteWishListItem,
  getWishLists,
  postWishList,
} from "../controller/public/wishList.js";

// publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.put("/cart-item", editCartSchema, updateCartItem);
publicProtected.get("/testingcart-item/:id", getAllcartitem);
publicProtected.post("/delettestingcart-item", deleteCartItem);

publicProtected.post("/wish-list", wishListSchema, postWishList);
publicProtected.delete("/wish-list/:id", deleteWishListItem);
publicProtected.get("/wish-list", getWishLists);

export default publicProtected;
