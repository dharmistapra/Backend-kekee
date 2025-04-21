import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  fileValidation,
  fileValidationError,
  handleCatalogueAttributeConnection,
  updateStatus,
} from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";
import { readProductsFromFile } from "./product/tempData.js";

const postCatalogue = async (req, res, next) => {
  try {
    const {
      name,
      cat_code,
      category_id,
      no_of_product,
      price,
      catalogue_discount,
      average_price,
      retail_discount,
      stitching,
      size,
      weight,
      attributes,
      meta_title,
      meta_keyword,
      meta_description,
      description,
      tag,
      isActive,
    } = req.body;
    const bannerType = "Image";
    const fileError = await fileValidationError(req.files, bannerType);
    if (fileError.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: fileError.message });

    const [uniqueCode, isCategoryExists] = await prisma.$transaction([
      prisma.catalogue.findUnique({
        where: { cat_code: cat_code },
      }),
      prisma.categoryMaster.findMany({
        where: { id: { in: category_id } },
        select: { id: true },
      }),
    ]);

    if (uniqueCode) {
      if (req.files) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Catalogue code already exists!" });
    }
    if (isCategoryExists.length === 0) {
      if (req.files) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category not found!" });
    }

    // if (attributes && attributes.length > 0) {
    // const isAttributeExists = await prisma.categoryMaster.findMany({
    //   where: { id: { in: category_id } },
    //   select: { id: true },
    // });
    let categoryConnection = [];
    const existingCategoryIds = isCategoryExists.map((cat) => cat.id);
    const invalidCategories = category_id.filter(
      (catId) => !existingCategoryIds.includes(catId)
    );
    if (invalidCategories.length > 0) {
      if (req.files) await fileValidation(req.files, true);
      return res.status(404).json({
        isSuccess: false,
        message: "Invalid Categories provided.",
        invalidCategories,
      });
    }
    categoryConnection = category_id.map((catId) => ({
      category: { connect: { id: catId } },
    }));

    let attributeValueConnection;
    if (attributes && attributes.length > 0) {
      const { status, message, data } =
        await handleCatalogueAttributeConnection(attributes, req.files);
      if (!status) {
        if (req.files) await fileValidation(req.files, true);
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }
      // attributeValueConnection = attributes.map((attrVal) => ({
      //   attributeValue: { connect: { id: attrVal } },
      // }));
      // productData["attributeValues"] = {
      //   create: data,
      // };
      attributeValueConnection = data;
    }

    const desktopImage = await convertFilePathSlashes(
      req.files.desktopImage[0].path
    );
    const mobileImage = await convertFilePathSlashes(
      req.files.mobileImage[0].path
    );

    // const products = await readProductsFromFile();
    // if (products.length === 0) {
    //   if (req.files) await fileValidation(req.files, true);
    //   return res
    //     .status(400)
    //     .json({ isSuccess: false, message: "Please uploads Products" });
    // }

    // const catProducts = await products.filter(
    //   (value) => value.cat_code === cat_code
    // );

    // const totalPrice = catProducts.reduce((accumulator, product) => {
    //   return accumulator + (product.price || 0);
    // }, 0);
    // if (totalPrice !== price) {
    //   if (req.files) await fileValidation(req.files, true);
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message: "Price mismatch with catalogue. Please verify.",
    //   });
    // }

    // if (catProducts.length !== no_of_product) {
    //   if (req.files) await fileValidation(req.files, true);
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message:
    //       "Product length mismatch with No of product in Catalogue. Please verify.",
    //   });
    // }

    console.log("Data", "hhhhhhhhhhhhhhh===========>");
    return res.status(200).json({
      isSuccess: true,
      message: "catalogue created successfully.",
      // data: result,
    });

    const result = await prisma.catalogue.create({
      data: {
        name: name,
        cat_code: cat_code,
        no_of_product: no_of_product,
        price: price,
        catalogue_discount: catalogue_discount,
        average_price: average_price,
        retail_discount: retail_discount,
        stitching: stitching,
        size: size,
        weight: weight,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        desktopImage: desktopImage,
        mobileImage: mobileImage,
        description: description,
        // ...(category_id && {
        CatalogueCategory: {
          create: categoryConnection, // connect category to the catalogue
        },
        // }),
        ...(attributes &&
          attributes.length > 0 && {
          attributeValues: { create: attributeValueConnection },
        }),
        tag: tag,
        isActive,
      },
    });

    // const productData = await catProducts.map((value) => {
    // if (value.cat_code === cat_code) {
    //   value["categories"] = categoryConnection;
    //   value.catalogue_id = result.id;
    //   delete value.id && value.cat_code;
    //   // }
    //   return value;
    // });
    // productData = await Promise.all(productData);
    // const data = await prisma.product.createMany(productData);
    // if (!data) {
    //   return res
    //     .status(400)
    //     .json({ isSuccess: false, message: "Product not created." });
    // }
    return res.status(200).json({
      isSuccess: true,
      message: "catalogue created successfully.",
      data: result,
    });
  } catch (err) {
    if (req.files) await fileValidation(req.files, true);
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    return next(error);
  }
};

const paginationCatalogue = async (req, res, next) => {
  try {
    const { category_id, perPage, pageNo, search } = req.query;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const filter = [

      { name: { contains: search, mode: "insensitive" } },
      { cat_code: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
      {
        no_of_product: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      { quantity: isNaN(search) ? undefined : { equals: parseFloat(search) } },
      { price: isNaN(search) ? undefined : { equals: parseFloat(search) } },
      {
        catalogue_discount: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      {
        average_price: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      { GST: isNaN(search) ? undefined : { equals: parseFloat(search) } },
      {
        offer_price: isNaN(search) ? undefined : { equals: parseFloat(search) },
      },
    ];

    const searchFilter = createSearchFilter(search, filter);

    if (!category_id) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please provide category_id!" });
    }

    const condition = {
      CatalogueCategory: { some: { category_id: category_id } },
      deletedAt: null,
      ...searchFilter,
    };
    const count = await prisma.catalogue.count({ where: condition });
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Catalogue not found!", data: [] });

    const result = await prisma.catalogue.findMany({
      where: condition,
      select: {
        id: true,
        name: true,
        cat_code: true,
        no_of_product: true,
        url: true,
        quantity: true,
        price: true,
        catalogue_discount: true,
        average_price: true,
        GST: true,
        offer_price: true,
        optionType: true,
        weight: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        coverImage: true,
        description: true,
        tag: true,
        isActive: true,
        deletedAt: true,
        _count: {
          select: {
            Product: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, plese try again!");
    next(error);
  }
};

const updateCatalogue = async (req, res, next) => {
  try {
    const {
      name,
      cat_code,
      category_id,
      no_of_product,
      price,
      catalogue_discount,
      average_price,
      retail_discount,
      stitching,
      size,
      weight,
      attributes,
      meta_title,
      meta_keyword,
      meta_description,
      description,
      tag,
      isActive,
    } = req.body;

    const desktopImage = req.files?.desktopImage;
    const mobileImage = req.files?.mobileImage;

    let desktopImagePath = null;
    let mobileImagePath = null;
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const [existingCatalogue, uniqueCode, isCategoryExists] =
      await prisma.$transaction([
        prisma.catalogue.findUnique({ where: { id: id } }),
        prisma.catalogue.findFirst({
          where: { id: { not: id }, cat_code: cat_code },
        }),
        prisma.categoryMaster.findMany({ where: { id: { in: category_id } } }),
      ]);

    if (!existingCatalogue) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Catalogue not found!" });
    }

    if (uniqueCode)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Catalogue code already exists!" });

    if (!isCategoryExists) {
      if (req.files) await fileValidation(req.files, true);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Category not found!" });
    }

    let categoryConnection = [];
    const existingCategoryIds = isCategoryExists.map((cat) => cat.id);
    const invalidCategories = category_id.filter(
      (catId) => !existingCategoryIds.includes(catId)
    );
    if (invalidCategories.length > 0) {
      if (req.files) await fileValidation(req.files, true);
      return res.status(404).json({
        isSuccess: false,
        message: "Invalid Categories provided.",
        invalidCategories,
      });
    }
    categoryConnection = category_id.map((catId) => ({
      category: { connect: { id: catId } },
    }));

    let attributeValueConnection;
    if (attributes && attributes.length > 0) {
      const { status, message, data } =
        await handleCatalogueAttributeConnection(
          attributes,
          req.files && req.files
        );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      // attributeValueConnection = attributes.map((attrVal) => ({
      //   attributeValue: { connect: { id: attrVal } },
      // }));
      // productData["attributeValues"] = {
      //   create: data,
      // };
      attributeValueConnection = data;
    }

    if (desktopImage || mobileImage) {
      const fileError = await fileValidationError(req.files, "Image", true);
      if (fileError.status === false)
        return res
          .status(400)
          .json({ isSuccess: false, message: fileError.message });
    }

    if (desktopImage)
      desktopImagePath = await convertFilePathSlashes(desktopImage[0].path);
    if (mobileImage)
      mobileImagePath = await convertFilePathSlashes(mobileImage[0].path);

    const result = await prisma.catalogue.update({
      where: { id },
      data: {
        name,
        cat_code,
        // category_id,
        no_of_product,
        price,
        catalogue_discount,
        average_price,
        retail_discount,
        stitching,
        size,
        weight,
        meta_title,
        meta_keyword,
        meta_description,
        description,
        CatalogueCategory: {
          deleteMany: {},
          create: categoryConnection, // connect category to the catalogue
        },
        ...(attributes && attributes.length > 0
          ? {
            attributeValues: {
              deleteMany: {},
              create: attributeValueConnection,
            },
          }
          : { attributeValues: { deleteMany: {} } }),
        tag,
        isActive,
        ...(desktopImage && { desktopImage: desktopImagePath }),
        ...(mobileImage && { mobileImage: mobileImagePath }),
      },
    });

    if (desktopImage) await deleteFile(existingCatalogue.desktopImage);
    if (mobileImage) await deleteFile(existingCatalogue.mobileImage);
    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue updated successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    return next(error);
  }
};

const deleteCatalogue = async (req, res, next) => {
  try {
    const id = req.params.id;

    // const product = await prisma.product.findMany({
    //   where: { catalogue_id: id },
    // });
    // if (product.length)
    //   return res
    //     .status(400)
    //     .json({ isSuccess: false, message: "Please remove products!" });

    const catalogueDelete = await prisma.catalogue.findUnique({
      where: {
        id: id,
        // deletedAt: { lte: cutoffTime },
        NOT: { deletedAt: null },
      },
      include: { Product: true },
    });

    if (!catalogueDelete)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Catalogue not found!" });

    const transaction = await prisma.$transaction(async (tx) => {
      // Get all products and their images associated with the catalog
      const products = await tx.product.findMany({
        where: { catalogue_id: id },
        select: { id: true, image: true }, // Assuming imagePath is the field for images
      });

      // Delete all products associated with the catalog
      await tx.product.deleteMany({ where: { catalogue_id: id } });

      // Delete associated images from the file system
      products.forEach(async (product) => {
        if (product.image) {
          await removeProductImage(product.image);
        }
      });

      // Delete the catalog
      await tx.catalogue.delete({ where: { id: id } });
      if (catalogueDelete.coverImage)
        await deleteFile(catalogueDelete.coverImage);
    });

    // return transaction;

    // const result = await deleteData("catalogue", id);
    // if (result.status === false)
    //   return res
    //     .status(400)
    //     .json({ isSuccess: result.status, message: result.message });

    // await deleteFile(result.data.coverImage);
    // await deleteFile(result.data.mobileImage);
    return res
      .status(200)
      .json({ isSuccess: true, message: "Catalogue deleted successfully." });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    return next(error);
  }
};

const updateCatalogueStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();

    const findproduct = await prisma.product.findMany({
      where: {
        catalogue_id: id,
      },
    });

    console.log("findproduct", findproduct);
    if (Array.isArray(findproduct) && findproduct?.length === 0) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Minimum 1 product is required" });
    }
    const result = await updateStatus("catalogue", id);
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
export {
  postCatalogue,
  paginationCatalogue,
  updateCatalogue,
  deleteCatalogue,
  updateCatalogueStatus,
};
