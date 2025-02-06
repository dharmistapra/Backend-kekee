import prisma from "../../DB/config.js";
import { deleteData } from "../../helper/common.js";

const postEmailSetting = async (req, res, next) => {
  const { email, password, host, port, toEmail, bccEmail, ccEmail } = req.body;
  try {
    const findData = await prisma.emailSetting.findFirst();
    if (findData) {
      const result = await prisma.emailSetting.update({
        where: { id: findData.id },
        data: {
          email,
          password,
          host,
          port,
          toEmail,
          bccEmail,
          ccEmail,
        },
      });

      return res.status(200).json({
        isSuccess: true,
        message: "Email setting updated successfully.",
        data: result,
      });
    }
    const result = await prisma.emailSetting.create({
      data: {
        email,
        password,
        host,
        port,
        toEmail,
        bccEmail,
        ccEmail,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Email setting created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const getEmailSetting = async (req, res, next) => {
  try {
    const result = await prisma.emailSetting.findMany();
    return res.status(200).json({
      isSuccess: true,
      message: "Email setting get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const deleteEmailSetting = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("emailSetting", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    return res.status(200).json({
      isSuccess: result.status,
      message: result.message,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export { postEmailSetting, getEmailSetting, deleteEmailSetting };
