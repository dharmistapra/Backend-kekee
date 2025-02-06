import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postLabels = async (req, res, next) => {
  try {
    const { name, colorCode } = req.body;

    const [uniqueCode, count] = await prisma.$transaction([
      prisma.labels.findFirst({
        where: { name },
      }),
      prisma.labels.count(),
    ]);
    if (uniqueCode) {
      return res.status(409).json({
        isSuccess: false,
        message: "name already exists!",
      });
    }
    const result = await prisma.labels.create({
      data: {
        name,
        colorCode,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Labels created successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Internal Server Error!");
    next(error);
  }
};

const getAllLabels = async (req, res, next) => {
  try {
    const result = await prisma.labels.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        colorCode: true,
        isActive: true,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Labels get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong please try again!");
    next(error);
  }
};

const updatelabels = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const { name, colorCode } = req.body;

    const existinglabels = await prisma.labels.findUnique({
      where: { id: id },
    });
    if (!existinglabels)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Labels not found!", data: [] });

    const result = await prisma.labels.update({
      where: { id: id },
      data: { name: name, colorCode: colorCode },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Labels update successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteLabels = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const result = await deleteData("labels", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });
    return res
      .status(200)
      .json({ isSuccess: true, message: "Labels deleted successfully." });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const labelstatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await updateStatus("labels", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { postLabels, getAllLabels, labelstatus, updatelabels, deleteLabels };
