import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteFile,
  deleteImage,
  fileValidation,
  updatePosition,
  updateStatus,
} from "../../helper/common.js";

// CATEGORY ADD
const postCollection = async (req, res, next) => {
  try {
    let {
      name,
      title,
      meta_title,
      meta_keyword,
      meta_description,
      isActive,
      showInHome,
    } = req.body;

    // attributes = attributes && attributes?.split(",");
    // const image = req.file;
    // let filepath = "";
    // if (image?.path) {
    //   filepath = await convertFilePathSlashes(image.path);
    // }
    // let filter = { where: { parent_id: null } };
    // if (parent_id) {
    //   const isParentCategoryExists = await prisma.categoryMaster.findUnique({
    //     where: { id: parent_id },
    //   });
    //   if (!isParentCategoryExists) {
    //     if (req.file) await fileValidation(req.file, false);
    //     return res
    //       .status(404)
    //       .json({ isSuccess: false, message: "Parent Category is not found!" });
    //   }
    //   filter = { where: { parent_id: parent_id } };
    // }
    // console.log(parent_id);
    const [uniqueCollection, count] = await prisma.$transaction([
      prisma.collection.findUnique({
        where: { name },
      }),
      prisma.collection.count(),
    ]);

    if (uniqueCollection) {
      //   if (req.file) await fileValidation(req.file, false);
      return res.status(409).json({
        isSuccess: false,
        message: "Collection name already exists!",
      });
    }

    // let attributeConnection = [];
    // if (attributes && attributes.length > 0) {
    //   const isAttributeExists = await prisma.attributeMaster.findMany({
    //     where: { id: { in: attributes } },
    //     select: { id: true },
    //   });
    //   const existingAttributeIds = isAttributeExists.map((attr) => attr.id);
    //   const invalidAttributes = attributes.filter(
    //     (attrId) => !existingAttributeIds.includes(attrId)
    //   );
    //   if (invalidAttributes.length > 0) {
    //     if (req.file) await fileValidation(req.file, false);
    //     return res.status(404).json({
    //       isSuccess: false,
    //       message: "Invalid Attributes provided.",
    //       invalidAttributes,
    //     });
    //   }

    //   attributeConnection = attributes.map((attrId) => ({
    //     attribute: { connect: { id: attrId } },
    //   }));
    // }

    const data = await prisma.collection.create({
      data: {
        name,
        title,
        position: count + 1,
        meta_title,
        meta_keyword,
        meta_description,
        isActive,
        showInHome,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Collection created successfully.",
      data,
    });
  } catch (err) {
    console.log("ref", err);
    // if (req.file) await fileValidation(req.file, false);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
// GET ALL COLLECTION
const getAllCollection = async (req, res, next) => {
  try {
    const data = await prisma.collection.findMany({
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        isActive: true,
        showInHome: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Collection retrieved successfully.",
      data,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// GET CATEGORY WITH PAGINATION
const collectionPagination = async (req, res, next) => {
  try {
    const { perPage, pageNo, parent_id } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    // Get the total count of categories where parent_id is null
    const count = await prisma.collection.count();

    if (count === 0) {
      return res
        .status(200)
        .json({ isSuccess: false, message: "Collection not found!", data: [] });
    }

    // Fetch categories with necessary fields and batch attribute IDs
    const result = await prisma.collection.findMany({
      //   where: { parent_id: parent_id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        // parent_id: true,
        name: true,
        title: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        showInHome: true,
        createdAt: true,
        updatedAt: true,
        // image: true,
        // CategoryAttribute: {
        //   select: {
        //     id: true,
        //     category_id: true,
        //     attribute: {
        //       select: {
        //         id: true,
        //         key: true,
        //         name: true,
        //       },
        //     },
        //   },
        // },
        // _count: {
        //   select: {
        //     children: true,
        //     products: {
        //       where: {
        //         product: {
        //           AND: [{ showInSingle: true }, { catalogue_id: null }],

        //           // showInSingle: true,
        //         },
        //       },
        //     },
        //     CatalogueCategory: {
        //       where: {
        //         catalogue: {
        //           deletedAt: null,
        //         },
        //       },
        //     },
        //     // CatalogueCategory: true,
        //   },
        // },
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Collection get successfully.",
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
const updateCollection = async (req, res, next) => {
  try {
    const id = req.params.id;
    let {
      name,
      title,
      meta_title,
      meta_keyword,
      meta_description,
      isActive,
      showInHome,
    } = req.body;
    // attributes = attributes && attributes?.split(",");

    // const newImage = req.file && convertFilePathSlashes(req.file.path);

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      //   if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }

    const categoryData = await prisma.collection.findUnique({
      where: { id: id },
    });

    if (!categoryData) {
      //   if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category not found!" });
    }
    // let filter = { parent_id: null };

    // if (parent_id) {
    //   const isParentCategoryExists = await prisma.categoryMaster.findUnique({
    //     where: { id: parent_id },
    //   });
    //   if (!isParentCategoryExists) {
    //     if (req.file) await fileValidation(req.file, true);
    //     return res
    //       .status(404)
    //       .json({ isSuccess: false, message: "Parent Category not found!" });
    //   }

    //   filter = { id: { not: id }, parent_id: parent_id };
    // }
    const [uniqueCollection, count] = await prisma.$transaction([
      prisma.collection.findFirst({
        where: { id: { not: id }, name: name },
      }),
      prisma.collection.count(),
    ]);

    if (uniqueCollection) {
      //   if (req.file) await fileValidation(req.file, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Collection name already exists!" });
    }

    // let attributeConnections = [];
    // if (attributes && attributes.length > 0) {
    //   const isAttributeExists = await prisma.attributeMaster.findMany({
    //     where: { id: { in: attributes } },
    //     select: { id: true },
    //   });

    //   const existingAttributeIds = isAttributeExists.map((attr) => attr.id);
    //   const invalidAttributes = attributes.filter(
    //     (id) => !existingAttributeIds.includes(id)
    //   );

    //   if (invalidAttributes.length > 0) {
    //     return res.status(400).json({
    //       isSuccess: false,
    //       message: "Invalid Attribute provided.",
    //       invalidAttributes,
    //     });
    //   }

    //   // Prepare connections for attributes
    //   attributeConnections = attributes.map((attrId) => ({
    //     attribute: { connect: { id: attrId } },
    //   }));
    // }

    // if (categoryData.parent_id !== parent_id) {
    //   const updatePosition = await prisma.categoryMaster.updateMany({
    //     where: {
    //       parent_id: categoryData.parent_id,
    //       position: { gte: categoryData.position },
    //     },
    //     data: { position: { decrement: 1 } },
    //   });
    // }

    const data = await prisma.collection.update({
      where: { id: id },
      data: {
        name,
        title,
        // ...(categoryData.parent_id !== parent_id && { position: count + 1 }),
        // parent: parent_id
        //   ? { connect: { id: parent_id } }
        //   : { disconnect: true },
        meta_title,
        meta_keyword,
        // image: newImage ? newImage : categoryData.image,
        meta_description,
        isActive,
        showInHome,
        // ...(attributes &&
        //   attributes.length > 0 && {
        //     CategoryAttribute: {
        //       deleteMany: {},
        //       create: attributeConnections,
        //     },
        //   }),
      },
    });

    // if (newImage && categoryData.image !== "") {
    //   await deleteFile(categoryData.image);
    // }
    return res.status(200).json({
      isSuccess: true,
      message: "Collection update successfully.",
      data,
    });
  } catch (err) {
    console.log(err);
    // if (req.file) await fileValidation(req.file, true);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
// DELETE CATEGORY WITH UPDATE A POSITION
const deleteCollection = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const collection = await prisma.collection.findUnique({
      where: { id: id },
      //   select: {
      //     parent_id: true,
      //   },
    });

    if (!collection) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Collection not found!" });
    }

    // const [findMenu, isCatalogueExists] =
    //   await prisma.$transaction([
    //     prisma.menu.findFirst({ where: { category_id: id } }),
    //     prisma.catalogueCategory.findMany({ where: { category_id: id } }),
    //   ]);

    // if (findMenu)
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message: "Please delete menu before deleteing this category.",
    //   });

    // if (isCatalogueExists.length > 0)
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message: "Please remove catalogues before deleting this category.",
    //   });
    const positionToDelete = await prisma.collection.delete({
      where: { id: id },
    });

    // if (positionToDelete.image !== "") await deleteFile(positionToDelete.image);

    const updatedCount = await prisma.collection.updateMany({
      where: {
        //   parent_id: null,
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

    return res
      .status(200)
      .json({ isSuccess: true, message: "Collection deleted successfully." });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
//UPDATE STATUS OF CATEGORY
const updateCollectionStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("collection", id);
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

const collectionPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "collection";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Collection positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getCollection = async (req, res, next) => {
  try {
    const result = await prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        isActive: true,
        showInHome: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Collections get successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// GET ALL CATEGORY
// const getSubCategory = async (req, res, next) => {
//   try {
//     const parent_id = req.params.id;
//     if (!/^[a-fA-F0-9]{24}$/.test(parent_id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format." });
//     }
//     const data = await prisma.categoryMaster.findMany({
//       where: { id: parent_id },
//       orderBy: { position: "asc" },
//       select: {
//         id: true,
//         name: true,
//         children: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//       },
//     });

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Categories get successfully.",
//       data,
//     });
//   } catch (err) {
//     console.error("Error fetching categories:", err);
//     let error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

// const deleteCategoryImage = async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const { status, message } = await deleteImage("category", id);
//     if (!status)
//       return res.status(400).json({ isSuccess: status, message: message });
//     return res.status(200).json({ isSuccess: status, message: message });
//   } catch (err) {
//     const error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

export {
  postCollection,
  getAllCollection,
  collectionPagination,
  updateCollection,
  deleteCollection,
  updateCollectionStatus,
  collectionPosition,
  getCollection,
};
