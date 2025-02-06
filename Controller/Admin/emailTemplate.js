import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postEmailTemplate = async (req, res, next) => {
  const { name, subject, description } = req.body;
  try {
    const findUniqueName = await prisma.emailTemplate.findUnique({
      where: {
        name: name,
      },
    });

    if (findUniqueName) {
      return res.status(409).json({
        isSuccess: true,
        message: "Name already exist",
        data: [],
      });
    }
    const result = await prisma.emailTemplate.create({
      data: { name, subject, description },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Email template created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const getEmailTemplate = async (req, res, next) => {
  try {
    const result = await prisma.emailTemplate.findMany();
    return res.status(200).json({
      isSuccess: true,
      message: "Email template get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const paginationEmailTemplate = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.emailTemplate.count();
    if (count === 0)
      return res.status(200).json({
        isSuccess: true,
        message: "Email template not found!",
        data: [],
      });

    const result = await prisma.emailTemplate.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Email template get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateEmailTemplate = async (req, res, next) => {
  const id = req.params.id;
  const { name, subject, description } = req.body;
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const [existingEmailTemplate, uniqueCode] = await prisma.$transaction([
      prisma.emailTemplate.findUnique({
        where: { id: id },
      }),
      prisma.emailTemplate.findFirst({
        where: { id: { not: id }, name: name },
      }),
    ]);

    // const existingEmailTemplate = await prisma.emailTemplate.findUnique({
    //   where: { id: id },
    // });

    if (!existingEmailTemplate) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Email Template not found!" });
    }

    if (uniqueCode)
      return res.status(400).json({
        isSuccess: false,
        message: "Email Template name already exists!",
      });
    const result = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        description,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Email template updated successfully.",
      data: result,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteEmailTemplate = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("emailTemplate", id);
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

export {
  postEmailTemplate,
  getEmailTemplate,
  paginationEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
};
