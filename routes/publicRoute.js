import express from "express";
import {
  getAllMenu,
  getMenuPageWiseBanner,
} from "../controller/admin/menu/menu.js";
import { getHomeBanner } from "../controller/admin/homeBanner.js";
import { getSocialMedia } from "../controller/admin/socialMediaIcon.js";
import { getAllCurrency } from "../controller/admin/currency.js";
import { getAllCms, getBankdetails, getCms } from "../controller/admin/cms.js";
import {
  getCategories,
  getCategoryCollection,
} from "../controller/public/category.js";
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
  contactUsSchema,
  loginSchema,
  newsLetterSchema,
  OtpSchema,
  registerSchema,
  resetPasswordUsersSchema,
  verifyOtpSchema,
} from "../schema/joi_schema.js";
import {
  getCollection,
  getCollectionHome,
} from "../controller/public/collection.js";
import { postNewsLetter } from "../controller/public/newsLetter.js";
import nodeIplocate from "node-iplocate";
import fetch from "node-fetch";
// import { resetPassword } from "../auth/auth.js";
import { resetPassword } from "../controller/public/user/register.js";
import { gettestimonial } from "../controller/public/testimonial.js";
import {
  countrylistGroup,
  findShippingPrice,
} from "../controller/admin/shippingcharges.js";
import {
  getPaymentMethod,
  getPaymentMethodpublic,
} from "../controller/admin/paymentMethod.js";
import { getCategory } from "../controller/public/category.js";
import {
  deleteContactUs,
  getAllContactUs,
  postContactUs,
} from "../controller/admin/contactUs.js";
import { getWebSetting } from "../controller/admin/webSetting.js";
const router = express.Router();

// MENU API

const countryToCurrency = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  FR: "EUR",
  JP: "JPY",
  AU: "AUD",
};

// router.get("/location", async (req, res) => {
//   try {
//     let userIp =
//       req.clientIp ||
//       req.headers["x-forwarded-for"] ||
//       req.socket.remoteAddress;
//     if (userIp === "::1" || userIp === "127.0.0.1") {
//       const response = await fetch("https://api64.ipify.org?format=json");
//       const data = await response.json();
//       console.log("response=============>", data.ip)
//       userIp = data.ip;
//     }

//     if (userIp.startsWith("::ffff:")) {
//       userIp = userIp.replace("::ffff:", "");
//     }

//     const privateIpPattern =
//       /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/;
//     if (privateIpPattern.test(userIp)) {
//       return res.json({
//         message:
//           "Private network IP detected. No public location data available.",
//         ip: userIp,
//       });
//     }

//     const results = await nodeIplocate(userIp);
//     results.code = countryToCurrency[results.country_code] || "Unknown";
//     res.json(results);
//   } catch (error) {
//     console.log("errr", error)
//     res.status(500).json({ error: "Unable to fetch location" });
//   }
// });

router.get("/location", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log("ip", ip);
    let userIp =
      req.clientIp ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    if (!userIp) {
      return res.status(500).json({ error: "User IP not detected" });
    }

    if (userIp === "::1" || userIp === "127.0.0.1") {
      const response = await fetch("https://api64.ipify.org?format=json");
      const data = await response.json();
      userIp = data.ip;
    }

    if (userIp.startsWith("::ffff:")) {
      userIp = userIp.replace("::ffff:", "");
    }

    const privateIpPattern =
      /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/;
    if (privateIpPattern.test(userIp)) {
      return res.json({
        message:
          "Private network IP detected. No public location data available.",
        ip: userIp,
      });
    }

    const response = await fetch(`http://ip-api.com/json/${userIp}`);
    const results = await response.json();

    if (results.status !== "success") {
      return res.status(500).json({ error: "Failed to fetch location" });
    }

    results.code = countryToCurrency?.[results.countryCode] || "Unknown";
    res.json(results);
  } catch (error) {
    console.error("Location Fetch Error:", error);
    res.status(500).json({ error: "Unable to fetch location" });
  }
});

router.get("/menu", getAllMenu);
router.get("/homebanner", getHomeBanner);
router.get("/socialmedia", getSocialMedia);
router.get("/currency", getAllCurrency);
router.get("/cms", getAllCms);
router.get("/cms/:url", getCms);
router.get("/category", getCategories);
router.get("/categorymenu", getCategory);

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
router.post("/otp", [OtpSchema], SendOtp);
router.post("/verify-otp", [verifyOtpSchema], VerifyOtp);
router.post("/reset-password", resetPasswordUsersSchema, resetPassword);

// COLLECTION ROUTE
router.get("/collection", getCollection);

// SEARCH
router.post("/search", searchCatalogueAndProduct);

// News Latter
router.post("/newsletter", [newsLetterSchema], postNewsLetter);
router.get("/testimonials", gettestimonial);

router.get("/home-collection", getCollectionHome);
router.get("/shipping-list", countrylistGroup);
router.post("/shipping-charge", findShippingPrice);

router.get("/payment/method", getPaymentMethodpublic);

router.get("/categorycollection", getCategoryCollection);

router.post("/contact-us", contactUsSchema, postContactUs);

router.get("/websetting", getWebSetting);
router.get("/bank/details", getBankdetails)

export default router;
