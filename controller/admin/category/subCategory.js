import prisma from "../../../db/config.js";

// SUBCATEGORY ADD
const postSubCategory = async (req, res, next) => {
  try {
    const { name, parent_id, meta_title, meta_keyword, meta_description } =
      req.body;
    const count = await prisma.categoryMaster.count({
      where: { parent_id: { not: null } },
    });
    const newposition = count + 1;
    const UniqueData = await prisma.categoryMaster.findMany({
      where: { name: name },
    });
    if (UniqueData.length > 0)
      return res
        .status(200)
        .json({ isSuccess: false, message: "Data already exists!" });
    const result = await prisma.categoryMaster.create({
      data: {
        name,
        parent_id: parent_id,
        meta_title,
        meta_keyword,
        meta_description,
        position: newposition,
      },
    });

    res.status(201).json({
      isSuccess: true,
      message: "Category created successfully.",
      data: result,
    });
  } catch (error) {
    let err = new Error("Internal Server Error!");
    next(err);
  }
};
//Get All SUBCATEGORY ACCORDING TO PARENT CATEGORY ID
const getAllSubCategory = async (req, res, next) => {
  try {
    const parent_id = req.params.parent_id;
    if (!/^[a-fA-F0-9]{24}$/.test(parent_id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const result = await prisma.categoryMaster.findMany({
      where: { parent_id: parent_id },
    });

    if (result.length > 0) {
      return res.status(200).json({
        isSuccess: true,
        message: "Categories get Succesfully.",
        data: result,
      });
    } else {
      return res
        .status(200)
        .json({ isSuccess: false, message: "Data Does Not Found ", result });
    }
  } catch (err) {
    let error = new Error("Internal Server Error");
    next(error);
  }
};
// GET CATEGORY WITH PAGINATION
const subCategoryPagination = async (req, res, next) => {
  try {
    const parent_id = req.params.parent_id;
    if (!/^[a-fA-F0-9]{24}$/.test(parent_id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const page = +req.query.page || 1;
    const perpagesize = +req.query.perpagesize || 10;
    const skip = (page - 1) * perpagesize;
    const take = perpagesize;
    const count = await prisma.categoryMaster.count({
      where: { parent_id: parent_id },
    });
    if (count === 0)
      return res
        .status(300)
        .json({ isSuccess: false, message: "Category not found!" });
    const result = await prisma.categoryMaster.findMany({
      where: { parent_id: parent_id },
      orderBy: { position: "desc" },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories Get Successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: perpagesize,
    });
  } catch (err) {
    let error = new Error("Internal Server Error");
    next(error);
  }
};

export { postSubCategory, getAllSubCategory, subCategoryPagination };
