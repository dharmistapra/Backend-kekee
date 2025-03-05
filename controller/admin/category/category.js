import slug from "slug";
import prisma from "../../../db/config.js";
import {
  convertFilePathSlashes,
  deleteFile,
  deleteImage,
  fileValidation,
  updatePosition,
  updateStatus,
} from "../../../helper/common.js";
import createSearchFilter from "../../../helper/searchFilter.js";

// CATEGORY ADD
const postCategory = async (req, res, next) => {
  try {
    let {
      name,
      title,
      url,
      parent_id,
      meta_title,
      meta_keyword,
      meta_description,
      attributes,
    } = req.body;

    attributes = attributes && attributes?.split(",");
    const image = req.file;
    let filepath = "";
    if (image?.path) {
      filepath = await convertFilePathSlashes(image.path);
    }
    let filter = { where: { parent_id: null } };
    if (parent_id) {
      const isParentCategoryExists = await prisma.categoryMaster.findUnique({
        where: { id: parent_id },
      });
      if (!isParentCategoryExists) {
        if (req.file) await fileValidation(req.file, false);
        return res
          .status(404)
          .json({ isSuccess: false, message: "Parent Category is not found!" });
      }
      filter = { where: { parent_id: parent_id } };
    }
    const [uniqueCategory, count] = await prisma.$transaction([
      prisma.categoryMaster.findUnique({
        where: { name },
      }),
      prisma.categoryMaster.count(filter),
    ]);

    if (uniqueCategory) {
      if (req.file) await fileValidation(req.file, false);
      return res.status(409).json({
        isSuccess: false,
        message: "Category name already exists!",
      });
    }

    let attributeConnection = [];
    if (attributes && attributes.length > 0) {
      const isAttributeExists = await prisma.attributeMaster.findMany({
        where: { id: { in: attributes } },
        select: { id: true },
      });
      const existingAttributeIds = isAttributeExists.map((attr) => attr.id);
      const invalidAttributes = attributes.filter(
        (attrId) => !existingAttributeIds.includes(attrId)
      );
      if (invalidAttributes.length > 0) {
        if (req.file) await fileValidation(req.file, false);
        return res.status(404).json({
          isSuccess: false,
          message: "Invalid Attributes provided.",
          invalidAttributes,
        });
      }

      attributeConnection = attributes.map((attrId) => ({
        attribute: { connect: { id: attrId } },
      }));
    }

    const data = await prisma.categoryMaster.create({
      data: {
        name,
        title,
        url: url ? url : slug(name),
        // parent_id: parent_id || null,
        position: count + 1,
        parent: parent_id ? { connect: { id: parent_id } } : undefined,
        ...(!parent_id && { parent_id: null }),
        meta_title,
        meta_keyword,
        meta_description,
        image: filepath,
        ...(attributes &&
          attributes.length > 0 && {
            CategoryAttribute: {
              create: attributeConnection, // connect attributes to the category
            },
          }),
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Category created successfully.",
      data,
    });
  } catch (err) {
    console.log("ref", err);
    if (req.file) await fileValidation(req.file, false);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
// GET ALL CATEGORY
const getAllParentCategory = async (req, res, next) => {
  try {
    const data = await prisma.categoryMaster.findMany({
      where: { parent_id: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        showInHome: true,
        children: {
          select: {
            id: true,
            name: true,
            title: true,
            url: true,
            showInHome: true,
          },
        },
        CategoryAttribute: {
          select: {
            id: true,
            category_id: true,
            attribute: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories retrieved successfully.",
      data,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// GET CATEGORY WITH PAGINATION
const categoryPagination = async (req, res, next) => {
  try {
    const { perPage, pageNo, parent_id, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const filter = [{ name: { contains: search, mode: "insensitive" } }];

    const searchFilter = createSearchFilter(search, filter);

    const count = await prisma.categoryMaster.count({
      where: { parent_id: parent_id || null },
    });

    if (count === 0) {
      return res
        .status(200)
        .json({ isSuccess: false, message: "Category not found!", data: [] });
    }
    const result = await prisma.categoryMaster.findMany({
      where: {
        parent_id: parent_id || null,
        ...searchFilter,
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        parent_id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        image: true,
        showInHome: true,
        CategoryAttribute: {
          select: {
            id: true,
            category_id: true,
            attribute: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            products: {
              where: {
                product: {
                  AND: [{ showInSingle: true }, { catalogue_id: null }],
                },
              },
            },
            CatalogueCategory: {
              where: {
                catalogue: {
                  deletedAt: null,
                },
              },
            },
            // CatalogueCategory: true,
          },
        },
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Category get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (err) {
    console.log("errr", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
// UPDATE CATEGORY
const updateCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    let {
      name,
      title,
      url,
      parent_id,
      meta_title,
      meta_keyword,
      meta_description,
      attributes,
    } = req.body;
    attributes = attributes && attributes?.split(",");

    const newImage = req.file && convertFilePathSlashes(req.file.path);

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }

    const categoryData = await prisma.categoryMaster.findUnique({
      where: { id: id },
    });

    if (!categoryData) {
      if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category not found!" });
    }
    let filter = { parent_id: null };
    if (parent_id == "") parent_id = null;

    if (parent_id) {
      const isParentCategoryExists = await prisma.categoryMaster.findUnique({
        where: { id: parent_id },
      });
      if (!isParentCategoryExists) {
        if (req.file) await fileValidation(req.file, true);
        return res
          .status(404)
          .json({ isSuccess: false, message: "Parent Category not found!" });
      }

      filter = { id: { not: id }, parent_id: parent_id };
    }
    const [uniqueCategory, count] = await prisma.$transaction([
      prisma.categoryMaster.findFirst({
        where: { id: { not: id }, name: name },
      }),
      prisma.categoryMaster.count({ where: filter }),
    ]);

    if (uniqueCategory) {
      if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category name already exists!" });
    }

    let attributeConnections = [];
    if (attributes && attributes.length > 0) {
      const isAttributeExists = await prisma.attributeMaster.findMany({
        where: { id: { in: attributes } },
        select: { id: true },
      });

      const existingAttributeIds = isAttributeExists.map((attr) => attr.id);
      const invalidAttributes = attributes.filter(
        (id) => !existingAttributeIds.includes(id)
      );

      if (invalidAttributes.length > 0) {
        return res.status(400).json({
          isSuccess: false,
          message: "Invalid Attribute provided.",
          invalidAttributes,
        });
      }

      // Prepare connections for attributes
      attributeConnections = attributes.map((attrId) => ({
        attribute: { connect: { id: attrId } },
      }));
    }

    if (categoryData.parent_id !== parent_id) {
      const updatePosition = await prisma.categoryMaster.updateMany({
        where: {
          parent_id: categoryData.parent_id,
          position: { gte: categoryData.position },
        },
        data: { position: { decrement: 1 } },
      });
    }

    const data = await prisma.categoryMaster.update({
      where: { id: id },
      data: {
        name,
        title,
        url: url ? url : slug(name),
        ...(categoryData.parent_id !== parent_id && { position: count + 1 }),
        parent: parent_id
          ? { connect: { id: parent_id } }
          : { disconnect: true },
        meta_title,
        meta_keyword,
        image: newImage ? newImage : categoryData.image,
        meta_description,
        ...(attributes !== ""
          ? attributes.length > 0 && {
              CategoryAttribute: {
                deleteMany: {},
                create: attributeConnections,
              },
            }
          : {
              CategoryAttribute: {
                deleteMany: {},
              },
            }),
      },
    });

    if (newImage && categoryData.image !== "") {
      await deleteFile(categoryData.image);
    }
    return res.status(200).json({
      isSuccess: true,
      message: "Category update successfully.",
      data,
    });
  } catch (err) {
    console.log(err);
    if (req.file) await fileValidation(req.file, true);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
// DELETE CATEGORY WITH UPDATE A POSITION
const deleteCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const category = await prisma.categoryMaster.findUnique({
      where: { id: id },
      select: {
        parent_id: true,
      },
    });

    if (!category) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Category not found!" });
    }

    const [findSubCategory, findMenu, isCatalogueExists] =
      await prisma.$transaction([
        prisma.categoryMaster.findMany({
          where: { parent_id: id },
          select: {
            parent_id: true,
          },
        }),
        prisma.menu.findFirst({ where: { category_id: id } }),
        prisma.catalogueCategory.findMany({ where: { category_id: id } }),
      ]);

    if (findSubCategory.length > 0) {
      return res.status(400).json({
        isSuccess: false,
        message:
          "Please delete all subcategories before deleting this category.",
      });
    }

    if (findMenu)
      return res.status(400).json({
        isSuccess: false,
        message: "Please delete menu before deleteing this category.",
      });

    if (isCatalogueExists.length > 0)
      return res.status(400).json({
        isSuccess: false,
        message: "Please remove catalogues before deleting this category.",
      });
    const positionToDelete = await prisma.categoryMaster.delete({
      where: { id: id },
    });

    if (positionToDelete.image !== "") await deleteFile(positionToDelete.image);

    if (category.parent_id) {
      const updatedCount = await prisma.categoryMaster.updateMany({
        where: {
          parent_id: category.parent_id,
          position: {
            gte: positionToDelete.position,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    } else {
      const updatedCount = await prisma.categoryMaster.updateMany({
        where: {
          parent_id: null,
          position: {
            gte: positionToDelete.position,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    }

    return res
      .status(200)
      .json({ isSuccess: true, message: "Category deleted successfully." });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
//UPDATE STATUS OF CATEGORY
const updateCategoryStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("category", id);
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

const updateCategoryShowInHomeStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const findData = await prisma.categoryMaster.findUnique({
      where: { id: id },
    });
    if (!findData)
      return res
        .status(400)
        .json({ isSuccess: false, message: "category not found!" });

    const newStatus = !findData.showInHome;
    const result = await prisma.categoryMaster.update({
      where: { id: id },
      data: { showInHome: newStatus },
    });
    return res.status(200).json({
      status: true,
      message: `Category status updated successfully.`,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const categoryPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "category";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Category positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await prisma.categoryMaster.findMany({
      where: { parent_id: null, isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        image: true,
        showInHome: true,
        // Menu: {
        //   select: {
        //     id: true,
        //     parent_id: true,
        //     name: true,
        //     url: true,
        //   },
        // },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories get successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// GET ALL CATEGORY
const getSubCategory = async (req, res, next) => {
  try {
    const parent_id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(parent_id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const data = await prisma.categoryMaster.findMany({
      where: { id: parent_id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories get successfully.",
      data,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteCategoryImage = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, message } = await deleteImage("category", id);
    if (!status)
      return res.status(400).json({ isSuccess: status, message: message });
    return res.status(200).json({ isSuccess: status, message: message });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const result = await prisma.categoryMaster.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories get successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postCategory,
  getAllParentCategory,
  categoryPagination,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  updateCategoryShowInHomeStatus,
  categoryPosition,
  getCategories,
  getSubCategory,
  deleteCategoryImage,
  getAllCategories,
};
