import express from "express";
const publicProtected = express.Router();
import {
  deletecartItem,
  deleteCartItemTesting,
  getAllcartitem,
  getAllcartitemTesting,
  postCartItem,
  postCartItemTesting,
  updateCartItem,
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

publicProtected.post("/cart-item", cartSchema, postCartItem);
publicProtected.post("/cart-item", postCartItemTesting);
publicProtected.put("/cart-item", editCartSchema, updateCartItem);
// publicProtected.put("/testingcart-item", updateQuantityTesting);
publicProtected.get("/cart-item/:id", getAllcartitem);
publicProtected.get("/testingcart-item/:id", getAllcartitemTesting);
publicProtected.delete("/cart-item/:id", deletecartItem);
publicProtected.post("/delettestingcart-item", deleteCartItemTesting);

publicProtected.post("/wish-list", wishListSchema, postWishList);
publicProtected.delete("/wish-list/:id", deleteWishListItem);
publicProtected.get("/wish-list", getWishLists);

export default publicProtected;
