import slug from "slug";
import prisma from "../../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  fileValidation,
  fileValidationError,
  handleCatalogueAttributeConnection,
  handleCatalogueConnection,
  handleLabelConnection,
  handleProductAttributeConnection,
  handleProductConnection,
  productsSku,
  removeProductImage,
  uniqueImage,
} from "../../../helper/common.js";
import { catalogueSchema, productSchema } from "../../../schema/joi_schema.js";
import createSearchFilter from "../../../helper/searchFilter.js";
import sharp from "sharp";
const postCatlogProduct = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    const imagePaths = await Promise.all(
      req.files.map(async (file) => convertFilePathSlashes(file?.path))
    );

    let {
      name,
      catalogue_id,
      sku,
      url,
      quantity,
      weight,
      // price,
      average_price,
      retail_price,
      retail_GST,
      retail_discount,
      // offer_price,
      // discount,
      offer_price,
      description,
      label,
      tag,
      showInSingle,
      category_id,
      collection_id,
      attributes,
      colour_id,
      productlabels,
      optionType,
      size,
      isSize,
      stitching,
      readyToShip,
      relatedProduct,
    } = req.body;

    quantity = parseInt(quantity);
    weight = parseFloat(weight);

    attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
    req.body.attributes = attributes;

    productlabels = productlabels?.map((jsonString) => JSON.parse(jsonString));
    req.body.productlabels = productlabels;

    size = size?.map((jsonString) => JSON.parse(jsonString));
    req.body.size = size;

    const schema = await productSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }

    showInSingle = showInSingle == "true" ? true : false;
    const findUniqueData = await prisma.product.findFirst({
      where: {
        sku: sku,
        // OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
      },
      select: {
        id: true,
        catalogue: { select: { cat_code: true, deletedAt: true } },
      },
    });

    const { isSuccess, message } = await uniqueImage(imagePaths);
    if (!isSuccess) {
      await removeProductImage(imagePaths);
      return res.status(400).json({ isSuccess, message });
    }

    if (findUniqueData && findUniqueData?.catalogue?.deletedAt !== null) {
      await removeProductImage(imagePaths);
      return res.status(409).json({
        isSuccess: false,
        message: `The product with SKU ${sku} matches a deleted ${findUniqueData?.catalogue?.cat_code} catalog item. Please update the SKU or restore the catalog entry.`,
      });
    }
    if (findUniqueData || findUniqueData?.catalogue?.deletedAt === null) {
      await removeProductImage(imagePaths);
      return res
        .status(409)
        .json({ isSuccess: false, message: "Code Already Used" });
    }
    catalogue_id = null;
    if (catalogue_id) {
      const findCatalogue = await prisma.catalogue.findUnique({
        where: { id: catalogue_id },
      });

      if (!findCatalogue) {
        await removeProductImage(imagePaths);
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found!" });
      }
    }

    // const finalOfferPrice = offer_price
    //   ? parseFloat(offer_price)
    //   : parseFloat(price) * (1 - parseFloat(discount) / 100);

    let finalOfferPrice = 0;
    if (showInSingle === true) {
      if (retail_price > 0 && retail_discount > 0) {
        finalOfferPrice = offer_price
          ? parseFloat(offer_price)
          : parseFloat(retail_price) * (1 - parseFloat(retail_discount) / 100);
      } else {
        finalOfferPrice = offer_price ? parseFloat(offer_price) : retail_price;
      }
    }
    const productImages = [];

    for (const images of req.files) {
      const thumbImage = `uploads/product/thumb/${images.filename}`;
      const mediumImage = `uploads/product/medium/${images.filename}`;

      await sharp(images.path)
        .resize(200, 200, { fit: "inside" })
        .toFile(thumbImage);

      await sharp(images.path)
        .resize(300, 300, { fit: "inside" })
        .toFile(mediumImage);

      productImages.push({
        thumbImage,
        mediumImage,
      });
    }
    url = `${slug(name)}-${sku}`;
    let products = [];
    const productData = {
      name,
      catalogue_id: catalogue_id,
      sku,
      url,
      quantity,
      weight,
      // price: parseFloat(price),
      average_price: parseFloat(average_price),
      retail_price: parseFloat(retail_price),
      retail_GST: parseFloat(retail_GST),
      retail_discount: parseFloat(retail_discount),
      offer_price: finalOfferPrice,
      // discount: parseFloat(discount),
      description,
      label,
      tag,
      showInSingle,
      readyToShip,
      image: imagePaths,
      thumbImage: productImages.map((imageData) => imageData.thumbImage),
      mediumImage: productImages.map((imageData) => imageData.mediumImage),
      isActive: false,
      isDraft: catalogue_id ? false : true,
      optionType,
      // stitching: stitching,
      // size: isSize,
    };

    let categoryConnection = [];
    if (category_id) {
      const { status, message } = await handleProductConnection(
        "category",
        category_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      categoryConnection = category_id.map((catId) => ({
        category: { connect: { id: catId } },
      }));
      productData["categories"] = {
        create: categoryConnection,
      };
    }
    if (collection_id && collection_id.length > 0) {
      const { status, message } = await handleProductConnection(
        "collection",
        collection_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
    }
    if (attributes && attributes.length > 0) {
      const { status, message, data } = await handleProductAttributeConnection(
        attributes,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      productData["attributeValues"] = {
        create: data,
      };
    }

    if (relatedProduct && relatedProduct.length > 0) {
      const { status, message, data } = await productsSku(relatedProduct);
      if (!status) {
        await removeProductImage(imagePaths);
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }

      // productData["RelatedProducts"] = {
      //   create: data.map((productId) => ({
      //     related: { connect: { id: productId } },
      //   })),
      // };
      relatedProduct = data;
    }
    let colourConnection = [];
    if (colour_id) {
      const { status, message } = await handleProductConnection(
        "colour",
        colour_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      colourConnection = colour_id.map((colourId) => ({
        colour: { connect: { id: colourId } },
      }));
      productData["colours"] = {
        create: colourConnection,
      };
    }

    let productLabelConnection = [];
    if (productlabels) {
      const { status, message } = await handleLabelConnection(
        productlabels,
        "labels",
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      productLabelConnection = productlabels.map((label) => ({
        label: { connect: { id: label.id } },
        expiryTime: new Date(label.date) || null,
      }));
      productData["labels"] = {
        create: productLabelConnection,
      };
    }
    let productSizeConnection = [];
    if (optionType === "Size" && size.length > 0) {
      let sizes = size.map((value) => value.quantity);
      let totalSize = sizes.reduce((acc, currentValue) => acc + currentValue);
      if (totalSize !== quantity) {
        await removeProductImage(imagePaths);
        return res
          .status(400)
          .json({ isSuccess: false, message: "Product quantity not matched!" });
      }
      const { status, message } = await handleLabelConnection(
        size,
        "size",
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      productSizeConnection = size.map((size) => ({
        size: { connect: { id: size.id } },
        price: parseInt(size.price),
        quantity: parseInt(size.quantity),
      }));

      productData["sizes"] = {
        create: productSizeConnection,
      };
    }
    products = [...products, productData];

    //  console.log("Product==========>",products)

    if (products) {
      const updatedata = products[0];
      // console.log("updatedata",updatedata);
      // return
      const data = await prisma.product.create({
        data: updatedata,
        select: {
          id: true,
        },
      });
      if (data) {
        if (collection_id && collection_id.length > 0) {
          await prisma.catalogueCollection.createMany({
            data: collection_id.map((collectionId) => ({
              catalogue_id: null,
              collection_id: collectionId,
              product_id: data.id,
            })),
          });
        }
        if (relatedProduct && relatedProduct.length > 0) {
          await prisma.relatedProduct.createMany({
            data: relatedProduct.map((id) => ({
              product_id: data.id,
              relatedProduct_id: id,
              // product: { connect: { id: data.id } },
              // related: { connect: { id: id } },
            })),
          });
        }
      }

      if (data) {
        return res.status(200).json({
          isSuccess: true,
          message: "Product create successfully.",
          data: data,
        });
      }
    }
    let err = new Error("Something went wrong, please try again!");
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

//   const postCatlogProduct = async (req, res, next) => {
//     let createdProduct = null;
//     try {
//       if (!req.files || req.files.length === 0) {
//         return res.status(400).json({ error: "At least 1 image is required." });
//       }

//       const imagePaths = await Promise.all(
//         req.files.map(async (file) => convertFilePathSlashes(file?.path))
//       );

//       let {
//         name,
//         catalogue_id,
//         sku,
//         url,
//         quantity,
//         weight,
//         price,
//         discount,
//         offer_price,
//         description,
//         label,
//         tag,
//         showInSingle,
//         category_id,
//         attributes,
//         colour_id,
//         readyToShip,
//       } = req.body;

//       attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
//       req.body.attributes = attributes;

//       const schema = await productSchema();
//       const { error } = schema.validate(req.body);
//       if (error) {
//         await removeProductImage(imagePaths);
//         return res
//           .status(400)
//           .json({ isSuccess: false, message: error?.details[0].message });
//       }

//       showInSingle = showInSingle === "true";

//       const findUniqueData = await prisma.product.findUnique({
//         where: { sku },
//       });

//       if (findUniqueData) {
//         await removeProductImage(imagePaths);
//         return res
//           .status(409)
//           .json({ isSuccess: false, message: "SKU Already Used" });
//       }

//       catalogue_id = catalogue_id || null;

//       if (catalogue_id) {
//         const findCatalogue = await prisma.catalogue.findUnique({
//           where: { id: catalogue_id },
//         });

//         if (!findCatalogue) {
//           await removeProductImage(imagePaths);
//           return res
//             .status(404)
//             .json({ isSuccess: false, message: "Catalogue not found!" });
//         }
//       }

//       const finalOfferPrice = offer_price
//         ? parseFloat(offer_price)
//         : parseFloat(price) * (1 - parseFloat(discount) / 100);

//       url = `${slug(name)}-${sku}`;
//       const productData = {
//         name,
//         catalogue_id,
//         sku,
//         url,
//         quantity,
//         weight,
//         price: parseFloat(price),
//         discount: parseFloat(discount),
//         offer_price: finalOfferPrice,
//         description,
//         label,
//         tag,
//         showInSingle,
//         readyToShip,
//         image: imagePaths,
//       };

//       await prisma.$transaction(async (transaction) => {
//         createdProduct = await transaction.product.create({
//           data: productData,
//         });

//         if (category_id) {
//           const { status, message } = await handleProductConnection(
//             "category",
//             category_id,
//             imagePaths
//           );
//           if (!status) throw new Error(message);

//           const categoryConnection = category_id.map((catId) => ({
//             category: { connect: { id: catId } },
//           }));

//           await transaction.product.update({
//             where: { id: createdProduct.id },
//             data: { categories: { create: categoryConnection } },
//           });
//         }

//         if (attributes && attributes.length > 0) {
//           const { status, message, data } = await handleProductAttributeConnection(
//             attributes,
//             imagePaths
//           );
//           if (!status) throw new Error(message);

//           await transaction.product.update({
//             where: { id: createdProduct.id },
//             data: { attributeValues: { create: data } },
//           });
//         }

//         if (colour_id) {
//           const { status, message } = await handleProductConnection(
//             "colour",
//             colour_id,
//             imagePaths
//           );
//           if (!status) throw new Error(message);

//           const colourConnection = colour_id.map((colourId) => ({
//             colour: { connect: { id: colourId } },
//           }));

//           await transaction.product.update({
//             where: { id: createdProduct.id },
//             data: { colours: { create: colourConnection } },
//           });
//         }
//       });

//       return res.status(200).json({
//         isSuccess: true,
//         message: "Product created successfully.",
//         data: createdProduct,
//       });
//     } catch (error) {
//         console.log(error)
//         if (createdProduct) {
//         await prisma.product.delete({
//           where: { id: createdProduct.id },
//         });
//       }

//       await removeProductImage(imagePaths);
//       return res.status(500).json({
//         isSuccess: false,
//         message: "Something went wrong. Please try again!",
//       });
//     }
//   };

const updateCatalogueProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    const imagePaths =
      req.files &&
      req.files?.length > 0 &&
      (await Promise.all(
        req.files.map(async (file) => convertFilePathSlashes(file?.path))
      ));

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      if (req.files && req.files?.length > 0)
        await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    let {
      name,
      catalogue_id,
      sku,
      url,
      quantity,
      weight,
      average_price,
      retail_price,
      retail_GST,
      retail_discount,
      offer_price,
      description,
      label,
      tag,
      showInSingle,
      readyToShip,
      category_id,
      collection_id,
      attributes,
      colour_id,
      productlabels,
      size,
      images,
      meta_title,
      meta_keyword,
      meta_description,
      optionType,
      relatedProduct,
      // stitching,
      // isSize,
    } = req.body;

    // stitching = stitching === "true" ? true : false;
    // isSize = isSize === "true" ? true : false;
    quantity = parseInt(quantity);
    weight = parseFloat(weight);
    retail_price = parseFloat(retail_price);
    if (typeof images === "string") {
      req.body.images = [images];
    } else {
      req.body.images = images;
    }

    attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
    req.body.attributes = attributes;

    productlabels = productlabels?.map((jsonString) => JSON.parse(jsonString));
    req.body.productlabels = productlabels;

    size = size?.map((jsonString) => JSON.parse(jsonString));
    req.body.size = size;

    const schema = await productSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      if (req.files && req.files?.length > 0)
        await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }

    showInSingle = showInSingle == "true" ? true : false;

    if (req.files && req.files?.length > 0) {
      const { isSuccess, message } = await uniqueImage(imagePaths, id);
      if (!isSuccess) {
        await removeProductImage(imagePaths);
        return res.status(400).json({ isSuccess, message });
      }
    }

    const [findUniqueData, findData] = await prisma.$transaction([
      prisma.product.findFirst({
        where: {
          sku: sku,
          id: { not: id },
          // OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
        },
        select: {
          id: true,
          catalogue: { select: { cat_code: true, deletedAt: true } },
        },
      }),
      prisma.product.findUnique({ where: { id: id } }),
    ]);

    if (!findData) {
      if (req.files && req.files?.length > 0) removeProductImage(imagePaths);
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });
    }
    if (findUniqueData && findUniqueData?.catalogue?.deletedAt !== null) {
      if (req.files && req.files?.length > 0)
        await removeProductImage(imagePaths);
      return res.status(400).json({
        isSuccess: false,
        message: `The product with SKU ${sku} matches a deleted  ${findUniqueData.catalogue.cat_code} catalog item. Please update the SKU or restore the catalog entry.`,
      });
    }

    if (findUniqueData) {
      if (req.files && req.files?.length > 0)
        await removeProductImage(imagePaths);
      return res.status(400).json({
        isSuccess: false,
        message: `SKU ${sku} Already Used`,
      });
    }

    if (findData.image.length === 0 && req.files.length === 0)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload image!" });

    catalogue_id = catalogue_id || null;

    // console.log("catalogue_id", catalogue_id);
    if (catalogue_id != null || catalogue_id) {
      const findCatalogue = await prisma.catalogue.findUnique({
        where: { id: catalogue_id },
      });

      if (!findCatalogue) {
        if (req.files && req.files.length > 0)
          await removeProductImage(imagePaths);
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found!" });
      }

      if (findCatalogue.optionType !== optionType) {
        if (req.files && req.files.length > 0)
          await removeProductImage(imagePaths);
        return res.status(400).json({
          isSuccess: false,
          message: `You don't change ${optionType} option`,
        });
      }

      // if (isSize && findCatalogue.size !== isSize) {
      //   if (req.files & (req.files.length > 0))
      //     await removeProductImage(imagePaths);
      //   return res
      //     .status(400)
      //     .json({ isSuccess: false, message: "You don't change size option" });
      // }
    } else {
      catalogue_id = null;
    }

    let finalOfferPrice = 0;
    if (showInSingle === true) {
      if (retail_price > 0 && retail_discount > 0) {
        finalOfferPrice = offer_price
          ? parseFloat(offer_price)
          : parseFloat(retail_price) * (1 - parseFloat(retail_discount) / 100);
      } else {
        finalOfferPrice = offer_price ? parseFloat(offer_price) : retail_price;
      }
    }

    url = `${slug(name)}-${sku}`;

    const processedImages = imagePaths
      ? [...imagePaths, ...(findData?.image || [])]
      : typeof images === "string"
      ? [images]
      : images;
    let productImages = [];
    if (req.files) {
      for (const images of req.files) {
        // const originalImage = req.files.image[i];
        const thumbImage = `uploads/product/thumb/${images.filename}`;
        const mediumImage = `uploads/product/medium/${images.filename}`;

        await sharp(images.path)
          .resize(200, 200, { fit: "inside" })
          .toFile(thumbImage);

        await sharp(images.path)
          .resize(300, 300, { fit: "inside" })
          .toFile(mediumImage);

        productImages.push({
          thumbImage,
          mediumImage,
        });
      }
    }

    const processedThumbs =
      imagePaths && productImages.length > 0
        ? [
            ...productImages.map((img) => img.thumbImage),
            ...(findData?.thumbImage || []),
          ]
        : [];
    const processedMediums =
      imagePaths && processedImages.length > 0
        ? [
            ...productImages.map((img) => img.mediumImage),
            ...(findData?.mediumImage || []),
          ]
        : [];
    const productData = {
      name,
      catalogue_id: catalogue_id,
      sku,
      url,
      quantity,
      weight,
      average_price: parseFloat(average_price),
      retail_price: parseFloat(retail_price),
      retail_GST: parseFloat(retail_GST),
      retail_discount: parseFloat(retail_discount),
      offer_price: finalOfferPrice,
      description,
      label,
      tag,
      showInSingle,
      readyToShip,
      image: processedImages,
      ...(processedThumbs.length > 0 && { thumbImage: processedThumbs }),
      ...(processedMediums.length > 0 && { mediumImage: processedMediums }),
      // isActive: false,
      meta_title,
      meta_keyword,
      meta_description,
      optionType,
      // stitching: stitching,
      // isSize: isSize,
    };
    let categoryId = [];
    if (category_id) {
      const { status, message } = await handleProductConnection(
        "category",
        category_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      categoryId = category_id.map((catId) => ({
        category: { connect: { id: catId } },
      }));
      productData["categories"] = {
        deleteMany: {},
        create: categoryId,
      };
    } else {
      productData["categories"] = {
        deleteMany: {},
      };
    }

    if (collection_id && collection_id.length > 0) {
      const { status, message } = await handleProductConnection(
        "collection",
        collection_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
    }

    let attributeValueConnection = [];
    if (attributes && attributes.length > 0) {
      const { status, message, data } = await handleProductAttributeConnection(
        attributes,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      attributeValueConnection = attributes.map((attrVal) => ({
        attributeValue: { connect: { id: attrVal } },
      }));
      productData["attributeValues"] = {
        deleteMany: {},
        create: data,
      };
    } else if (attributes && attributes.length === 0) {
      productData["attributeValues"] = {
        deleteMany: {},
      };
    }

    if (relatedProduct && relatedProduct.length > 0) {
      const { status, message, data } = await productsSku(relatedProduct);
      if (!status) {
        if (req.files && req.files?.length > 0)
          await removeProductImage(imagePaths);
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }

      // productData["RelatedProducts"] = {
      //   create: data.map((productId) => ({
      //     related: { connect: { id: productId } },
      //   })),
      // };
      relatedProduct = data;
    }
    // else if (relatedProduct && relatedProduct.length === 0) {
    //   productData["RelatedProducts"] = {
    //     deleteMany: {},
    //   };
    // }
    let colourConnection = [];
    if (colour_id) {
      const { status, message } = await handleProductConnection(
        "colour",
        colour_id,
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      colourConnection = colour_id.map((colourId) => ({
        colour: { connect: { id: colourId } },
      }));
      productData["colours"] = {
        deleteMany: {},
        create: colourConnection,
      };
    } else {
      productData["colours"] = {
        deleteMany: {},
      };
    }

    let productLabelConnection = [];
    if (productlabels) {
      const { status, message } = await handleLabelConnection(
        productlabels,
        "labels",
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      productLabelConnection = productlabels.map((label) => ({
        label: { connect: { id: label.id } },
        expiryTime: label.date ? new Date(label.date) : null,
      }));
      productData["labels"] = {
        deleteMany: {},
        create: productLabelConnection,
      };
    } else if (productlabels?.length === 0) {
      productData["labels"] = {
        deleteMany: {},
      };
    }

    let productSizeConnection = [];
    if (optionType === "Size" && size.length > 0) {
      let sizes = size.map((value) => value.quantity);
      let totalSize = sizes.reduce((acc, currentValue) => acc + currentValue);
      if (totalSize !== quantity) {
        if (req.files && req.files.length > 0)
          await removeProductImage(imagePaths);
        return res
          .status(400)
          .json({ isSuccess: false, message: "Product quantity not matched!" });
      }
      const { status, message } = await handleLabelConnection(
        size,
        "size",
        imagePaths
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      productSizeConnection = size.map((size) => ({
        size: { connect: { id: size.id } },
        price: parseInt(size.price),
        quantity: parseInt(size.quantity),
      }));
      productData["sizes"] = {
        deleteMany: {},
        create: productSizeConnection,
      };
    } else if (optionType !== "Size" && size?.length === 0) {
      productData["sizes"] = {
        deleteMany: {},
      };
    }

    const newProduct = await prisma.product.update({
      where: {
        id: id,
      },
      data: productData,
      select: { id: true },
    });
    if (newProduct) {
      await prisma.catalogueCollection.deleteMany({
        where: { product_id: newProduct.id },
      });
      if (collection_id && collection_id.length > 0) {
        await prisma.catalogueCollection.createMany({
          data: collection_id.map((collectionId) => ({
            catalogue_id: null,
            collection_id: collectionId,
            product_id: newProduct.id,
          })),
        });
      }
      await prisma.relatedProduct.deleteMany({
        where: { product_id: newProduct.id },
      });
      if (relatedProduct && relatedProduct.length > 0) {
        await prisma.relatedProduct.createMany({
          data: relatedProduct.map((id) => ({
            product_id: newProduct.id,
            relatedProduct_id: id,
            // product: { connect: { id: newProduct.id } },
            // related: { connect: { id: id } },
          })),
        });
      }
    }
    return res.status(200).json({
      isSuccess: true,
      message: "Product Update successfully.",
      data: newProduct,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const catlogtGetSingleProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log("id", id);

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const count = await prisma.product.count({ where: { id: id } });
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Product not found!", data: [] });

    const data = await prisma.product.findMany({
      where: { id: id },
      include: {
        attributeValues: true,
        categories: {
          include: {
            category: true,
          },
        },
        collection: {
          include: {
            collection: true,
          },
        },
        colours: {
          include: {
            colour: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        sizes: {
          select: {
            size_id: true,
            price: true,
            quantity: true,
          },
        },
      },
    });

    const formattedData = data.map((product) => {
      const newProduct = {};
      Object.keys(product).forEach((key) => {
        if (key !== "attributeValues" && key !== "colours") {
          newProduct[key] = product[key];
        }
      });

      // const attributes = product.attributeValues.map((val) => {
      //   let datas = [];
      //   console.log(val);
      //   if (datas.length > 0) {
      //     const existingAttribute = datas.find(
      //       (attr) => attr.attribute_id === val.attribute_id
      //     );
      //     if (existingAttribute) {
      //       existingAttribute.attributeValue_id.push(
      //         val.attributeValue_id || ""
      //       );
      //     } else {
      //       datas.push({
      //         attribute_id: val.attribute_id,
      //         attributeValue_id: [val.attributeValue_id],
      //         value: val.value || "",
      //       });
      //     }
      //   } else {
      //     datas.push({
      //       attribute_id: val.attribute_id,
      //       attributeValue: [val.attributeValue_id || ""],
      //       value: val.value || "",
      //     });
      //   }
      //   return datas;
      // });

      const attributes = product.attributeValues.reduce((acc, val) => {
        const existingAttribute = acc.find(
          (attr) => attr.attribute_id === val.attribute_id
        );

        if (existingAttribute) {
          existingAttribute.attributeValue.push({
            id: val.attributeValue_id || "",
            value: val.value || "",
          });
        } else {
          acc.push({
            attribute_id: val.attribute_id,
            attributeValue: [
              {
                id: val.attributeValue_id || "",
                value: val.value || "",
              },
            ],
          });
        }

        return acc;
      }, []);

      newProduct.attributes = attributes;
      newProduct.categories = product.categories.map((cat) =>
        cat.category
          ? {
              id: cat.category.id,
              parentId: cat.category.parent_id ? cat.category.parent_id : null,
              name: cat.category.name,
              isActive: cat.category.isActive,
            }
          : null
      );

      newProduct.collection = product.collection.map((cat) =>
        cat.collection
          ? {
              id: cat.collection.id,
              name: cat.collection.name,
              isActive: cat.collection.isActive,
            }
          : null
      );

      newProduct.color = product.colours.map((col) => ({
        id: col.colour.id,
        name: col.colour.name,
        code: col.colour.code,
        isActive: col.colour.isActive,
        createdAt: col.colour.createdAt,
        updatedAt: col.colour.updatedAt,
      }));

      newProduct.labels = product.labels.map((item) => {
        return {
          id: item.label_id,
          date: item.expiryTime,
          label: item.label.name,
        };
      });

      newProduct.sizes = product.sizes.map((item) => {
        return {
          id: item.size_id,
          quantity: item.quantity,
          price: item.price,
        };
      });

      return newProduct;
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data: formattedData,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteCatlogProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("product", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });
    await removeProductImage(result.data.image);

    return res
      .status(200)
      .json({ isSuccess: result.status, message: result.message });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// const addCatalogue = async (req, res, next) => {
//   try {
//     let {
//       id,
//       name,
//       cat_code,
//       category_id,
//       no_of_product,
//       price,
//       catalogue_discount,
//       average_price,
//       offer_price,
//       stitching,
//       size,
//       weight,
//       attributes,
//       meta_title,
//       meta_keyword,
//       meta_description,
//       description,
//       tag,
//       isActive,
//       product,
//     } = req.body;

//     no_of_product = parseInt(no_of_product);
//     price = parseInt(price);
//     catalogue_discount = parseInt(catalogue_discount);
//     average_price = parseInt(average_price);
//     weight = parseInt(weight);

//     if (!id && !req.file)
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Please upload cover image!" });

//     attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
//     req.body.attributes = attributes;
//     product = product?.map((jsonString) => JSON.parse(jsonString));
//     req.body.product = product;

//     const image = req.file;
//     let filepath = null;
//     if (req.file) filepath = await convertFilePathSlashes(image.path);

//     const schema = await catalogueSchema();
//     const { error } = schema.validate(req.body);
//     if (error) {
//       if (req.file) await deleteFile(filepath);
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: error?.details[0].message });
//     }
//     let catalogueCondition = { cat_code: cat_code };
//     let catalogue;
//     if (id) {
//       catalogue = await prisma.catalogue.findUnique({ where: { id: id } });
//       if (!catalogue) {
//         if (req.file) deleteFile(filepath);
//         return res
//           .status(404)
//           .json({ isSuccess: false, message: "catalogue not found!" });
//       }
//     }

//     if (id) catalogueCondition = { ...catalogueCondition, id: { not: id } };
//     const [uniqueCode, isCategoryExists] = await prisma.$transaction([
//       prisma.catalogue.findFirst({
//         where: catalogueCondition,
//       }),
//       prisma.categoryMaster.findMany({
//         where: { id: { in: category_id } },
//         select: { id: true },
//       }),
//     ]);

//     if (uniqueCode) {
//       if (req.file) await deleteFile(filepath);
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Catalogue code already exists!" });
//     }
//     if (isCategoryExists.length === 0) {
//       if (req.file) await deleteFile(filepath);
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Category not found!" });
//     }
//     let categoryConnection = [];
//     const existingCategoryIds = isCategoryExists.map((cat) => cat.id);
//     const invalidCategories = category_id.filter(
//       (catId) => !existingCategoryIds.includes(catId)
//     );
//     if (invalidCategories.length > 0) {
//       if (req.file) await deleteFile(filepath);
//       return res.status(404).json({
//         isSuccess: false,
//         message: "Invalid Categories provided.",
//         invalidCategories,
//       });
//     }
//     categoryConnection = category_id.map((catId) => ({
//       category: { connect: { id: catId } },
//     }));

//     let attributeValueConnection;
//     if (attributes && attributes.length > 0) {
//       const { status, message, data } =
//         await handleCatalogueAttributeConnection(attributes, filepath);
//       if (!status) {
//         if (req.file) await deleteFile(filepath);
//         return res.status(400).json({
//           isSuccess: status,
//           message: message,
//         });
//       }
//       attributeValueConnection = data;
//     }

//     const productId = product.map((value) => value.id);
//     if (no_of_product !== product.length) {
//       if (req.file) await deleteFile(filepath);
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "No of product not matched!" });
//     }

//     const isProductExists = await prisma.product.findMany({
//       where: { id: { in: productId } },
//       select: {
//         id: true,
//         sku: true,
//         retail_discount: true,
//         offer_price: true,
//       },
//     });
//     if (productId.length !== isProductExists.length) {
//       if (req.file) await deleteFile(filepath);
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Some products does not exists!" });
//     }

//     let finalOfferPrice = 0;
//     if (price > 0 && catalogue_discount > 0) {
//       finalOfferPrice = offer_price
//         ? parseFloat(offer_price)
//         : parseFloat(price) * (1 - parseFloat(catalogue_discount) / 100);
//     } else {
//       finalOfferPrice = offer_price ? parseFloat(offer_price) : price;
//     }

//     const totalPrice = product.reduce(
//       (acc, product) => acc + (parseFloat(product.average_price) || 0),
//       0
//     );

//     const ceilingPrice = Math.ceil(totalPrice);
//     console.log("ceilingPrice", finalOfferPrice);
//     if (ceilingPrice !== finalOfferPrice) {
//       if (req.file) await deleteFile(filepath);
//       return res.status(400).json({
//         isSuccess: false,
//         message: "Price mismatch with catalogue. Please verify.",
//       });
//     }

//     let result;
//     if (!catalogue) {
//       result = await prisma.catalogue.create({
//         data: {
//           name: name,
//           cat_code: cat_code,
//           no_of_product: no_of_product,
//           price: price,
//           catalogue_discount: catalogue_discount,
//           average_price: average_price,
//           offer_price: finalOfferPrice,
//           stitching: Boolean(stitching),
//           size: Boolean(size),
//           weight: weight,
//           meta_title: meta_title,
//           meta_keyword: meta_keyword,
//           meta_description: meta_description,
//           coverImage: filepath,
//           description: description,
//           CatalogueCategory: {
//             create: categoryConnection,
//           },
//           ...(attributes &&
//             attributes.length > 0 && {
//             attributeValues: { create: attributeValueConnection },
//           }),
//           tag: tag,
//           isActive: Boolean(isActive),
//         },
//       });
//     } else {
//       result = await prisma.catalogue.update({
//         where: { id: id },
//         data: {
//           name: name,
//           cat_code: cat_code,
//           no_of_product: no_of_product,
//           price: price,
//           catalogue_discount: catalogue_discount,
//           average_price: average_price,
//           offer_price: finalOfferPrice,
//           stitching: Boolean(stitching),
//           size: Boolean(size),
//           weight: weight,
//           meta_title: meta_title,
//           meta_keyword: meta_keyword,
//           meta_description: meta_description,
//           ...(req.file && { coverImage: filepath }),
//           description: description,
//           CatalogueCategory: {
//             deleteMany: {},
//             create: categoryConnection,
//           },
//           ...(attributes && attributes.length > 0
//             ? {
//               attributeValues: {
//                 deleteMany: {},
//                 create: attributeValueConnection,
//               },
//             }
//             : { attributeValues: { deleteMany: {} } }),
//           tag: tag,
//           isActive: Boolean(isActive),
//         },
//       });

//       if (catalogue.coverImage) await deleteFile(catalogue.coverImage);
//     }

//     await prisma.$transaction(
//       product.map((value) => {
//         const existingProduct = isProductExists.find((p) => p.id === value.id);
//         if (!existingProduct) {
//           return res.status(400).json({
//             isSuccess: false,
//             message: `product with Id ${value.id} does not exists!`,
//           });
//         }
//         const discount = existingProduct.retail_discount || 0;
//         const retailPrice = parseInt(value.retail_price);
//         const offer_price =
//           discount > 0
//             ? parseInt(retailPrice) * (1 - parseInt(discount) / 100)
//             : retailPrice;
//         const url = `${slug(name)}-${existingProduct.sku}`;
//         return prisma.product.update({
//           where: { id: value.id },
//           data: {
//             name: value.name,
//             url: url,
//             categories: { deleteMany: {}, create: categoryConnection },
//             catalogue_id: result.id,
//             average_price: parseFloat(value.average_price),
//             retail_price: retailPrice,
//             retail_discount: discount,
//             offer_price: offer_price,
//             isActive: true,
//             isDraft:false,
//             showInSingle: Boolean(value.showInSingle),
//           },
//         });
//       })
//     );
//     return res.status(200).json({
//       isSuccess: true,
//       message: "catalogue created successfully.",
//       data: result,
//     });
//   } catch (err) {
//     if (req.file) await deleteFile(req.file.path);
//     console.log(err);
//     const error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

const addCatalogue = async (req, res, next) => {
  try {
    let {
      id,
      name,
      cat_code,
      url,
      quantity,
      category_id,
      collection_id,
      no_of_product,
      price,
      catalogue_discount,
      average_price,
      GST,
      offer_price,
      optionType,
      stitching,
      size,
      weight,
      attributes,
      sizes,
      meta_title,
      meta_keyword,
      meta_description,
      description,
      tag,
      isActive,
      isApply,
      product,
      delete_product_ids, // IDs of products to delete
    } = req.body;

    // Parsing inputs
    no_of_product = parseInt(no_of_product);
    price = parseInt(price);
    catalogue_discount = parseInt(catalogue_discount);
    average_price = parseInt(average_price);
    weight = parseInt(weight);
    quantity = parseInt(quantity);
    GST = parseFloat(GST);

    if (!id && !req.file)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload cover image!" });

    attributes = attributes?.map((jsonString) => JSON.parse(jsonString));

    sizes = sizes?.map((jsonString) => JSON?.parse(jsonString));
    req.body.sizes = sizes;
    req.body.attributes = attributes;
    product = product?.map((jsonString) => JSON.parse(jsonString));
    req.body.product = product;

    const image = req.file;
    let filepath = null;
    if (req.file) filepath = await convertFilePathSlashes(image.path);

    const schema = await catalogueSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      if (req.file) await deleteFile(filepath);
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }

    let catalogue = null;
    if (id) {
      catalogue = await prisma.catalogue.findUnique({ where: { id } });
      if (!catalogue) {
        if (req.file) await deleteFile(filepath);
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found!" });
      }
    }

    // if (
    //   size === true &&
    //   product.map((value) => !value.sizes || value.sizes.length === 0)
    // ) {
    //   if (req.file) await deleteFile(filepath);
    //   return res
    //     .status(400)
    //     .json({ isSuccess: false, message: "Please select size in product!" });
    // }

    // Validate category IDs
    const [uniqueCode, isCategoryExists] = await prisma.$transaction([
      prisma.catalogue.findFirst({
        where: {
          cat_code,
          deletedAt: null,
          id: id ? { not: id } : undefined,
        },
      }),
      prisma.categoryMaster.findMany({
        where: { id: { in: category_id } },
        select: { id: true, parent_id: true },
      }),
    ]);

    if (uniqueCode) {
      if (req.file) await deleteFile(filepath);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Catalogue code already exists!" });
    }

    if (optionType === "Stitching" && isCategoryExists.length > 0) {
      const parentCategory = isCategoryExists.find(
        (cat) => cat.parent_id === null
      );

      if (parentCategory) {
        const isStitchingExists = await prisma.stitchingGroup.findMany({
          where: { category_id: parentCategory.id },
        });

        if (isStitchingExists.length === 0) {
          if (req.file) await deleteFile(filepath);
          return res.status(404).json({
            isSuccess: false,
            message:
              "Please select Stitching in category before uploading Catalogue!",
          });
        }
      }
    }

    const existingCategoryIds = isCategoryExists.map((cat) => cat.id);
    const invalidCategories = category_id.filter(
      (catId) => !existingCategoryIds.includes(catId)
    );
    if (invalidCategories.length > 0) {
      if (req.file) await deleteFile(filepath);
      return res.status(404).json({
        isSuccess: false,
        message: "Invalid Categories provided.",
        invalidCategories,
      });
    }

    if (collection_id && collection_id.length > 0) {
      const isCollectionExists = await prisma.collectionAll.findMany({
        where: { id: { in: collection_id } },
        select: { id: true },
      });

      const existingCollectionIds = isCollectionExists.map(
        (collection) => collection.id
      );
      const invalidCollection = collection_id.filter(
        (collectionId) => !existingCollectionIds.includes(collectionId)
      );
      if (invalidCollection.length > 0) {
        if (req.file) await deleteFile(filepath);
        return res.status(404).json({
          isSuccess: false,
          message: "Invalid Collection provided.",
          invalidCollection,
        });
      }
    }

    // Handle attributes
    let attributeValueConnection = null;
    if (attributes && attributes.length > 0) {
      const { status, message, data } =
        await handleCatalogueAttributeConnection(attributes, filepath);
      if (!status) {
        if (req.file) await deleteFile(filepath);
        return res.status(400).json({
          isSuccess: false,
          message,
        });
      }
      attributeValueConnection = data;
    }

    let catalogueSizeConnection = [];
    if (optionType === "Size" && sizes && sizes.length > 0) {
      const { status, message } = await handleLabelConnection(
        sizes,
        "size",
        filepath
      );
      if (!status)
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });

      catalogueSizeConnection = sizes.map((size) => ({
        size: { connect: { id: size.id } },
        price: size.price,
        quantity: size.quantity,
      }));

      // productData["sizes"] = {
      //   create: productSizeConnection,
      // };
    }

    // Validate and process product updates
    const productId = product.map((value) => value.id);
    let products = product.filter((value) => value.outofStock === false);
    if (no_of_product !== 0 && no_of_product !== products.length) {
      if (req.file) await deleteFile(filepath);
      return res
        .status(404)
        .json({ isSuccess: false, message: "No of product not matched!" });
    }
    if (optionType === "Size" && sizes.length > 0) {
      let size = sizes.map((value) => value.quantity);
      let totalSize = size.reduce((acc, currentValue) => acc + currentValue);
      console.log("totalSize", totalSize);
      console.log("quantity", quantity);
      if (totalSize !== quantity) {
        if (req.file) await deleteFile(filepath);
        return res
          .status(400)
          .json({ isSuccess: false, message: "Size quantity not matched!" });
      }
    }
    const isProductExists = await prisma.product.findMany({
      where: { id: { in: productId } },
      select: {
        id: true,
        sku: true,
        retail_discount: true,
        offer_price: true,
        outofStock: true,
        showInSingle: true,
      },
    });

    if (productId.length !== isProductExists.length) {
      if (req.file) await deleteFile(filepath);
      return res
        .status(404)
        .json({ isSuccess: false, message: "Some products do not exist!" });
    }

    // console.log("delete_product_ids", delete_product_ids);
    // Validate delete_product_ids
    if (delete_product_ids && delete_product_ids.length > 0) {
      const productsToDelete = await prisma.product.findMany({
        where: { id: { in: delete_product_ids }, catalogue_id: id },
      });

      if (productsToDelete.length !== delete_product_ids.length) {
        return res.status(400).json({
          isSuccess: false,
          message:
            "Some products to delete are invalid or not in the catalogue.",
        });
      }
    }

    let finalOfferPrice = 0;
    if (price > 0 && catalogue_discount > 0) {
      finalOfferPrice = offer_price
        ? parseFloat(offer_price)
        : parseFloat(price) * (1 - parseFloat(catalogue_discount) / 100);
    } else {
      finalOfferPrice = offer_price ? parseFloat(offer_price) : price;
    }

    const totalPrice = products.reduce(
      (acc, product) => acc + (parseFloat(product.average_price) || 0),
      0
    );

    const ceilingPrice = Math.ceil(totalPrice);
    const tolerance = 1;

    if (
      no_of_product !== 0 &&
      Math.abs(ceilingPrice - finalOfferPrice) > tolerance
    ) {
      if (req.file) await deleteFile(filepath);

      return res.status(400).json({
        isSuccess: false,
        message: "Price mismatch with catalogue. Please verify.",
      });
    }

    // if (ceilingPrice !== finalOfferPrice) {
    //   if (req.file) await deleteFile(filepath);
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message: "Price mismatch with catalogue. Please verify.",
    //   });
    // }

    // let finalOfferPrice = offer_price
    //   ? parseFloat(offer_price)
    //   : price > 0 && catalogue_discount > 0
    //   ? parseFloat(price) * (1 - parseFloat(catalogue_discount) / 100)
    //   : price;

    url = `${slug(name)}-${cat_code}`;
    // Process catalogue updates
    let result;
    await prisma.$transaction(
      async (transaction) => {
        if (!catalogue) {
          result = await transaction.catalogue.create({
            data: {
              name,
              cat_code,
              url,
              quantity: quantity,
              no_of_product,
              price,
              catalogue_discount,
              average_price,
              GST,
              offer_price: finalOfferPrice,
              optionType,
              // stitching: stitching === "true" ? true : false,
              // size: size === "true" ? true : false,
              weight,
              meta_title,
              meta_keyword,
              meta_description,
              coverImage: filepath,
              description,
              CatalogueCategory: {
                create: category_id.map((catId) => ({
                  category: { connect: { id: catId } },
                })),
              },
              ...(attributes &&
                attributes.length > 0 && {
                  attributeValues: { create: attributeValueConnection },
                }),
              ...(optionType === "Size" &&
                sizes &&
                sizes.length > 0 && {
                  CatalogueSize: { create: catalogueSizeConnection },
                }),
              tag,
              isActive: true,
              deletedAt: null,
            },
          });

          if (collection_id && collection_id.length > 0) {
            await transaction.catalogueCollection.createMany({
              data: collection_id.map((collectionId) => ({
                catalogue_id: result.id,
                collection_id: collectionId,
                product_id: null,
              })),
            });
          }
        } else {
          result = await transaction.catalogue.update({
            where: { id },
            data: {
              name,
              cat_code,
              url,
              quantity: quantity,
              no_of_product,
              price,
              catalogue_discount,
              average_price,
              GST,
              offer_price: finalOfferPrice,
              optionType,
              // stitching: stitching === "true" ? true : false,
              // size: size === "true" ? true : false,
              weight,
              meta_title,
              meta_keyword,
              meta_description,
              ...(req.file && { coverImage: filepath }),
              description,
              CatalogueCategory: {
                deleteMany: {},
                create: category_id.map((catId) => ({
                  category: { connect: { id: catId } },
                })),
              },
              ...(attributes && attributes.length > 0
                ? {
                    attributeValues: {
                      deleteMany: {},
                      create: attributeValueConnection,
                    },
                  }
                : { attributeValues: { deleteMany: {} } }),
              ...(optionType === "Size" && sizes && sizes.length > 0
                ? {
                    CatalogueSize: {
                      deleteMany: {},
                      create: catalogueSizeConnection,
                    },
                  }
                : { CatalogueSize: { deleteMany: {} } }),
              tag,
              isActive: true,
              deletedAt: null,
            },
          });

          // Delete products
          if (delete_product_ids && delete_product_ids.length > 0) {
            await transaction.product.deleteMany({
              where: { id: { in: delete_product_ids } },
            });
          }
          await transaction.catalogueCollection.deleteMany({
            where: { catalogue_id: result.id },
          });
          if (collection_id && collection_id.length > 0) {
            await transaction.catalogueCollection.createMany({
              data: collection_id.map((collectionId) => ({
                catalogue_id: result.id,
                collection_id: collectionId,
                product_id: null,
              })),
            });
          }
        }

        // Update products
        await Promise.all(
          product?.map(async (value) => {
            const existingProduct = isProductExists.find(
              (p) => p.id === value.id
            );
            const discount = existingProduct.retail_discount || 0;
            const retailPrice = parseInt(value.retail_price);
            const offer_price =
              discount > 0
                ? parseInt(retailPrice) * (1 - parseInt(discount) / 100)
                : retailPrice;
            const url = `${slug(name)}-${existingProduct.sku}`;
            let productSizeConnection;
            let sizeConnection = {};
            let productQuantity = existingProduct.quantity;
            if (result.optionType !== "Size" && value.showInSingle === false) {
              productQuantity = result.quantity;
            }

            if (result.optionType === "Size" && isApply === "true") {
              let size = sizes.map((value) => value.quantity);
              let totalSize = size.reduce(
                (acc, currentValue) => acc + currentValue
              );
              productQuantity = totalSize;
              // if (totalSize !== quantity) {
              //   if (req.file) await deleteFile(filepath);
              //   return res.status(400).json({
              //     isSuccess: false,
              //     message: "Product quantity not matched!",
              //   });
              // }
              // productSizeConnection = catalogueSizeConnection;
              sizeConnection = {
                sizes: {
                  deleteMany: {},
                  create: catalogueSizeConnection,
                },
              };
              // productSizeConnection = value.sizes.map((size) => ({
              //   size: { connect: { id: size.id } },
              //   price: parseInt(size.price),
              //   quantity: parseInt(size.quantity),
              // }));

              // productData["sizes"] = {
              //   create: productSizeConnection,
              // };
              console.log(sizeConnection);
            } else if (result.optionType !== "Size") {
              sizeConnection = { sizes: { deleteMany: {} } };
            }
            return transaction.product
              .update({
                where: { id: value.id },
                data: {
                  name: value.name,
                  url,
                  ...(productQuantity && {
                    quantity: productQuantity,
                  }),
                  categories: {
                    deleteMany: {},
                    create: category_id.map((catId) => ({
                      category: { connect: { id: catId } },
                    })),
                  },
                  // ...(result.size === true && sizes?.length > 0
                  //   ? {
                  //       sizes: {
                  //         deleteMany: {},
                  //         create: catalogueSizeConnection,
                  //       },
                  //     }
                  //   : { sizes: { deleteMany: {} } }),
                  ...sizeConnection,
                  optionType: result.optionType,
                  // ...(result.size === true && sizes?.length > 0
                  //   ? { size: true }
                  //   : { size: false }),
                  catalogue_id: result.id,
                  average_price: parseFloat(value.average_price),
                  retail_price: retailPrice,
                  retail_GST: GST,
                  retail_discount: discount,
                  offer_price,
                  isActive: true,
                  isDraft: false,
                  // stitching: result.stitching,
                  showInSingle: Boolean(value.showInSingle),
                  outofStock: Boolean(value.outofStock),
                },
              })
              .then(async () => {
                await transaction.catalogueCollection.deleteMany({
                  where: { product_id: value.id },
                });
                if (collection_id && collection_id.length > 0) {
                  return transaction.catalogueCollection.createMany({
                    data: collection_id.map((collectionId) => ({
                      catalogue_id: null,
                      collection_id: collectionId,
                      product_id: value.id,
                    })),
                  });
                }
              });
          })
        );
      },
      { timeout: 10000 }
    );

    const conditionalmessage = catalogue
      ? "Catalogue update successfully"
      : "catalogue created successfully";

    return res.status(200).json({
      isSuccess: true,
      message: conditionalmessage,
      data: result,
    });
  } catch (err) {
    if (req.file) await deleteFile(req.file.path);
    console.error(err);
    next(new Error("Something went wrong, please try again!"));
  }
};

const getCatalogueProducts = async (req, res, next) => {
  try {
    const { perPage, pageNo, catalogue_id, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const filter = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
      { quantity: isNaN(search) ? undefined : { equals: parseFloat(search) } },
      {
        retail_price: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      {
        retail_discount: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      {
        average_price: isNaN(search)
          ? undefined
          : { equals: parseFloat(search) },
      },
      {
        retail_GST: isNaN(search) ? undefined : { equals: parseFloat(search) },
      },
      {
        offer_price: isNaN(search) ? undefined : { equals: parseFloat(search) },
      },
    ];

    const searchFilter = createSearchFilter(search, filter);

    if (!catalogue_id)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please Catalogue id provide!" });

    const count = await prisma.product.count({
      where: { catalogue_id: catalogue_id },
    });

    if (count === 0) {
      return res
        .status(200)
        .json({ isSuccess: false, message: "Product not found!", data: [] });
    }
    const getProducts = await prisma.product.findMany({
      where: {
        catalogue_id: catalogue_id,
        ...searchFilter,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        attributeValues: true,
        categories: true,
        collection: true,
        catalogue: true,
        colours: true,
      },
      skip,
      take,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue products get successfully.",
      data: getProducts,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getCatalogueProduct = async (req, res, next) => {
  try {
    const catalogue_id = req.params.catalogue_id;

    if (!catalogue_id)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please Catalogue id provide!" });

    const count = await prisma.product.count({
      where: { catalogue_id: catalogue_id },
    });

    // if (count === 0) {
    //   return res
    //     .status(200)
    //     .json({ isSuccess: false, message: "Product not found!", data: [] });
    // }
    const getProducts = await prisma.catalogue.findMany({
      where: { id: catalogue_id },
      orderBy: { updatedAt: "asc" },
      include: {
        attributeValues: true,
        CatalogueCategory: {
          include: { category: true },
        },
        // CatalogueCollection: {
        //   include: { collection: true },
        // },
        CatalogueSize: {
          include: { size: true },
        },
        Product: {
          include: {
            attributeValues: true,
            categories: {
              include: {
                category: true,
              },
            },
            // collection: {
            //   include: {
            //     collection: true,
            //   },
            // },
            colours: {
              include: {
                colour: true,
              },
            },
            labels: {
              include: {
                label: true,
              },
            },
            sizes: {
              select: {
                size_id: true,
                price: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    const formattedData = getProducts.map((product) => {
      let datas = {};
      Object.keys(product).forEach((key) => {
        if (key !== "attributeValues" && key !== "Product") {
          datas[key] = product[key];
        }
      });

      // const attributes = product.attributeValues.map((val) => {
      //   let datas = [];
      //   if (datas.length > 0) {
      //     const existingAttribute = datas.find(
      //       (attr) => attr.attribute_id === val.attribute_id
      //     );
      //     if (existingAttribute) {
      //       existingAttribute.attributeValue_id.push(
      //         val.attributeValue_id || ""
      //       );
      //     } else {
      //       datas.push({
      //         attribute_id: val.attribute_id,
      //         attributeValue_id: [val.attributeValue_id],
      //         value: val.value || "",
      //       });
      //     }
      //   } else {
      //     datas.push({
      //       attribute_id: val.attribute_id,
      //       attributeValue: [val.attributeValue_id || ""],
      //       value: val.value || "",
      //     });
      //   }
      //   return datas;
      // });

      const attributes = product.attributeValues.reduce((acc, val) => {
        const existingAttribute = acc.find(
          (attr) => attr.attribute_id === val.attribute_id
        );

        if (existingAttribute) {
          existingAttribute.attributeValue.push({
            id: val.attributeValue_id || "",
            value: val.value || "",
          });
        } else {
          acc.push({
            attribute_id: val.attribute_id,
            attributeValue: [
              {
                id: val.attributeValue_id || "",
                value: val.value || "",
              },
            ],
          });
        }

        return acc;
      }, []);

      // newProduct.attributes = attributes;

      datas.attributes = attributes;

      // newProduct.attributes = attributeMap;

      datas.CatalogueCategory = product.CatalogueCategory.map((cat) =>
        cat.category
          ? {
              id: cat.category.id,
              parentId: cat.category.parent_id ? cat.category.parent_id : null,
              name: cat.category.name,
              isActive: cat.category.isActive,
            }
          : null
      );

      datas.CatalogueSize = product.CatalogueSize.map((cat) => {
        return cat.size
          ? {
              id: cat.size.id,
              // value: cat.size.value,
              quantity: cat.quantity,
              price: cat.price,
              // isActive: cat.size.isActive,
            }
          : null;
      });

      // datas.CatalogueCollection = product.CatalogueCollection.map((cat) =>
      //   cat.collection
      //     ? {
      //         id: cat.collection.id,
      //         // parentId: cat.category.parent_id ? cat.category.parent_id : null,
      //         name: cat.collection.name,
      //         isActive: cat.collection.isActive,
      //       }
      //     : null
      // );

      let Product = [];
      const products = product.Product.map((product) => {
        let newProduct = {};
        Object.keys(product).forEach((key) => {
          if (key !== "attributeValues" && key !== "colours") {
            newProduct[key] = product[key];
          }
        });
        // const attributes = product.attributeValues.map((val) => {
        //   let datas = [];
        //   if (datas.length > 0) {
        //     const existingAttribute = datas.find(
        //       (attr) => attr.attribute_id === val.attribute_id
        //     );
        //     if (existingAttribute) {
        //       existingAttribute.attributeValue_id.push(
        //         val.attributeValue_id || ""
        //       );
        //     } else {
        //       datas.push({
        //         attribute_id: val.attribute_id,
        //         attributeValue_id: [val.attributeValue_id],
        //         value: val.value || "",
        //       });
        //     }
        //   } else {
        //     datas.push({
        //       attribute_id: val.attribute_id,
        //       attributeValue: [val.attributeValue_id || ""],
        //       value: val.value || "",
        //     });
        //   }
        //   return datas;
        // });

        const attributes = product.attributeValues.reduce((acc, val) => {
          const existingAttribute = acc.find(
            (attr) => attr.attribute_id === val.attribute_id
          );

          if (existingAttribute) {
            existingAttribute.attributeValue.push({
              id: val.attributeValue_id || "",
              value: val.value || "",
            });
          } else {
            acc.push({
              attribute_id: val.attribute_id,
              attributeValue: [
                {
                  id: val.attributeValue_id || "",
                  value: val.value || "",
                },
              ],
            });
          }

          return acc;
        }, []);

        newProduct.attributes = attributes;
        // newProduct.attributes = attributeMap;
        newProduct.categories = product.categories.map((cat) =>
          cat.category
            ? {
                id: cat.category.id,
                parentId: cat.category.parent_id
                  ? cat.category.parent_id
                  : null,
                name: cat.category.name,
                isActive: cat.category.isActive,
              }
            : null
        );

        // newProduct.collection = product.collection.map((cat) =>
        //   cat.collection
        //     ? {
        //         id: cat.collection.id,
        //         name: cat.collection.name,
        //         isActive: cat.collection.isActive,
        //       }
        //     : null
        // );

        newProduct.color = product.colours.map((col) => ({
          id: col.colour.id,
          name: col.colour.name,
          code: col.colour.code,
          isActive: col.colour.isActive,
          createdAt: col.colour.createdAt,
          updatedAt: col.colour.updatedAt,
        }));

        newProduct.labels = product.labels.map((item) => {
          return {
            id: item.label_id,
            date: item.expiryTime,
            label: item.label.name,
          };
        });

        newProduct.sizes = product.sizes.map((item) => {
          return {
            id: item.size_id,
            price: item.price,
            quantity: item.quantity,
          };
        });

        return newProduct;
      });
      datas.Product = products;

      return datas;
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue products get successfully.",
      data: formattedData,
      totalCount: count,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteCatalogue = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const uniquedata = await prisma.catalogue.findUnique({
      where: { id: id },
      select: { cat_code: true, Product: { select: { id: true, sku: true } } },
    });

    if (!uniquedata) {
      return res
        .status(404)
        .json({ isSuccess: false, message: `catalogue not found!` });
    }

    const catalogue = await prisma.catalogue.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });

    // const result = await deleteData("catlogue", id);
    // if (result.status === false)
    //   return res
    //     .status(400)
    //     .json({ isSuccess: result.status, message: result.message });
    // await removeProductImage(result.data.image);

    return res
      .status(200)
      .json({ isSuccess: true, message: "Catalogue deleted successfully." });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const restoreDeleteCatalogue = async (req, res, next) => {
  try {
    const id = req.params.id;

    const catalogueDelete = await prisma.catalogue.findUnique({
      where: {
        id: id,
        NOT: { deletedAt: null },
      },
      include: { Product: true },
    });

    if (!catalogueDelete)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Catalogue not found!" });

    const catalogue = await prisma.catalogue.delete({
      where: { id: id },
      select: {
        id: true,
        coverImage: true,
        Product: { select: { id: true, image: true } },
      },
    });

    if (!catalogue)
      return res
        .status(500)
        .json({ isSuccess: false, message: "Catalogue not deleted!" });

    if (catalogue.coverImage) deleteFile(catalogue.coverImage);
    if (catalogue.Product.length > 0) {
      for (const product of catalogue.Product) {
        if (product.image) {
          await removeProductImage(product.image); // Ensure it's working
        }
      }
    }
    return res
      .status(200)
      .json({ isSuccess: true, message: "Catalogue deleted successfully." });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    return next(error);
  }
};

const draftProdcutRemove = async (req, res, next) => {
  try {
    const draftProducts = await prisma.product.findMany({
      where: { isDraft: true },
      select: { id: true, image: true },
    });

    if (draftProducts.length === 0) {
      return res
        .status(200)
        .json({ isSuccess: true, message: "No drafts to remove." });
    }

    const deleted = await prisma.product.deleteMany({
      where: { isDraft: true },
    });

    for (const product of draftProducts) {
      if (product.image) {
        await removeProductImage(product.image);
      }
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Drafts removed successfully.",
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("Error removing drafts:", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const restoreCatalogues = async (req, res, next) => {
  try {
    const catalogues = await prisma.catalogue.findMany({
      where: {
        deletedAt: { not: null },
      },

      include: {
        _count: {
          select: {
            Product: true,
          },
        },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Catalogues get successfully.",
      data: catalogues,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const restoreCatalogue = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const existingCatalogue = await prisma.catalogue.findUnique({
      where: { id: id },
      select: {
        id: true,
        cat_code: true,
        Product: { select: { id: true, sku: true } },
      },
    });

    if (!existingCatalogue)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Catalogue not found!" });

    const uniqueCode = await prisma.catalogue.findFirst({
      where: {
        cat_code: existingCatalogue.cat_code,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (uniqueCode)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Catalogue code already exists!" });

    const duplicateSku = await Promise.all(
      existingCatalogue.Product.map(async (product) => {
        const existingProduct = await prisma.product.findFirst({
          where: { id: { not: product.id }, sku: product.sku },
          select: { id: true, image: true }, // Assuming imagePath is the field for images
        });

        return existingProduct ? product.sku : null;
      })
    );

    const duplicateSkus = duplicateSku.filter((sku) => sku !== null);

    if (duplicateSkus.length > 0)
      return res.status(400).json({
        isSuccess: false,
        message: `Duplicate product Sku(s) found: ${duplicateSkus.join(",")}`,
      });

    const result = await prisma.catalogue.update({
      where: { id: id },
      data: { deletedAt: null },
    });

    return res
      .status(200)
      .json({ isSuccess: true, message: "Catalogue restore successfully." });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wronng, please try again!");
    next(error);
  }
};

export {
  postCatlogProduct,
  updateCatalogueProduct,
  catlogtGetSingleProduct,
  deleteCatlogProduct,
  addCatalogue,
  getCatalogueProducts,
  getCatalogueProduct,
  deleteCatalogue,
  draftProdcutRemove,
  restoreCatalogues,
  restoreCatalogue,
  restoreDeleteCatalogue,
};
