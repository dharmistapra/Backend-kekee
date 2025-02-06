import passport from "passport";
import generateJWT_Token from "../middleware/token.js";
import prisma from "../db/config.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

const register = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;
    const uniqueAdmin = await prisma.adminMaster.findFirst({
      where: {
        OR: [{ userName: userName }, { email: email }],
      },
    });

    if (uniqueAdmin) {
      return res.status(409).json({
        isSuccess: false,
        message: "Email already exists!",
      });
    }

    const hashpassword = await bcrypt.hash(password, 10);
    const result = await prisma.adminMaster.create({
      data: {
        userName,
        email,
        password: hashpassword,
      },
      select: {
        id: true,
        userName: true,
        email: true,
      },
    });
    if (result) {
      return res.status(200).json({
        isSuccess: true,
        message: "Admin created successfully.",
        data: result,
      });
    }
  } catch (error) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const login = async (req, res, next) => {
  try {
    passport.authenticate(
      "admin",
      { session: false },
      async (err, user, info) => {
        if (err) {
          return res.status(500).json({
            isSuccess: false,
            message: "Something went wrong, please try again!",
          });
        }
        if (!user) {
          return res
            .status(404)
            .json({ isSuccess: false, message: info.message });
        }
        const { token, payload } = generateJWT_Token(user, "admin");
        return res.status(200).json({
          isSuccess: true,
          message: "Admin Login Successfully.",
          token: token,
          payload: payload,
        });
      }
    )(req, res, next);
  } catch (err) {
    return res.status(500).json({
      isSuccess: false,
      message: "Something went wrong, please try again!",
    });
  }
};

const forgetPasswordAdmin = async (req, res, next) => {
  try {
    const { email } = req.body;
    const findAdmin = await prisma.adminMaster.findFirst({
      where: { email: email },
    });

    if (!findAdmin) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Email does not exists!" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiretime = Date.now() + 1 * 60 * 1000;
    await prisma.adminMaster.update({
      where: { email: email },
      data: {
        otp: otp,
        otpExpiresIn: otpExpiretime,
      },
    });
    const SMTP_config = {
      port: process.env.MAIL_PORT,
      host: process.env.MAIL_HOST,
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PSD,
      },
    };

    let transporter = nodemailer.createTransport(SMTP_config);
    let MailOption = {
      from: `"Kekee Impex" <${process.env.MAIL_USERNAME}>`,
      to: email,
      subject: "OTP for Password Reset",
      text: `Your OTP for password reset is ${otp}. It is valid for 1 minutes.`,
      headers: {
        "X-Priority": "3",
      },
    };

    transporter.sendMail(MailOption, (error, info) => {
      if (error) {
        return res.status(500).json({
          isSuccess: false,
          message: "Failed to send email. Please try again.",
        });
      } else {
        return res.status(200).json({
          isSuccess: true,
          message: "OTP sent successfully",
          email: email,
        });
      }
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  const { email, otpCode } = req.body;
  try {
    const checkAdmin = await prisma.adminMaster.findFirst({
      where: { email: email },
    });
    if (!checkAdmin) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Email not found!" });
    }
    if (checkAdmin.otp !== parseInt(otpCode)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid OTP!" });
    }

    if (Date.now() > checkAdmin?.otpExpiresIn) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "OTP expired!" });
    }

    await prisma.adminMaster.update({
      where: { email: email },
      data: { otpVerified: true },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const findAdmin = await prisma.adminMaster.findFirst({
      where: { email: email },
    });

    if (!findAdmin) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Email not exists!" });
    }

    if (!findAdmin.otpVerified) {
      return res.status(400).json({
        isSuccess: false,
        message: "OTP verification is required before resetting the password.",
      });
    }

    if (Date.now() > findAdmin.otpExpiresIn) {
      return res.status(400).json({
        isSuccess: false,
        message: "OTP is expired!",
      });
    }

    const hashpassword = await bcrypt.hash(password, 10);
    const updatePassword = await prisma.adminMaster.update({
      where: { email: email },
      data: {
        password: hashpassword,
        otp: null,
        otpVerified: false,
        otpExpireIn: null,
      },
    });
    return res
      .status(200)
      .json({ isSuccess: true, message: "Password reset successfully." });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const changePassword = async (req, res) => {
  const id = req.user.id;

  let { oldPassword, newPassword } = req.body;
  try {
    const findadmin = await prisma.adminMaster.findUnique({
      where: { id: id },
    });
    if (!findadmin) {
      return res.status(404).json({
        isSuccess: false,
        message: "Admin not found!",
      });
    }

    const checkPassword = await bcrypt.compare(oldPassword, findadmin.password);

    if (checkPassword) {
      try {
        newPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = await prisma.adminMaster.update({
          where: {
            id: id,
          },
          data: {
            password: newPassword,
          },
        });

        return res.status(200).json({
          isSuccess: true,
          message: "Password changed successfully.",
        });
      } catch (error) {
        return res.status(500).json({
          isSuccess: false,
          message: "Something went wrong, please try again!",
        });
      }
    } else {
      return res.status(409).send({
        message: "Old password is wrong!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

export {
  login,
  forgetPasswordAdmin,
  verifyOtp,
  resetPassword,
  register,
  changePassword,
};
