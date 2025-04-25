import fs from "fs";
import path from "path";
import prisma from "../db/config.js";
import slug from "slug";
import sharp from "sharp";
import passport from "passport";
import _ from "underscore";

const deleteFile = async (filePath) => {
  if (!filePath) return;
  filePath = "./" + filePath;
  if (fs.existsSync(filePath)) {
    await fs.unlinkSync(filePath);
    console.log(filePath);
  }
};





export const deleteFileReturn = async (filePath) => {
  if (!filePath) return false;

  filePath = "." + filePath;
  console.log(filePath);
  try {
    if (fs.existsSync(filePath)) {
      await fs.unlinkSync(filePath);
      return true
    }
  } catch (err) {
    console.log(err)
    return false;
  }
};

// const deleteFile = (filePath) => {
//   try {  
//     if (!filePath) return;
//     filePath = path.resolve(filePath);

//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//       console.log(`File deleted: ${filePath}`);
//     } else {
//       console.warn(`File not found: ${filePath}`);
//     }
//   } catch (error) {
//     console.error(`Error deleting file: ${error.message}`);
//   }
// };

const uniqueFilename = async (file) => {
  let uniqueName = "";
  if (file) {
    uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
  }
  return uniqueName;
};

const convertFilePathSlashes = (path) => {
  let filePath = path.replace(/\\/g, "/");
  return filePath;
};

const fileValidation = async (file, files = false) => {
  if (files === false) {
    const filepath = file.path;
    await deleteFile(filepath);
  } else {
    const fileValue = Object.values(file);
    await Promise.all(
      fileValue.map(async (i) => {
        i[0] ? await deleteFile(i[0].path) : await deleteFile(i.path);
      })
    );
  }
};

const fileValidationError = async (files, bannerType, isUpdate = false) => {
  if (isUpdate === false) {
    if (!files) return { status: false, message: "Desktop image is required!" };

    if (!files.desktopImage) {
      if (files.mobileImage) await deleteFile(files.mobileImage[0].path);
      return { status: false, message: "Desktop image is required!" };
    }
    // if (!files.mobileImage) {
    //   if (files.desktopImage) await deleteFile(files.desktopImage[0].path);
    //   return { status: false, message: "Mobile image is required!" };
    // }
  }

  const isValidFileType = (file, type) => file.mimetype.startsWith(type);

  if (bannerType === "Image") {
    if (
      (files?.desktopImage &&
        !isValidFileType(files.desktopImage[0], "image/")) ||
      (files?.mobileImage && !isValidFileType(files.mobileImage[0], "image/"))
    ) {
      await fileValidation(files, true);
      return {
        status: false,
        message:
          "Invalid file type. Both desktop and mobile files must be images.",
      };
    }
  } else if (bannerType === "Video") {
    if (
      (files?.desktopImage &&
        !isValidFileType(files.desktopImage[0], "video/")) ||
      (files?.mobileImage && !isValidFileType(files.mobileImage[0], "video/"))
    ) {
      await fileValidation(files, true);
      return {
        status: false,
        message:
          "Invalid file type. Both desktop and mobile files must be videos.",
      };
    }
  } else {
    await fileValidation(files, true);
    return {
      status: false,
      message: "Invalid bannerType. Only 'Image' or 'Video' are allowed.",
    };
  }

  return { status: true };
};

const multipleFileFilter = (req, res, next) => {
  const { desktopImg, mobileImg } = req.files || {};
  if (!desktopImg || !mobileImg) {
    return res.status(400).json({
      message: "Both desktopImg and mobileImg are required.",
    });
  }
  next();
};

const deleteUploadedFiles = async (files) => {
  try {
    if (!files) return;

    // Check if files is an object with named keys (e.g., desktopImg, mobileImg)
    if (typeof files === "object" && !Array.isArray(files)) {
      files = Object.values(files).flat(); // Flatten all file arrays into a single array
    }

    // If files is a single file object, wrap it in an array
    if (!Array.isArray(files)) {
      files = [files];
    }

    // Delete each file
    for (const file of files) {
      const filePath = `./${convertFilePathSlashes(file.path)}`;
      if (fs.existsSync(filePath)) {
        await fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error("Error deleting files:", error.message);
  }
};

const models = {
  attributeMaster: prisma.attributeMaster,
  attributeValue: prisma.attributeValue,
  homeBanner: prisma.homeBanner,
  pageWiseBanner: prisma.pageWiseBanner,
  testimonial: prisma.testimonial,
  cmsPage: prisma.cmsPage,
  socialMedia: prisma.socialMedia,
  currencyMaster: prisma.currencyMaster,
  category: prisma.categoryMaster,
  menu: prisma.menu,
  emailTemplate: prisma.emailTemplate,
  colour: prisma.colour,
  subMenuCollection: prisma.subMenuCollection,
  catalogue: prisma.catalogue,
  product: prisma.product,
  labels: prisma.labels,
  contactDetails: prisma.contactDetails,
  size: prisma.size,
  stitchingOption: prisma.stitchingOption,
  stitchingGroup: prisma.stitchingGroup,
  stitchingValue: prisma.stitchingValue,
  collection: prisma.collection,
  users: prisma.users,
  shippingCharges: prisma.shippingCharges,
  collectionAll: prisma.collectionAll,
  paymentMethods: prisma.paymentMethods,
  shippingMethod: prisma.shippingMethod,
  shippingZone: prisma.shippingZone,
  shippingZoneAddRate: prisma.shippingZoneAddRate
};

const updatePosition = async (model, data) => {
  try {
    const ids = data.map((value) => value.id);
    const existingData = await models[model].findMany({
      where: { id: { in: ids } },
    });

    if (existingData.length !== ids.length)
      return { status: false, message: `${model} data not found!` };

    const updatePromises = data.map(async ({ id, position }) => {
      const document = await models[model].updateMany({
        where: { id },
        data: { position },
      });

      const updateResults = await Promise.all(updatePromises);

      if (!document)
        return {
          status: false,
          message: "Something went wrong, please try again!",
        };
    });

    return { status: true };
  } catch (err) {
    console.log(err);
  }
};

const updateStatus = async (model, id) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return { status: false, message: "Invalid ID format!" };
    }

    const findData = await models[model].findUnique({ where: { id: id } });
    if (!findData) return { status: false, message: `${model} not found!` };

    const newStatus = !findData.isActive;
    const result = await models[model].update({
      where: { id: id },
      data: { isActive: newStatus },
    });
    return {
      status: true,
      message: `${model} status updated successfully.`,
      data: result,
    };
  } catch (err) {
    console.log(err);
    return { status: false };
  }
};

const deleteData = async (model, id) => {
  try {
    // const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return { status: false, message: "Invalid ID format!" };
    }
    const uniquedata = await models[model].findUnique({
      where: { id: id },
    });

    if (!uniquedata) {
      return { status: false, message: `${model} not found!` };
    }
    const result = await models[model].delete({
      where: { id: id },
    });

    return {
      status: true,
      message: `${model} deleted successfully.`,
      data: result,
    };
  } catch (err) {
    console.log(err);
    return { status: false };
  }
};

const removeProductImage = async (imagePaths) => {
  try {
    await imagePaths.map(async (value) => {
      console.log(value);
      const product = await prisma.product.findMany({
        where: { image: { has: value } },
      });
      if (product.length === 0) await deleteFile(`${value}`);
    });
  } catch (err) {
    console.log(err);
  }
};

const handleProductConnection = async (model, ids, image) => {
  if (ids && Array.isArray(ids)) {
    if (!ids.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
      if (image) await removeProductImage(image);
      return { status: false, message: `Invalid ${model} ID format!` };
    }

    const existingData = await models[model].findMany({
      where: { id: { in: ids } },
    });
    if (existingData.length !== ids.length) {
      if (image) await removeProductImage(image);
      return {
        status: false,
        message: `Some ${model} IDs do not exist.`,
      };
    }
    return {
      status: true,
      message: "",
    };
  }
};

const handleLabelConnection = async (labelsData, model, image) => {
  console.log(model);
  if (labelsData && Array.isArray(labelsData)) {
    if (!labelsData.every((label) => /^[a-fA-F0-9]{24}$/.test(label.id))) {
      await removeProductImage(image);
      return { status: false, message: `Invalid ID format in ${model}!` };
    }

    const existingData = await models[model].findMany({
      where: { id: { in: labelsData.map((label) => label.id) } },
    });

    if (existingData.length !== labelsData.length) {
      await removeProductImage(image);
      return {
        status: false,
        message: `Some IDs do not exist in ${model}.`,
      };
    }

    return {
      status: true,
      message: "",
    };
  }
  await removeProductImage(image);
  return {
    status: false,
    message: `Invalid labels data provided for ${model}!`,
  };
};

const handleCatalogueConnection = async (labelsData, model, image) => {
  console.log(model);
  if (labelsData && Array.isArray(labelsData)) {
    if (!labelsData.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
      if (image) await deleteFile(image);
      return { status: false, message: `Invalid ID format in ${model}!` };
    }

    const existingData = await models[model].findMany({
      where: { id: { in: labelsData.map((id) => id) } },
    });

    if (existingData.length !== labelsData.length) {
      if (image) await deleteFile(image);
      return {
        status: false,
        message: `Some IDs do not exist in ${model}.`,
      };
    }

    return {
      status: true,
      message: "",
    };
  }
  if (image) await deleteFile(image);
  return {
    status: false,
    message: `Invalid data provided for ${model}!`,
  };
};

const removeProductAndCatalogueImage = async (
  imagePaths,
  catImages,
  productImage
) => {
  await removeProductImage(imagePaths);
  if (catImages) await deleteFile(catImages);
  if (productImage) await removeProductImage(productImage);
  // product = [];
  // catalogueMeta = null;
};
const handleProductAttributeConnection = async (attributes, image) => {
  let attribute = [];
  for (const attr of attributes) {
    const { attribute_id, attributeValue } = attr;
    if (!/^[a-fA-F0-9]{24}$/.test(attribute_id)) {
      await removeProductImage(image);
      return {
        status: false,
        message: "Invalid Attribute ID format!",
        data: "",
      };
    }

    const existingData = await prisma.attributeMaster.findUnique({
      where: { id: attribute_id },
    });
    if (!existingData) {
      await removeProductImage(image);
      return {
        status: false,
        message: `Attribute ID ${attribute_id} does not exist.`,
      };
    }
    if (attributeValue && attributeValue.length > 0) {
      // const invalidFormat = !attributeValue.every((id) =>
      //   /^[a-fA-F0-9]{24}$/.test(id)
      // );

      // const attributes = attributeValue.filter(
      //   (id) => !/^[a-fA-F0-9]{24}$/.test(id)
      // );

      // if (attributes.length > 0) {
      //   let attributesData = [];
      //   const data = attribute.map((val) => {
      //     attributesData.push({
      //       attr_id: attribute_id,
      //       value: val,
      //     });
      //   });
      //   const attribute = Promise.all(data);
      //   const attributeData = await prisma.attributeValue.createMany({
      //     data: attributesData,
      //     select: {
      //       id: true,
      //       attr_id: true,
      //     },
      //   });

      //   if (!attributeData) {
      //     await removeProductImage(image);
      //     return { status: false, message: `Attribute not Create` };
      //   }
      // }

      // if (invalidFormat) {
      //   await removeProductImage(image);
      //   return { status: false, message: `Invalid Attribute value ID format!` };
      // }

      let newValues = [];
      let existingIds = [];

      for (const val of attributeValue) {
        if (/^[a-fA-F0-9]{24}$/.test(val.id)) {
          existingIds.push({ id: val.id, value: val.value });
        } else {
          newValues.push({ id: val.id, value: val.value });
        }
      }

      if (newValues.length > 0) {
        const createdValues = await prisma.attributeValue.createMany({
          data: newValues.map((val) => ({
            attr_id: attribute_id,
            name: val.id,
            value: slug(val.id),
          })),
        });

        const newAttributeValues = await prisma.attributeValue.findMany({
          where: {
            name: { in: newValues.map((val) => val.id) },
            attr_id: attribute_id,
          },
          select: { id: true },
        });

        existingIds.push(...newAttributeValues.map((item) => item));
      }

      const existingAttributeValue = await prisma.attributeValue.findMany({
        where: { id: { in: existingIds.map((item) => item.id) } },
      });

      if (existingAttributeValue.length !== existingIds.length) {
        await removeProductImage(image);
        return {
          status: false,
          message: `Some Attribute values IDs do not exist.`,
        };
      }
      existingIds.forEach((val) => {
        attribute.push({
          attribute_id,
          attributeValue_id: val.id,
          ...(val.value && val.value !== "" && { value: val.value }),
        });
      });
    }
    // else if (value && value !== "") {
    //   attribute.push({
    //     attribute_id,
    //     value: value,
    //   });
    // }
  }
  return { status: true, message: "", data: attribute };
};

const handleCatalogueAttributeConnection = async (attributes, image) => {
  let attribute = [];
  for (const attr of attributes) {
    const { attribute_id, attributeValue } = attr;
    if (!/^[a-fA-F0-9]{24}$/.test(attribute_id)) {
      if (image) await deleteFile(image);
      return {
        status: false,
        message: "Invalid Attribute ID format!",
        data: "",
      };
    }

    const existingData = await prisma.attributeMaster.findUnique({
      where: { id: attribute_id },
    });
    if (!existingData) {
      if (image) await deleteFile(image);
      return {
        status: false,
        message: `Attribute ID ${attribute_id} does not exist.`,
      };
    }
    if (attributeValue && attributeValue.length > 0) {
      // const invalidFormat = !attributeValue.every((id) =>
      //   /^[a-fA-F0-9]{24}$/.test(id)
      // );

      // const attributes = attributeValue.filter(
      //   (id) => !/^[a-fA-F0-9]{24}$/.test(id)
      // );

      // if (attributes.length > 0) {
      //   let attributesData = [];
      //   const data = attribute.map((val) => {
      //     attributesData.push({
      //       attr_id: attribute_id,
      //       value: val,
      //     });
      //   });
      //   const attribute = Promise.all(data);
      //   const attributeData = await prisma.attributeValue.createMany({
      //     data: attributesData,
      //     select: {
      //       id: true,
      //       attr_id: true,
      //     },
      //   });

      //   if (!attributeData) {
      //     await removeProductImage(image);
      //     return { status: false, message: `Attribute not Create` };
      //   }
      // }

      // if (invalidFormat) {
      //   await removeProductImage(image);
      //   return { status: false, message: `Invalid Attribute value ID format!` };
      // }

      let newValues = [];
      let existingIds = [];

      for (const val of attributeValue) {
        if (/^[a-fA-F0-9]{24}$/.test(val.id)) {
          existingIds.push({ id: val.id, value: val.value });
        } else {
          newValues.push({ id: val.id, value: val.value });
        }
      }

      if (newValues.length > 0) {
        const createdValues = await prisma.attributeValue.createMany({
          data: newValues.map((val) => ({
            attr_id: attribute_id,
            value: val.id,
          })),
        });

        const newAttributeValues = await prisma.attributeValue.findMany({
          where: {
            value: { in: newValues.map((val) => val.id) },
            attr_id: attribute_id,
          },
          select: { id: true },
        });

        existingIds.push(...newAttributeValues.map((item) => item));
      }

      const existingAttributeValue = await prisma.attributeValue.findMany({
        where: { id: { in: existingIds.map((val) => val.id) } },
      });

      if (existingAttributeValue.length !== existingIds.length) {
        if (image) await deleteFile(image);
        return {
          status: false,
          message: `Some Attribute values IDs do not exist.`,
        };
      }
      existingIds.forEach((val) => {
        attribute.push({
          attribute_id,
          attributeValue_id: val.id,
          ...(val.value && val.value !== "" && { value: val.value }),
        });
      });
    }
    // else if (value && value !== "") {
    //   attribute.push({
    //     attribute_id,
    //     value: value,
    //   });
    // }
  }
  return { status: true, message: "", data: attribute };
};

const isNameRecordsExist = async (names, model) => {
  if (!names || names.length === 0)
    return { exists: false, missingNames: names };

  let totalNames = names.length;
  if (totalNames == 0) return false;

  let totalDocuments = 0;
  try {
    totalDocuments = await models[model].count({
      where: { name: { in: names } },
    });

    let data = await models[model].findMany({
      where: { name: { in: names } },
      select: { id: true, name: true },
    });

    const existingNames = data.map((val) => val.name);
    let existingIds = [];

    const missingNames = names.filter(
      (value) => !existingNames.includes(value)
    );
    if (missingNames.length === 0) existingIds = data.map((val) => val.id);

    return {
      exists: totalDocuments === names.length,
      missingNames,
      existingIds,
    };
  } catch (err) {
    return err;
  }
};

const arraySplit = async (value) => {
  let string = value.split(",");
  const data = string.map((val) => {
    return val;
  });
  return data;
};

const getId = async (name, model) => {
  try {
    let data = await models[model].findMany({
      where: { name: { in: name } },
      select: { id: true },
    });
    const document = await data.map((val) => {
      return val.id;
    });
    return document;
  } catch (err) {
    return err;
  }
};

const deleteImage = async (model, id) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return { staus: false, message: "Invalid ID format!" };
    }

    const data = await models[model].findUnique({
      where: { id: id },
    });

    if (!data) return { status: false, message: `${model} not found!` };

    if (data.image === "") {
      return { status: false, message: "image not exists!" };
    }
    await deleteFile(uniqueProduct.image);

    const result = await models[model].update({
      where: { id: id },
      data: { image: "" },
    });
    return {
      status: true,
      message: `${model} image deleted successfully.`,
    };
  } catch (err) {
    console.log(err);
  }
};

const processProductImages = async (files) => {
  let productImages = [];

  for (const image of files) {
    const thumbImage = `uploads/product/thumb/${image.filename}`;
    const mediumImage = `uploads/product/medium/${image.filename}`;

    await sharp(image.path)
      .resize(200, 200, { fit: "inside" })
      .toFile(thumbImage);

    await sharp(image.path)
      .resize(300, 300, { fit: "inside" })
      .toFile(mediumImage);

    productImages.push({ thumbImage, mediumImage });
  }

  return productImages;
};

const uniqueImage = async (file, id = null) => {
  try {
    let filter = { image: { hasSome: file } };
    if (id) filter.id = { not: id };
    const uniqueData = await prisma.product.findMany({
      where: filter,
      select: { image: true },
    });

    if (uniqueData.length > 0) {
      const usedImages = uniqueData.flatMap((product) => product.image);
      const duplicateImages = file.filter((img) => usedImages.includes(img));
      const duplicateImageNames = duplicateImages.map((img) =>
        img.split("/").pop()
      );
      // await removeProductImage(file);
      return {
        isSuccess: false,
        message: `${duplicateImageNames.join(",")} Images Already Used.`,
      };
    }
    return { isSuccess: true };
  } catch (err) {
    console.log(err);
  }
};

const productsSku = async (sku) => {
  try {
    const skus = _.uniq(sku);
    const isProductExist = await prisma.product.findMany({
      where: {
        sku: { in: skus },
      },
      select: { id: true, sku: true },
    });

    if (isProductExist.length !== skus.length) {
      const productSkus = isProductExist.map((val) => val.sku);
      let productSku = skus.filter((sku) => !productSkus.includes(sku));
      return {
        status: false,
        message: `${productSku} Related product not found!`,
      };
    }

    let data = isProductExist.map((val) => val.id);
    return { status: true, data };
  } catch (err) {
    console.log(err);
  }
};
const tokenExists = async (req, res, next) => {
  const isTokenExists = await new Promise((resolve, reject) => {
    passport.authenticate("jwt", { session: false }, (err, user, info) => {
      if (err) {
        reject({
          isSuccess: false,
          message: "Something went wrong, please try again!",
          error: err,
        });
      }
      resolve(user ? true : false);
    })(req, res, next);
  });

  return isTokenExists;
};

const cataloguesProductFields = [
  "category",
  // "collection",
  "productCode",
  "catCode",
  "productName",
  "noOfProduct",
  "quantity",
  "description",
  "catalogueItemMarketPrice",
  "catalogueItemDiscount",
  "retailPrice",
  "retailDiscount",
  "GST",
  "metaTitle",
  "metaKeyword",
  "metaDescription",
  "weight",
  "tag",
  "cat_image",
  "image",
  "optionType",
  "size",
  // "isStitching",
  // "isSize",
  "isActive",
  "showInSingle",
  // "cat_weight",
  // "cat_quantity",
  // "cat_gst",
  // "cat_meta_title",
  // "cat_meta_keyword",
  // "cat_meta_description",
  // "cat_description",
  // "cat_tag",
  // "cat_coverImage",
  // "cat_isStitching",
  // "cat_isSize",
  // "cat_isActive",
  // "productName",
  // "product_sku",
  // "product_quantity",
  // "product_weight",
  // "product_retail_price",
  // "product_retail_GST",
  // "product_retail_discount",
  // "product_offer_price",
  // "product_description",
  // "product_tags",
  // "product_showInSingle",
  // "product_readyToShip",
  // "product_image",
  // "product_isActive",
  // "product_stitching",
];

export {
  deleteFile,
  uniqueFilename,
  convertFilePathSlashes,
  fileValidation,
  fileValidationError,
  multipleFileFilter,
  deleteUploadedFiles,
  updatePosition,
  updateStatus,
  deleteData,
  removeProductImage,
  handleProductConnection,
  removeProductAndCatalogueImage,
  handleProductAttributeConnection,
  handleCatalogueAttributeConnection,
  isNameRecordsExist,
  arraySplit,
  getId,
  deleteImage,
  handleLabelConnection,
  handleCatalogueConnection,
  cataloguesProductFields,
  processProductImages,
  uniqueImage,
  productsSku,
  tokenExists,
};
