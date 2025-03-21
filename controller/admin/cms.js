import prisma from "../../db/config.js";
import {
  deleteData,
  updatePosition,
  updateStatus,
} from "../../helper/common.js";
import slug from "slug";

const postCms = async (req, res, next) => {
  try {
    const {
      title,
      description,
      meta_title,
      meta_keyword,
      meta_description,
      url,
    } = req.body;
    const slugUrl = url ? slug(url) : slug(title);

    const [uniqueCode, count] = await prisma.$transaction([
      prisma.cmsPage.findFirst({
        where: { title },
      }),
      prisma.cmsPage.count(),
    ]);

    if (uniqueCode) {
      return res.status(409).json({
        isSuccess: false,
        message: "cms title already exists!",
      });
    }
    const result = await prisma.cmsPage.create({
      data: {
        position: count + 1,
        title: title,
        description: description,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        url: slugUrl,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "CMS page created successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Internal Server Error!");
    next(error);
  }
};

const getAllCms = async (req, res, next) => {
  try {
    const result = await prisma.cmsPage.findMany({
      where: { isActive: true },
      select: {
        position: true,
        title: true,
        url: true,
      },
      orderBy: { position: "asc" },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "CMS pages get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong please try again!");
    next(error);
  }
};
const getCms = async (req, res, next) => {
  try {
    const url = req.params.url;
    const result = await prisma.cmsPage.findFirst({
      where: { url: url },
      select: {
        position: true,
        title: true,
        url: true,
        description: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
      },
    });
    if (!result)
      return res
        .status(404)
        .json({ isSuccess: false, message: "CMS page not found!" });
    return res.status(200).json({
      isSuccess: true,
      data: result,
      message: "CMS page get successfully.",
    });
  } catch (err) {
    const error = new Error("Something went wrong please try again!");
    next(error);
  }
};

const paginationCms = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.cmsPage.count();
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "CMS page not found!", data: [] });
    const result = await prisma.cmsPage.findMany({
      skip,
      take,
      orderBy: { position: "asc" },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "CMS pages get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (err) {
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const updateCms = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const {
      title,
      description,
      meta_title,
      meta_keyword,
      meta_description,
      url,
    } = req.body;
    const slugUrl = url ? slug(url) : slug(title);
    console.log("slugUrl", slugUrl);

    const existingCMS = await prisma.cmsPage.findUnique({ where: { id: id } });
    if (!existingCMS)
      return res
        .status(404)
        .json({ isSuccess: false, message: "CMS page not found!", data: [] });

    const result = await prisma.cmsPage.update({
      where: { id: id },
      data: {
        title: title,
        description: description,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        url: slugUrl,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "CMS page update successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteCms = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const result = await deleteData("cmsPage", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    await prisma.cmsPage.updateMany({
      where: {
        position: { gt: result.data.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    return res
      .status(200)
      .json({ isSuccess: true, message: "CMS page deleted successfully." });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const cmsStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await updateStatus("cmsPage", id);
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

const cmsPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "cmsPage";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "CMS page positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postCms,
  getAllCms,
  paginationCms,
  updateCms,
  deleteCms,
  cmsStatus,
  cmsPosition,
  getCms,
};
