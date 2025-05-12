import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  fileValidation,
  fileValidationError,
  updatePosition,
  updateStatus,
} from "../../helper/common.js";

const postHomeBanner = async (req, res, next) => {
  try {
    const { title, bannerType, description, url, isActive } = req.body;

    const fileError = await fileValidationError(req.files, bannerType);
    if (fileError.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: fileError.message });

    const [uniqueCode, count] = await prisma.$transaction([
      // HERE WE CHECK UIQUE AND COUNT
      prisma.homeBanner.findFirst({ where: { title } }),
      prisma.homeBanner.count(),
    ]);
    if (uniqueCode) {
      //   await deleteFile(filepath); // THIS FUNCTION USED FOR DELETE FILE IN UPLOAD FOLDER
      if (req.files) {
        await fileValidation(req.files, true);
      }

      return res.status(409).json({
        isSuccess: false,
        message: "Banner title already exists!",
      });
    }
    const desktopImagePath = await convertFilePathSlashes(
      req.files.desktopImage[0].path
    );
    let mobileImagePath;
    if (req.files.mobileImage) {
      mobileImagePath = await convertFilePathSlashes(
        req.files.mobileImage[0].path
      );
    }

    const result = await prisma.homeBanner.create({
      data: {
        position: count + 1,
        title,
        bannerType,
        description,
        url,
        desktopImage: desktopImagePath,
        ...(mobileImagePath && { mobileImage: mobileImagePath }),
        isActive,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Home banner create successfully.",
      data: result,
    });
  } catch (err) {
    if (req.files) {
      await fileValidation(req.files, true);
    }
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getHomeBanner = async (req, res, next) => {
  try {
    const result = await prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" }
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Home banners get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const paginationHomeBanner = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.query;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.homeBanner.count();
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Home banner not found!", data: [] });

    const result = await prisma.homeBanner.findMany({
      orderBy: { position: "asc" },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Home banner get successfully.",
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

const updateHomeBanner = async (req, res, next) => {
  const desktopImage = req.files?.desktopImage;
  const mobileImage = req.files?.mobileImage;
  const { title, bannerType, description, url, isActive } = req.body;
  let desktopImagePath = null;
  let mobileImagePath = null;

  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const [existingHomeBanner, uniqueCode] = await prisma.$transaction([
      prisma.homeBanner.findUnique({ where: { id: id } }),
      prisma.homeBanner.findFirst({
        where: { id: { not: id }, title: title },
      }),
    ]);

    if (!existingHomeBanner) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Home banner not found!" });
    }

    if (uniqueCode)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Banner title already exists!" });

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

    if (desktopImage) {
      desktopImagePath = await convertFilePathSlashes(desktopImage[0].path);
    }
    if (mobileImage) {
      mobileImagePath = await convertFilePathSlashes(mobileImage[0].path);
    }

    if (desktopImage) {
      await deleteFile(existingHomeBanner?.desktopImage);
    }
    if (mobileImage) {
      await deleteFile(existingHomeBanner?.mobileImage);
    }
    const result = await prisma.homeBanner.update({
      where: { id },
      data: {
        title,
        bannerType,
        description,
        url,
        isActive,
        ...(desktopImage && { desktopImage: desktopImagePath }),
        ...(mobileImage && { mobileImage: mobileImagePath }),
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Home banner updated successfully.",
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

const deleteHomeBanner = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("homeBanner", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    await deleteFile(result.data.desktopImage);
    await deleteFile(result.data.mobileImage);
    await prisma.homeBanner.updateMany({
      where: {
        position: { gt: result.data.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });
    return res
      .status(200)
      .json({ isSuccess: true, message: "Home banner deleted successfully." });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateHomeBannerStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("homeBanner", id);
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
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const homeBannerPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "homeBanner";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Home banner positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteHomeBannerImage = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const uniqueHomeBanner = await prisma.homeBanner.findUnique({
      where: { id: id },
    });

    if (!uniqueHomeBanner) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Home banner not found!" });
    }
    await deleteFile(uniqueHomeBanner?.mobileImage);

    const result = await prisma.homeBanner.update({
      where: { id: id },
      data: {
        mobileImage: "",
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Home banner image deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = "Something went wrong, please try again! ";
    next(error);
  }
};
export {
  postHomeBanner,
  getHomeBanner,
  paginationHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
  updateHomeBannerStatus,
  homeBannerPosition,
  deleteHomeBannerImage,
};
