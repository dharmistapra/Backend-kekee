import prisma from "../../DB/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postSocialMedia = async (req, res, next) => {
  const { icon, name, url } = req.body;
  try {
    const finduniquename = await prisma.socialMedia.findUnique({
      where: {
        name: name,
      },
    });

    if (finduniquename) {
      return res.status(409).json({
        isSuccess: true,
        message: "Name already exist",
        data: [],
      });
    }
    const result = await prisma.socialMedia.create({
      data: { icon, name, url },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Social media icon created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const getSocialMedia = async (req, res, next) => {
  try {
    const result = await prisma.socialMedia.findMany({
      where: { isActive: true },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Social Media icon get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const paginationSocialMedia = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.socialMedia.count();
    if (count === 0)
      return res.status(200).json({
        isSuccess: true,
        message: "Social Media icon not found!",
        data: [],
      });

    const result = await prisma.socialMedia.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Social Media icon get successfully.",
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

const updateSocialMedia = async (req, res, next) => {
  const id = req.params.id;
  const { icon, name, url } = req.body;
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const existingSocialMedia = await prisma.socialMedia.findUnique({
      where: { id: id },
    });

    if (!existingSocialMedia) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Social Media icon not found!" });
    }
    const result = await prisma.socialMedia.update({
      where: { id },
      data: {
        icon,
        name,
        url,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Social Media icon updated successfully.",
      data: result,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteSocialMedia = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("socialMedia", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: result.message,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateSocialMediaStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("socialMedia", id);
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
  postSocialMedia,
  getSocialMedia,
  paginationSocialMedia,
  updateSocialMedia,
  deleteSocialMedia,
  updateSocialMediaStatus,
};
