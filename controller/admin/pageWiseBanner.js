import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  fileValidation,
  fileValidationError,
  updateStatus,
} from "../../helper/common.js";

const postPageWiseBanner = async (req, res, next) => {
  try {
    const { category_id, title, bannerType, description, isActive } = req.body;

    const fileError = await fileValidationError(req.files, bannerType);
    if (fileError.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: fileError.message });

    const [uniqueCode, existingCategory, uniqueCategory] =
      await prisma.$transaction([
        prisma.pageWiseBanner.findFirst({
          where: { title: title },
        }),
        prisma.categoryMaster.findUnique({
          where: { id: category_id },
        }),
        prisma.pageWiseBanner.findFirst({
          where: { category_id: category_id },
        }),
      ]);
    if (uniqueCode) {
      //   await deleteFile(filepath); // THIS FUNCTION USED FOR DELETE FILE IN UPLOAD FOLDER
      if (req.files) await fileValidation(req.files, true);
      return res.status(409).json({
        isSuccess: false,
        message: "Banner title already exists!",
      });
    }

    if (uniqueCategory) {
      if (req.files) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category already exists!" });
    }
    if (!existingCategory) {
      if (req.files) await fileValidation(req.files, true);
      return res
        .status(404)
        .json({ isSuccess: false, message: "Category not found!" });
    }

    const desktopImagePath = await convertFilePathSlashes(
      req.files.desktopImage[0].path
    );
    const mobileImagePath = await convertFilePathSlashes(
      req.files.mobileImage[0].path
    );

    const result = await prisma.pageWiseBanner.create({
      data: {
        category_id,
        title,
        bannerType,
        description,
        desktopImage: desktopImagePath,
        mobileImage: mobileImagePath,
        isActive,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Page wise banner create successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    if (req.files) {
      await fileValidation(req.files, true);
    }
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getPageWiseBanner = async (req, res, next) => {
  try {
    const result = await prisma.pageWiseBanner.findMany();
    return res.status(200).json({
      isSuccess: true,
      message: "Page wise banners get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const paginationPageWiseBanner = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.pageWiseBanner.count();
    if (count === 0)
      return res.status(200).json({
        isSuccess: true,
        message: "Page wise banner not found!",
        data: [],
      });

    const result = await prisma.pageWiseBanner.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Page wise banner get successfully.",
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

const updatePageWiseBanner = async (req, res, next) => {
  const desktopImage = req.files?.desktopImage;
  const mobileImage = req.files?.mobileImage;
  const { category_id, title, bannerType, description, isActive } = req.body;
  let desktopImagePath = null;
  let mobileImagePath = null;

  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      if (desktopImage || desktopImage) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const [existingHomeBanner, uniqueCode, existingCategory, uniqueCategory] =
      await prisma.$transaction([
        prisma.pageWiseBanner.findUnique({ where: { id: id } }),
        prisma.pageWiseBanner.findFirst({
          where: { id: { not: id }, title: title },
        }),
        prisma.categoryMaster.findUnique({ where: { id: category_id } }),
        prisma.pageWiseBanner.findMany({
          where: { id: { not: id }, category_id: category_id },
        }),
      ]);

    if (!existingHomeBanner) {
      if (desktopImage || desktopImage) await fileValidation(req.files, true);
      return res
        .status(404)
        .json({ isSuccess: false, message: "Page wise banner not found!" });
    }

    if (uniqueCode) {
      if (desktopImage || desktopImage) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Banner title already exists!" });
    }

    if (!existingCategory) {
      if (desktopImage || desktopImage) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category not found!" });
    }

    if (!uniqueCategory) {
      if (desktopImage || desktopImage) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category already exists!" });
    }

    if (
      existingHomeBanner.bannerType !== bannerType &&
      (!desktopImage || !mobileImage)
    ) {
      if (desktopImage || mobileImage) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload valid files!" });
    }

    if (desktopImage || mobileImage) {
      const fileError = await fileValidationError(req.files, bannerType, true);
      if (fileError.status === false)
        return res
          .status(400)
          .json({ isSuccess: false, message: fileError.message });
    }

    if (desktopImage)
      desktopImagePath = await convertFilePathSlashes(desktopImage[0].path);

    if (mobileImage)
      mobileImagePath = await convertFilePathSlashes(mobileImage[0].path);

    if (desktopImage) await deleteFile(existingHomeBanner?.desktopImage);

    if (mobileImage) await deleteFile(existingHomeBanner?.mobileImage);

    const result = await prisma.pageWiseBanner.update({
      where: { id },
      data: {
        category_id,
        title,
        bannerType,
        description,
        isActive,
        ...(desktopImage && { desktopImage: desktopImagePath }),
        ...(mobileImage && { mobileImage: mobileImagePath }),
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Page wise banner updated successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    if (desktopImage || desktopImage) {
      await fileValidation(req.files, true);
    }
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deletePageWiseBanner = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("pageWiseBanner", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });
    await deleteFile(result.data.desktopImage);
    await deleteFile(result.data.mobileImage);
    return res.status(200).json({
      isSuccess: result.status,
      message: result.message,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updatePageWiseBannerStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("pageWiseBanner", id);
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
  postPageWiseBanner,
  getPageWiseBanner,
  paginationPageWiseBanner,
  updatePageWiseBanner,
  deletePageWiseBanner,
  updatePageWiseBannerStatus,
};
