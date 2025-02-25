import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  updatePosition,
  updateStatus,
} from "../../helper/common.js";

const postPaymentMethod = async (req, res, next) => {
  try {
    const { name, keyId, secretKey, charge, description } = req.body;
    const image = req.file;
    let filepath = "";
    if (image?.path) {
      filepath = await convertFilePathSlashes(image.path);
    }

    const [uniqueName, count] = await prisma.$transaction([
      prisma.paymentMethods.findFirst({ where: { name: name } }),
      prisma.paymentMethods.count(),
    ]);

    if (uniqueName) {
      if (req.file) await deleteFile(req.file.path);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Payment method already exist!" });
    }

    const result = await prisma.paymentMethods.create({
      data: {
        position: count + 1,
        name,
        // keyId,
        // secretKey,
        image: filepath,
        charge,
        description,
      },
      select: {
        id: true,
        position: true,
        name: true,
        keyId: true,
        secretKey: true,
        image: true,
        charge: true,
        description: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Payment method create successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, Please try again!");
    next(error);
  }
};

const getPaymentMethod = async (req, res, next) => {
  try {
    const result = await prisma.paymentMethods.findMany({
      orderBy: { position: "asc" },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Payment methods get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const updatePaymentMethod = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400).json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const { keyId, secretKey, charge, description } = req.body;
    const image = req.file;
    let filepath = null;
    if (image?.path) {
      filepath = convertFilePathSlashes(image.path);
    }

    const existingPaymentMethod = await prisma.paymentMethods.findUnique({
      where: { id: id },
    });
    if (!existingPaymentMethod) {
      if (image) await deleteFile(req.file.path);
      return res
        .status(404)
        .json({ isSuccess: false, message: "Payment method not found!" });
    }


    const result = await prisma.paymentMethods.update({
      where: { id: id },
      data: {
        keyId,
        secretKey,
        image: filepath ? filepath : existingPaymentMethod.image,
        charge,
        description,
      },
      select: {
        id: true,
        name: true,
        keyId: true,
        secretKey: true,
        image: true,
        charge: true,
        description: true,
      },
    });

    if (image && existingPaymentMethod.image !== "")
      await deleteFile(existingPaymentMethod.image);
    return res.status(200).json({
      isSuccess: true,
      message: "Payment method updated successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deletePaymentMethod = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const { status, message, data } = await deleteData("paymentMethods", id);

    if (!status)
      return res.status(404).json({ isSuccess: status, message: message });

    if (data.image !== "") await deleteFile(data.image);

    await prisma.paymentMethods.updateMany({
      where: { position: { gt: data.position } },
      data: { position: { decrement: 1 } },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Payment method deleted successfully.",
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const paymentMethodStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const { status, message, data } = await updateStatus("paymentMethods", id);
    if (!status) {
      return res.status(400).json({ isSuccess: status, message: message });
    }

    return res
      .status(200)
      .json({ isSuccess: status, message: message, data: data });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const paymentMethodPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "paymentMethods";
    const { status, message } = await updatePosition(model, data);

    if (!status) {
      return res.status(400).json({ isSuccess: status, message: message });
    }
    return res.status(200).json({
      isSuccess: true,
      message: "Payment methods position updated successfully.",
    });
  } catch (err) {
    const error = new Error("something went wrong, please try again!");
    next(error);
  }
};

const deletePaymentMethodImage = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const existingPaymentMethod = await prisma.paymentMethods.findUnique({
      where: { id: id },
    });

    if (!existingPaymentMethod)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Payment method not found!" });

    if (existingPaymentMethod.image === "") {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Payment method image not found!" });
    }
    const result = await prisma.paymentMethods.update({
      where: { id: id },
      data: { image: "" },
    });
    await deleteFile(existingPaymentMethod.image);

    return res.status(200).json({
      isSuccess: true,
      message: "Payment method Image deleted successfully.",
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};


const getPaymentMethodpublic = async (req, res, next) => {
  try {
    const result = await prisma.paymentMethods.findMany({
      where: {
        isActive: true
      },
      orderBy: { position: "asc" },
      select: {
        name: true,
        charge: true,
        description: true,
        image: true
      }
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Payment methods get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postPaymentMethod,
  getPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  paymentMethodStatus,
  paymentMethodPosition,
  deletePaymentMethodImage,
  getPaymentMethodpublic
};
