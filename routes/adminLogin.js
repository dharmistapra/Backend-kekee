import express from "express";
import {
  forgetPasswordAdmin,
  login,
  register,
  resetPassword,
  verifyOtp,
} from "../auth/auth.js";
import {
  loginSchema,
  registerSchema,
  resetAdminSchema,
  resetPasswordAdminSchema,
  verifyAdminSchema,
} from "../schema/joi_schema.js";
const adminAuthRouter = express.Router();

adminAuthRouter.post("/register", [registerSchema], register);
adminAuthRouter.post("/login", [loginSchema], login);
adminAuthRouter.post(
  "/forgotpassword",
  [resetAdminSchema],
  forgetPasswordAdmin
);
adminAuthRouter.post("/verify-otp", [verifyAdminSchema], verifyOtp);
adminAuthRouter.post(
  "/reset-password",
  [resetPasswordAdminSchema],
  resetPassword
);

export default adminAuthRouter;
