import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postShippingMethod = async (req, res, next) => {
  try {
    const { name, price, description, isActive } = req.body;

    const findUniqueName = await prisma.shippingMethod.findFirst({
      where: { name: name },
    });

    if (findUniqueName)
      return res.status(409).json({
        isSuccess: false,
        message: "Shipping method name already exists!",
        data: [],
      });

    const result = await prisma.shippingMethod.create({
      data: { name, price, description, isActive },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping method created successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getShippingMethod = async (req, res, next) => {
  try {
    const result = await prisma.shippingMethod.findMany({});
    return res.status(200).json({
      isSuccess: true,
      message: "Shipping method get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong,please try again!");
    next(error);
  }
};

const updateShippingMethod = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, price, description, isActive } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const [findUnique, findUniqueName] = await prisma.$transaction([
      prisma.shippingMethod.findUnique({ where: { id: id } }),
      prisma.shippingMethod.findFirst({
        where: { id: { not: id }, name: name },
      }),
    ]);

    if (!findUnique)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Shipping method not found!" });

    if (findUniqueName)
      return res.status(400).json({
        isSuccess: false,
        message: "Shipping method name already exist!",
      });

    const result = await prisma.shippingMethod.update({
      where: { id: id },
      data: { name, price, description, isActive },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping method updated successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteShippingMethod = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const { status, message, data } = await deleteData("shippingMethod", id);
    if (!status)
      return res.status(404).json({ isSuccess: status, message: message });

    return res.status(200).json({
      isSuccess: status,
      message: message,
      data: data,
    });
  } catch (err) {
    const error = new Error("Something went wrong,please try again!");
    next(error);
  }
};

const shippingMethodStatus = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const { status, message, data } = await updateStatus("shippingMethod", id);
    if (!status)
      return res.status(400).json({ isSuccess: status, message: message });
    return res
      .status(200)
      .json({ isSuccess: status, message: message, data: data });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postShippingMethod,
  getShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  shippingMethodStatus,
};
