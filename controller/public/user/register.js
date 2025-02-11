import prisma from "../../../db/config.js";
import bcrypt from "bcrypt";
import generateJWT_Token from "../../../middleware/token.js";
import speakeasy from "speakeasy"
import nodemailer from "nodemailer"
import passport from "passport";


const userRegister = async (req, res, next) => {
    try {
        const { name, email, password, mobile_number } = req.body
        const checkuserExist = await prisma.users.findUnique({ where: { email } })
        if (checkuserExist) res.status(400).json({ isSuccess: false, message: "email already exist", });
        const hashpassword = await bcrypt.hash(password, 10);
        const data = await prisma.users.create({
            data: {
                name,
                email,
                password: hashpassword,
                mobile_number,
            }
        })
        if (data) res.status(200).json({ isSuccess: false, message: "Register successfully", });
    } catch (error) {
        console.log("errr =====>", error)
        const err = new Error("Something went wrong, please try again!");
        next(err);
    }
}
const userlogin = async (req, res, next) => {
    try {
        passport.authenticate(
            "user",
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
                const { token, payload } = generateJWT_Token(user, "user");
                return res.status(200).json({
                    isSuccess: true,
                    message: "Login Successfully.",
                    token: token,
                    payload: payload,
                });
            }
        )(req, res, next);
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            isSuccess: false,
            message: "Something went wrong, please try again!",
        });
    }
};
const SendOtp = async (req, res, next) => {
    try {
        const { email } = await req.body

        const user = await prisma.users.findFirst({
            where: {
                email: email
            }
        })

        if (!user) {
            return res.status(404).json({ isSuccess: false, message: "email does not existing" })
        }

        const SMTP_config = {
            port: process.env.MAIL_PORT,
            host: process.env.MAIL_HOST,
            secure: false,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PSD,
            },
        };
        let transporter = nodemailer.createTransport(SMTP_config)

        const { secret, otp } = GenerateOtp()
        let body = `Dear ${email},
    
    We've received a request to reset your password for [Kekee Impex]. To proceed with resetting your password, please use the following One-Time Passcode (OTP):${otp} at the password reset page to create new password for your account.
    
    This OTP is valid for a limited time for security purposes.

    If you did not request this password reset or have any concerns about your account security, please contact our support team immediately at[Support Contact Information]for assistance.

    Thank you,
    Kekee Impex Team `;

        let MailOption = {
            from: process.env.MAIL_USERNAME,
            to: email,
            subject: "Mail Send",
            text: body

        }

        transporter.sendMail(MailOption, (error, info) => {
            if (error) {
                return res.status(500).json({ error: "Mail Send To Fail" })
            } else {
                return res.status(200).json({ "status": 200, "message": "Mail Send Successfully", secret: secret, "email": email, })
            }
        })
    } catch (err) {
        return res.status(500).json({ "status": false, "message": "Internal Server Error" })
    }
}

const GenerateOtp = () => {
    const secret = speakeasy.generateSecret({ length: 20 })
    const otp = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
        step: 120,
        digits: 6
    })

    return { secret: secret.base32, otp }
}
const VerifyOtp = async (req, res, next) => {
    const { otp, secret } = req.body
    let verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: otp,
        window: 3,
        step: 120
    })
    if (verified) {
        res.status(200).json({ isSuccess: true, message: 'otp verified' });
    } else {
        res.status(400).json({ isSuccess: false, message: 'Invalid Otp' });
    }

}

const resetPassword = async (req, res, next) => {
    try {
        const { email, password, otp, secret } = req.body;

        let otpVerified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: otp,
            window: 2,
            step: 120
        });

        if (!otpVerified) {
            return res.status(400).json({ isSuccess: false, message: 'OTP verification failed. Cannot reset password.' });
        }


        const finduser = await prisma.users.findFirst({
            where: { email: email },
        });

        if (!finduser) {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Email not exists!" });
        }


        const hashpassword = await bcrypt.hash(password, 10);
        const updatePassword = await prisma.users.update({
            where: { email: email },
            data: {
                password: hashpassword,
            },
        });
        return res
            .status(200)
            .json({ isSuccess: true, message: "Password reset successfully." });
    } catch (error) {
        console.log("errror", error)
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};

const changePasswordusers = async (req, res) => {
    let { oldPassword, newPassword, user_id } = req.body;
    try {

        if (!/^[a-fA-F0-9]{24}$/.test(user_id)) {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Invalid ID format!" });
        }

        const finduser = await prisma.users.findUnique({ where: { id: user_id }, });
        if (!finduser) return res.status(404).json({ isSuccess: false, message: "user not found!", });


        const checkPassword = await bcrypt.compare(oldPassword, finduser.password);

        if (checkPassword) {
            try {
                newPassword = await bcrypt.hash(newPassword, 10);
                const updatePassword = await prisma.users.update({
                    where: {
                        id: user_id,
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


const updateUserbasicInfo = async (req, res) => {
    let { name, mobile_number, user_id } = req.body;
    try {

        if (!/^[a-fA-F0-9]{24}$/.test(user_id)) {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Invalid ID format!" });
        }

        const finduser = await prisma.users.findUnique({ where: { id: user_id }, });
        if (!finduser) return res.status(404).json({ isSuccess: false, message: "user not found!", });
        const updateuser = await prisma.users.update({
            where: {
                id: user_id,
            },
            data: {
                name: name,
                mobile_number: mobile_number
            },
        });
        return res.status(409).send({
            message: "info update successfully",
            isSuccess: false,
        });

    } catch (error) {
        return res.status(500).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

export { userRegister, userlogin, SendOtp, VerifyOtp, resetPassword, changePasswordusers, updateUserbasicInfo }