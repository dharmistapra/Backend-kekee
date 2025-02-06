import prisma from "../../DB/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  deleteImage,
  updateStatus,
} from "../../helper/common.js";

const postContactDetail = async (req, res, next) => {
  const { name, description, isActive } = req.body;
  try {
    const image = req.file;
    let filepath = "";
    if (image?.path) {
      filepath = await convertFilePathSlashes(image.path);
    }
    const [finduniquename, count] = await prisma.$transaction([
      prisma.contactDetails.findFirst({ where: { name: name } }),
      prisma.contactDetails.count(),
    ]);

    if (finduniquename) {
      return res.status(409).json({
        isSuccess: true,
        message: "Name already exist",
        data: [],
      });
    }
    const result = await prisma.contactDetails.create({
      data: {
        position: count + 1,
        image: filepath,
        name,
        description,
        isActive,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Contact detail created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const getContactDetails = async (req, res, next) => {
  try {
    const result = await prisma.contactDetails.findMany({
      where: { isActive: true },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Contact details get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const paginationContactDetails = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.contactDetails.count();
    if (count === 0)
      return res.status(200).json({
        isSuccess: true,
        message: "Contact details not found!",
        data: [],
      });

    const result = await prisma.contactDetails.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Contact details get successfully.",
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

const updateContactDetails = async (req, res, next) => {
  const id = req.params.id;
  const { name, description } = req.body;
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const newImage = req.file && convertFilePathSlashes(req.file.path);

    const [existingContactDetails, uniqueCode] = await prisma.$transaction([
      prisma.contactDetails.findUnique({
        where: { id: id },
      }),
      prisma.contactDetails.findFirst({
        where: { id: { not: id }, name: name },
      }),
    ]);

    if (!existingContactDetails) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Contact details not found!" });
    }
    if (uniqueCode)
      return res.status(400).json({
        isSuccess: false,
        message: "Contact Details Name already exists!",
      });

    const result = await prisma.contactDetails.update({
      where: { id },
      data: {
        image: newImage ? newImage : existingContactDetails.image,
        name,
        description,
      },
    });

    if (newImage && existingContactDetails.image !== "")
      await deleteFile(existingContactDetails.image);
    return res.status(200).json({
      isSuccess: true,
      message: "Contact details updated successfully.",
      data: result,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteContactDetails = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, message, data } = await deleteData("contactDetails", id);
    if (!status)
      return res.status(400).json({ isSuccess: status, message: message });
    if (data.image !== "") await deleteFile(data.image);
    const updateCount = await prisma.contactDetails.updateMany({
      where: { position: { gte: data.position } },
      data: {
        position: {
          decrement: 1,
        },
      },
    });
    return res.status(200).json({
      isSuccess: status,
      message: message,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteContactDetailsImage = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, message } = await deleteImage("contactDetails", id);
    if (!status)
      return res.status(400).json({ isSuccess: status, message: message });
    return res.status(200).json({ isSuccess: true, message: message });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const updateContactDetailsStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("contactDetails", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export {
  postContactDetail,
  getContactDetails,
  paginationContactDetails,
  updateContactDetails,
  deleteContactDetails,
  deleteContactDetailsImage,
  updateContactDetailsStatus,
};
