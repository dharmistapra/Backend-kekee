import express from "express";
import {
  getAllMenu,
  getMenuPageWiseBanner,
} from "../controller/admin/menu/menu.js";
import { getHomeBanner } from "../controller/admin/homeBanner.js";
import { getSocialMedia } from "../controller/admin/socialMediaIcon.js";
import { getAllCurrency } from "../controller/admin/currency.js";
import { getAllCms, getCms } from "../controller/admin/cms.js";
import { getCategories } from "../controller/admin/category/category.js";
import { getContactDetails } from "../controller/admin/contactDetails.js";
import {
  filterAttribute,
  getProductDetails,
  getProductpublic,
} from "../controller/public/product.js";
import {
  getCatalogue,
  getCatalogueProduct,
  relatedProduct,
  searchCatalogueAndProduct,
} from "../controller/public/catalogue.js";
import passport from "../middleware/passport.js";
import {
  SendOtp,
  userlogin,
  userRegister,
  VerifyOtp,
} from "../controller/public/user/register.js";
import {
  loginSchema,
  newsLetterSchema,
  registerSchema,
  verifyOtpSchema,
} from "../schema/joi_schema.js";
import { getCollection } from "../controller/public/collection.js";
import { postNewsLetter } from "../controller/public/newsLetter.js";
const router = express.Router();

// MENU API

router.get("/menu", getAllMenu);
router.get("/homebanner", getHomeBanner);
router.get("/socialmedia", getSocialMedia);
router.get("/currency", getAllCurrency);
router.get("/cms", getAllCms);
router.get("/cms/:url", getCms);
router.get("/category", getCategories);
router.get("/contactdetails", getContactDetails);
router.get("/menu-pagewisebanner/:url", getMenuPageWiseBanner);

// PRODUCT ROUTE
router.post("/product", getProductpublic);
router.get("/product-detail/:url", getProductDetails);
router.get("/related-product/:id", relatedProduct);

// CATALOGUE ROUTE
router.post("/catalogue", getCatalogue);
router.get("/catalogueproduct/:url", getCatalogueProduct);

router.get("/filter/:url", filterAttribute);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    // const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: "Logged in successfully" });
  }
);

router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    // const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: "Logged in successfullyss" });
  }
);

router.get("/auth/failure", (req, res) => {
  res.status(401).json({ message: "Authentication failed. Please try again." });
});

router.post("/login", [loginSchema], userlogin);
router.post("/register", [registerSchema], userRegister);
router.post("/otp", SendOtp);
router.post("/verify-otp", [verifyOtpSchema], VerifyOtp);

// COLLECTION ROUTE
router.get("/collection", getCollection);

// SEARCH
router.post("/search", searchCatalogueAndProduct);

// News Latter
router.post("/newsletter", [newsLetterSchema], postNewsLetter);

export default router;
