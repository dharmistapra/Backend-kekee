import slug from "slug";
import prisma from "../../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  fileValidation,
  handleLabelConnection,
  handleProductAttributeConnection,
  handleProductConnection,
  processProductImages,
  productsSku,
  removeProductImage,
  uniqueImage,
  updateStatus,
} from "../../../helper/common.js";
import { productSchema } from "../../../schema/joi_schema.js";
import { promises as fs } from "fs";
import path from "path";
import createSearchFilter from "../../../helper/searchFilter.js";
import imageSize from "image-size";

let products = [];

const postRetailProduct = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "At least 1 image is required." });
    }

    const imagePaths = await Promise.all(
      req.files.map(async (file) => convertFilePathSlashes(file?.path))
    );

    // for (const file of req.files) {
    //   const dimension = imageSize(file.path);
    //   if (dimension.width !== 2000 && dimension.height !== 3000) {
    //     await removeProductImage(imagePaths);
    //     return res.status(400).json({
    //       isSuccess: false,
    //       message: "Product image must be 2000 x 3000.",
    //     });
    //   }
    // }

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
      offer_price,
      description,
      label,
      tag,
      showInSingle,
      category_id,
      collection_id,
      attributes,
      colour_id,
      readyToShip,
      productlabels,
      optionType,
      size,
      relatedProduct,
      // stitching,
    } = req.body;

    quantity = parseInt(quantity);
    weight = parseFloat(weight);
    average_price = parseFloat(average_price);
    retail_price = parseFloat(retail_price);
    retail_discount = parseFloat(retail_discount);
    offer_price = parseFloat(offer_price);

    attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
    req.body.attributes = attributes;

    productlabels = productlabels?.map((jsonString) => JSON.parse(jsonString));
    req.body.productlabels = productlabels;
    // console.log("req.body.attributes", req.body.attributes);
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

    const { isSuccess, message } = await uniqueImage(imagePaths);
    if (!isSuccess) {
      await removeProductImage(imagePaths);
      return res.status(400).json({ isSuccess, message });
    }

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

    if (findUniqueData && findUniqueData.catalogue?.deletedAt !== null) {
      await removeProductImage(imagePaths);
      // await fileValidation(req.files, true);
      return res.status(409).json({
        isSuccess: false,
        message: `The product with SKU ${sku} matches a deleted ${findUniqueData.catalogue?.cat_code} catalog item. Please update the SKU or restore the catalog entry.`,
      });
    }

    if (findUniqueData) {
      await removeProductImage(imagePaths);
      // await fileValidation(req.files, true);
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

    const productImages = await processProductImages(req.files);
    console.log(productImages);

    url = `${slug(name)}-${slug(sku)}`;

    const productData = {
      name,
      catalogue_id: catalogue_id,
      sku,
      url,
      quantity,
      weight,
      // price: parseFloat(price),
      average_price: parseFloat(average_price) || 0,
      retail_price: parseFloat(retail_price),
      retail_GST: parseFloat(retail_GST),
      retail_discount: parseFloat(retail_discount),
      offer_price: finalOfferPrice,
      description,
      // labels:productlabels,
      tag,
      showInSingle,
      readyToShip,
      image: imagePaths,
      thumbImage: productImages.map((imageData) => imageData.thumbImage),
      mediumImage: productImages.map((imageData) => imageData.mediumImage),
      optionType: optionType,
      // stitching: stitching === true ? true : false,
    };
    let categoryIds = [];
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
    let attributeIds = [];
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
      // attributeValueConnection = attributes.map((attrVal) => ({
      //   attributeValue: { connect: { id: attrVal } },
      // }));
      productData["attributeValues"] = {
        create: data,
      };
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

    // let ProductlabelConnection = [];
    // if(productlabels && productlabels?.length > 0) {
    //   const { status, message } = await handleLabelConnection(productlabels,"labels",imagePaths);
    //   if(!status){
    //     return res.status(400).json({
    //       isSuccess: status,
    //       message: message,
    //     });
    //   }

    //   ProductlabelConnection = colour_id.map((item) => ({
    //     labels: { connect: { id: item } },
    //   }));
    //   // ProductlabelConnection = productlabels.map((item) => ({
    //   //   category: { connect: { id: item } },
    //   // }));
    //   productData["labels"] = {
    //     create: ProductlabelConnection,
    //   };

    // }

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
    if (optionType === "Size" && size && size.length > 0) {
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
        price: size.price,
        quantity: size.quantity,
      }));
      productData["sizes"] = {
        create: productSizeConnection,
      };
    }














    const result = await prisma.$transaction(async (tx) => {

      const newProduct = await tx.product.create({
        data: productData,
        select: { id: true },
      });


      if (relatedProduct && relatedProduct.length > 0) {
        const { status, message, data } = await productsSku(relatedProduct);
        if (!status) throw new Error(message);

        await tx.RelatedProduct.createMany({
          data: data.map((relatedId) => ({
            product_id: newProduct.id,
            relatedProduct_id: relatedId
            // relatedId,
          })),
        });
      }

      return newProduct;
    });








    // const newProduct = await prisma.product.create({
    //   data: productData,
    //   select: { id: true },
    // });


    // if (relatedProduct && relatedProduct.length > 0) {
    //   const { status, message, data } = await productsSku(relatedProduct);
    //   if (!status) {
    //     await removeProductImage(imagePaths);
    //     return res.status(400).json({
    //       isSuccess: status,
    //       message: message,
    //     });
    //   }

    //   productData["RelatedProducts"] = {
    //     create: data.map((productId) => ({
    //       related: { connect: { id: productId } },
    //     })),
    //   };
    // }


    // if (newProduct) {
    //   if (collection_id && collection_id.length > 0) {
    //     await prisma.catalogueCollection.createMany({
    //       data: collection_id.map((collectionId) => ({
    //         catalogue_id: null,
    //         collection_id: collectionId,
    //         product_id: newProduct.id,
    //       })),
    //     });
    //   }
    // }
    // products = [...products, productData];


    return res.status(200).json({
      isSuccess: true,
      message: "Product create successfully.",

    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const postCatalogueProduct = async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    const allImagePaths = req.files.map((file) =>
      convertFilePathSlashes(file?.path)
    );
    const skus = data.map((product) => product.sku);
    const uniqueSkus = new Set(skus);

    if (skus.length !== uniqueSkus.size) {
      await removeProductImage(allImagePaths); // Delete all uploaded images
      return res.status(400).json({
        isSuccess: false,
        message: "Duplicate SKUs found in the provided products.",
      });
    }
    const productResult = await Promise.all(
      products.map(async (value, index) => {
        const productFiles = req.files.filter(
          (file) => file.fieldname === `image[${index}]`
        );

        if (!productFiles || productFiles.length === 0) {
          throw new Error(
            `At least one image is required for product ${index + 1}.`
          );
        }
        const imagePaths = await Promise.all(
          productFiles.map(async (file) => convertFilePathSlashes(file?.path))
        );

        for (const file of productFiles) {
          const dimension = imageSize(file.path);
          if (dimension.width !== 2000 && dimension.height !== 3000) {
            await removeProductImage(imagePaths);
            return res.status(400).json({
              isSuccess: false,
              message: `Product image must be 2000 x 3000 ${index + 1}.`,
            });
          }
        }

        const schema = await productSchema();
        const { error } = schema.validate(value);
        if (error) {
          await removeProductImage(imagePaths);
          return res
            .status(400)
            .json({ isSuccess: false, message: error?.details[0].message });
        }
        const {
          name,
          catalogue_id,
          sku,
          quantity,
          weight,
          price,
          discount,
          offer_price,
          description,
          label,
          tag,
          showInSingle,
          readyToShip,
          category_id,
          attributeValue_id,
          colour_id,
        } = value;

        // const imagePaths = await Promise.all(
        //   req.files.map(async (file) => convertFilePathSlashes(file?.path))
        // );

        const findUniqueData = await prisma.product.findUnique({
          where: { sku: sku },
        });

        if (findUniqueData) {
          await removeProductImage(imagePaths);
          // await fileValidation(req.files, true);
          return res
            .status(200)
            .json({ isSuccess: false, message: "Code Already Used" });
        }

        const findCatalogue = await prisma.catalogue.findUnique({
          where: { id: catalogue_id },
        });

        if (!findCatalogue) {
          await removeProductImage(imagePaths);
          // await fileValidation(req.files, true);
          return res
            .status(404)
            .json({ isSuccess: false, message: "Catalogue not found!" });
        }

        const finalOfferPrice = offer_price
          ? parseFloat(offer_price)
          : parseFloat(price) * (1 - parseFloat(discount) / 100);

        // const productFiles = req.files.filter(
        //   (file) => file.fieldname === `image[${index}]`
        // );

        // if (!productFiles || productFiles.length === 0) {
        //   throw new Error(
        //     `At least one image is required for product ${index + 1}.`
        //   );
        // }
        const url = `${slug(name)}-${slug(sku)}`;
        const productData = {
          name,
          catalogue_id,
          sku,
          url,
          quantity,
          weight,
          price: parseFloat(price),
          discount: parseFloat(discount),
          offer_price: finalOfferPrice,
          description,
          label,
          tag,
          showInSingle,
          readyToShip,
          image: imagePaths,
        };
        let categoryId = [];
        // if (category_id && Array.isArray(category_id)) {
        //   if (!category_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
        //     // await fileValidation(req.files, true);
        //     await removeProductImage(imagePaths);
        //     return res
        //       .status(400)
        //       .json({ isSuccess: false, message: "Invalid ID format!" });
        //   }

        //   const existingCategories = await prisma.categoryMaster.findMany({
        //     where: { id: { in: category_id } },
        //   });
        //   if (existingCategories.length !== category_id.length) {
        //     // await fileValidation(req.files, true);
        //     await removeProductImage(imagePaths);
        //     return res.status(400).json({
        //       isSuccess: false,
        //       message: "Some category IDs do not exist.",
        //     });
        //   }
        //   categoryId = category_id.map((catId) => ({
        //     category: { connect: { id: catId } },
        //   }));
        //   productData["categories"] = {
        //     create: categoryId,
        //   };
        // }
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
        let attributeValue = [];
        // if (attributeValue_id && Array.isArray(attributeValue_id)) {
        //   if (!attributeValue_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
        //     // await fileValidation(req.files, true);
        //     await removeProductImage(imagePaths);
        //     return res
        //       .status(400)
        //       .json({ isSuccess: false, message: "Invalid ID format!" });
        //   }
        //   const existingAttributes = await prisma.attributeValue.findMany({
        //     where: { id: { in: attributeValue_id } },
        //   });
        //   if (existingAttributes.length !== attributeValue_id.length) {
        //     // await fileValidation(req.files, true);
        //     await removeProductImage(imagePaths);
        //     return res.status(400).json({
        //       isSuccess: false,
        //       message: "Some Attribute IDs do not exist.",
        //     });
        //   }
        //   attributeValue = attributeValue_id.map((attrVal) => ({
        //     attributeValue: {
        //       connect: {
        //         id: attrVal,
        //       },
        //     },
        //   }));
        //   productData["attributeValues"] = {
        //     create: attributeValue,
        //   };
        // }
        if (attributeValue_id) {
          const { status, message } = await handleProductConnection(
            "attributeValue",
            attributeValue_id,
            imagePaths
          );
          if (!status)
            return res.status(400).json({
              isSuccess: status,
              message: message,
            });

          attributeValue = attributeValue_id.map((attrVal) => ({
            attributeValue: { connect: { id: attrVal } },
          }));
          productData["attributeValues"] = {
            create: attributeValue,
          };
        }

        let colourConnection = [];
        // if (colour_id && Array.isArray(colour_id)) {
        //   // categoryIds = category_id.split(",").map((id) => id.trim());
        //   if (!colour_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
        //     await removeProductImage(imagePaths);
        //     return res
        //       .status(400)
        //       .json({ isSuccess: false, message: "Invalid ID format!" });
        //   }

        //   const existingColour = await prisma.colour.findMany({
        //     where: { id: { in: colour_id } },
        //   });
        //   if (existingColour.length !== colour_id.length) {
        //     // await fileValidation(req.files, true);
        //     await removeProductImage(imagePaths);
        //     return res.status(400).json({
        //       isSuccess: false,
        //       message: "Some colour IDs do not exist.",
        //     });
        //   }

        //   colourConnection = colour_id.map((colourId) => ({
        //     colour: { connect: { id: colourId } },
        //   }));
        //   productData["colours"] = {
        //     create: colourConnection,
        //   };
        // }
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
        console.log(productData);
        // return;
        const newProduct = await prisma.product.create({ data: productData });
        // if (category_id && Array.isArray(category_id)) {
        //   const categoryData = category_id.map((catId) => ({
        //     product_id: newProduct.id,
        //     category_id: catId,
        //   }));
        //   await prisma.productCategory.createMany({ data: categoryData });
        // }

        // if (attributeValue_id && Array.isArray(attributeValue_id)) {
        //   const attributeValueData = attributeValue_id.map((attrId) => ({
        //     product_id: newProduct.id,
        //     attributeValue_id: attrId,
        //   }));
        //   await prisma.productAttributeValue.createMany({
        //     data: attributeValueData,
        //   });
        // }
        return newProduct;
      })
    );

    return res.status(200).json({
      isSuccess: true,
      message: "Product create successfully.",
      data: productResult,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const getAllReatialProduct = async (req, res, next) => {
  try {
    const data = await prisma.product.findMany({
      where: { showInSingle: true },
      include: {
        attributeValues: {
          include: {
            attributeValue: true,
          },
        },
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
      },
    });
    const formattedData = data.map((product) => {
      const newProduct = {};
      Object.keys(product).forEach((key) => {
        newProduct[key] = product[key];
      });

      newProduct.attributeValues = product.attributeValues.map((av) =>
        av.attributeValue
          ? {
            id: av.attributeValue.id,
            name: av.attributeValue.name,
            value: av.attributeValue.value,
            isActive: av.attributeValue.isActive,
            createdAt: av.attributeValue.createdAt,
            updatedAt: av.attributeValue.updatedAt,
          }
          : null
      );

      newProduct.categories = product.categories.map((cat) =>
        cat.category
          ? {
            id: cat.category.id,
            name: cat.category.name,
            meta_title: cat.category.meta_title,
            meta_keyword: cat.category.meta_keyword,
            meta_description: cat.category.meta_description,
            isActive: cat.category.isActive,
            createdAt: cat.category.createdAt,
            updatedAt: cat.category.updatedAt,
          }
          : null
      );

      newProduct.collection = product.collection.map((cat) =>
        cat.collection
          ? {
            id: cat.collection.id,
            name: cat.collection.name,
            meta_title: cat.collection.meta_title,
            meta_keyword: cat.collection.meta_keyword,
            meta_description: cat.collection.meta_description,
            isActive: cat.collection.isActive,
            createdAt: cat.collection.createdAt,
            updatedAt: cat.collection.updatedAt,
          }
          : null
      );

      return newProduct;
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data: formattedData,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// const paginationReatilProduct = async (req, res, next) => {
//   try {
//     const { perPage, pageNo, category_id, searchQuery, type } = req.query;
//     const page = +pageNo || 1;
//     const take = +perPage || 10;
//     const skip = (page - 1) * take;

//     const productSearchFilters = [
//       { sku: { contains: searchQuery, mode: "insensitive" } },
//       { name: { contains: searchQuery, mode: "insensitive" } },
//       { description: { contains: searchQuery, mode: "insensitive" } },
//       {
//         retail_price: isNaN(searchQuery)
//           ? undefined
//           : { equals: parseFloat(searchQuery) },
//       },

//       {
//         average_price: isNaN(searchQuery)
//           ? undefined
//           : { equals: parseFloat(searchQuery) },
//       },
//       {
//         quantity: isNaN(searchQuery)
//           ? undefined
//           : { equals: parseFloat(searchQuery) },
//       },
//       {
//         discount: isNaN(searchQuery)
//           ? undefined
//           : { equals: parseFloat(searchQuery) },
//       },
//     ];
//     const cleanedsearchFilters = createSearchFilter(
//       searchQuery,
//       productSearchFilters
//     );
//     const filter = {
//       categories: {
//         some: {
//           category_id: category_id,
//         },
//       },
//       showInSingle: true,
//       OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
//       ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
//     };

//     if (type === "catalogue") {
//       filter.catalogue_id = { not: null };
//       filter.OR = [{ catalogue: { deletedAt: null } }];
//     } else if (type === "retail") {
//       filter.catalogue_id = null;
//     } else if (type === "outOfStock") {
//       filter.quantity = 0;
//     }

//     if (!filter.catalogue_id && !filter.quantity) {
//       filter.OR = [{ catalogue_id: null }, { catalogue: { deletedAt: null } }];
//     }

//     const count = await prisma.product.count({ where: filter });
//     if (count === 0)
//       return res
//         .status(200)
//         .json({ isSuccess: true, message: "Product not found!", data: [] });

//     const id = category_id;
//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const catalogueProductCount = await prisma.product.count({
//       where: {
//         catalogue_id: { not: null },
//         showInSingle: true,
//         categories: {
//           some: {
//             category_id: category_id,
//           },
//         },
//         ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
//       },
//     });

//     const retailProductCount = await prisma.product.count({
//       where: {
//         catalogue_id: null,
//         showInSingle: true,
//         categories: {
//           some: {
//             category_id: category_id, // Filter by the provided category_id
//           },
//         },
//         ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
//       },
//     });

//     const outOfStockCount = await prisma.product.count({
//       where: {
//         quantity: 0,
//         showInSingle: true,
//         categories: {
//           some: {
//             category_id: category_id,
//           },
//         },
//         ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
//       },
//     });

//     const dbdata = await prisma.product.findMany({
//       where: filter,
//       include: {
//         attributeValues: true,
//         categories: {
//           include: {
//             category: true,
//           },
//         },

//         collection: {
//           include: {
//             collection: true,
//           },
//         },
//         colours: {
//           include: {
//             colour: true,
//           },
//         },
//         labels: {
//           include: {
//             label: true,
//           },
//         },
//         sizes: {
//           select: {
//             size_id: true,
//             price: true,
//             quantity: true,
//           },
//         },
//         RelatedProducts: {
//           where: { related: { catalogue: { deletedAt: null } } },
//           select: {
//             related: {
//               select: {
//                 id: true,
//                 sku: true,
//               },
//             },
//           },
//         },
//       },
//       skip,
//       take,
//       orderBy: { updatedAt: "desc" },
//     });

//     const formattedData = dbdata?.map((product) => {
//       const newProduct = {};
//       Object.keys(product).forEach((key) => {
//         if (key !== "attributeValues" && key !== "colours") {
//           newProduct[key] = product[key];
//         }
//       });

//       const attributes = product.attributeValues.reduce((acc, val) => {
//         const existingAttribute = acc.find(
//           (attr) => attr.attribute_id === val.attribute_id
//         );

//         if (existingAttribute) {
//           existingAttribute.attributeValue.push({
//             id: val.attributeValue_id || "",
//             value: val.value || "",
//           });
//         } else {
//           acc.push({
//             attribute_id: val.attribute_id,
//             attributeValue: [
//               {
//                 id: val.attributeValue_id || "",
//                 value: val.value || "",
//               },
//             ],
//           });
//         }

//         return acc;
//       }, []);

//       newProduct.attributes = attributes;

//       newProduct.sizes = product.sizes.map((size) => ({
//         id: size.size_id,
//         price: size.price,
//         quantity: size.quantity,
//       }));
//       newProduct.categories = product.categories.map((cat) =>
//         cat.category
//           ? {
//             id: cat.category.id,
//             parentId: cat.category.parent_id ? cat.category.parent_id : null,
//             name: cat.category.name,
//             isActive: cat.category.isActive,
//           }
//           : null
//       );

//       newProduct.relatedProducts = (product.RelatedProducts || [])
//         .map((rel) => rel.related?.sku)
//         .filter((sku) => !!sku);

//       console.log("newProduct.relatedProducts", newProduct.relatedProducts)
//       newProduct.collection = product?.collection?.map((cat) =>
//         cat.collection
//           ? {
//             id: cat.collection.id,
//             name: cat.collection.name,
//             isActive: cat.collection.isActive,
//           }
//           : null
//       );

//       newProduct.color = product.colours.map((col) => ({
//         id: col.colour.id,
//         name: col.colour.name,
//         code: col.colour.code,
//         isActive: col.colour.isActive,
//         createdAt: col.colour.createdAt,
//         updatedAt: col.colour.updatedAt,
//       }));

//       newProduct.labels = product.labels.map((item) => {
//         return {
//           id: item.label_id,
//           date: item.expiryTime,
//           label: item.label.name,
//         };
//       });

//       return newProduct;
//     });

//     // console.log('FormattedData (JSON):', JSON.stringify(formattedData, null, 2));
//     let data = {
//       data: formattedData,
//       catalogueProductCount,
//       retailProductCount,
//       outOfStockCount,
//     };

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Product get successfully.",
//       data,
//       totalCount: count,
//       currentPage: page,
//       pagesize: take,
//     });
//   } catch (error) {
//     console.log(error);
//     let err = new Error("Something went wrong, please try again!");
//     next(err);
//   }
// };



const paginationReatilProduct = async (req, res, next) => {
  try {
    const { perPage, pageNo, category_id, searchQuery, type } = req.query;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const productSearchFilters = [
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { name: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      {
        retail_price: isNaN(searchQuery)
          ? undefined
          : { equals: parseFloat(searchQuery) },
      },
      {
        average_price: isNaN(searchQuery)
          ? undefined
          : { equals: parseFloat(searchQuery) },
      },
      {
        quantity: isNaN(searchQuery)
          ? undefined
          : { equals: parseFloat(searchQuery) },
      },
      {
        discount: isNaN(searchQuery)
          ? undefined
          : { equals: parseFloat(searchQuery) },
      },
    ];

    const cleanedsearchFilters = createSearchFilter(
      searchQuery,
      productSearchFilters
    );

    const filter = {
      categories: {
        some: {
          category_id: category_id,
        },
      },
      showInSingle: true,
      OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
      ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
    };

    if (type === "catalogue") {
      filter.catalogue_id = { not: null };
      filter.OR = [{ catalogue: { deletedAt: null } }];
    } else if (type === "retail") {
      filter.catalogue_id = null;
    } else if (type === "outOfStock") {
      filter.quantity = 0;
    }

    if (!filter.catalogue_id && !filter.quantity) {
      filter.OR = [{ catalogue_id: null }, { catalogue: { deletedAt: null } }];
    }

    const count = await prisma.product.count({ where: filter });

    if (count === 0) {
      return res
        .status(200)
        .json({ isSuccess: true, message: "Product not found!", data: [] });
    }

    const id = category_id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const catalogueProductCount = await prisma.product.count({
      where: {
        catalogue_id: { not: null },
        showInSingle: true,
        categories: {
          some: {
            category_id: category_id,
          },
        },
        ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
      },
    });

    const retailProductCount = await prisma.product.count({
      where: {
        catalogue_id: null,
        showInSingle: true,
        categories: {
          some: {
            category_id: category_id,
          },
        },
        ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
      },
    });

    const outOfStockCount = await prisma.product.count({
      where: {
        quantity: 0,
        showInSingle: true,
        categories: {
          some: {
            category_id: category_id,
          },
        },
        ...(cleanedsearchFilters ? { AND: [cleanedsearchFilters] } : {}),
      },
    });

    const dbdata = await prisma.product.findMany({
      where: filter,
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
        // ❌ Removed RelatedProducts from here
      },
      skip,
      take,
      orderBy: { updatedAt: "desc" },
    });

    // ✅ Format product data and fetch related SKUs
    const formattedData = await Promise.all(
      dbdata.map(async (product) => {
        const newProduct = {};
        Object.keys(product).forEach((key) => {
          if (key !== "attributeValues" && key !== "colours") {
            newProduct[key] = product[key];
          }
        });

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

        newProduct.sizes = product.sizes.map((size) => ({
          id: size.size_id,
          price: size.price,
          quantity: size.quantity,
        }));

        newProduct.categories = product.categories.map((cat) =>
          cat.category
            ? {
              id: cat.category.id,
              parentId: cat.category.parent_id || null,
              name: cat.category.name,
              isActive: cat.category.isActive,
            }
            : null
        );

        // ✅ Fetch related SKUs
        const related = await prisma.relatedProduct.findMany({
          where: { product_id: product.id },
          select: {
            related: {
              select: {
                sku: true,
              },
            },
          },
        });

        newProduct.relatedProducts = related
          .map((rel) => rel.related?.sku)
          .filter(Boolean);

        newProduct.collection = product?.collection?.map((cat) =>
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

        newProduct.labels = product.labels.map((item) => ({
          id: item.label_id,
          date: item.expiryTime,
          label: item.label.name,
        }));

        return newProduct;
      })
    );

    let data = {
      data: formattedData,
      catalogueProductCount,
      retailProductCount,
      outOfStockCount,
    };

    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};


const updateRetailProduct = async (req, res, next) => {
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
      description = "",
      label = "",
      tag = "",
      showInSingle = false,
      readyToShip = false,
      category_id,
      attributes = {},
      colour_id,
      images = [],
      productlabels,
      size,
      stitching,
      relatedProduct,
    } = req.body;

    quantity = parseInt(quantity) || 0;
    weight = parseFloat(weight) || 0;
    average_price = parseFloat(average_price) || 0;
    retail_price = parseFloat(retail_price) || 0;
    retail_discount = parseFloat(retail_discount) || 0;
    offer_price = parseFloat(offer_price) || 0;

    if (typeof images === "string") {
      images = [images];
    } else {
      images = images;
    }

    // attributes = attributes?.map((jsonString) => JSON.parse(jsonString));
    // req.body.attributes = attributes;

    const schema = await productSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      if (req.files && req.files?.length > 0)
        await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }

    if (req.files && req.files?.length > 0) {
      for (const file of req.files) {
        const dimension = imageSize(file.path);
        if (dimension.width !== 2000 && dimension.height !== 3000) {
          await removeProductImage(imagePaths);
          return res.status(400).json({
            isSuccess: false,
            message: "Product image must be 2000 x 3000.",
          });
        }
      }
    }

    showInSingle = showInSingle == "true" ? true : false;
    const findUniqueData = await prisma.product.findFirst({
      where: {
        sku: sku,
        OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
      },
    });

    if (findUniqueData && findUniqueData.id !== id) {
      if (req.files && req.files?.length > 0)
        // await fileValidation(req.files, true);
        await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: "SKU already in use!" });
    }

    if (catalogue_id) {
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
    } else {
      catalogue_id = null;
    }

    const finalOfferPrice = offer_price
      ? parseFloat(offer_price)
      : parseFloat(retail_price) * (1 - parseFloat(retail_discount) / 100);
    let processedThumbs = [];
    let processedMediums = [];
    if (req.files) {
      const productImages = await processProductImages(req.files);

      processedThumbs = imagePaths &&
        productImages.length > 0 && [
          ...productImages.map((img) => img.thumbImage),
          ...(findUniqueData?.thumbImage || []),
        ];
      processedMediums = imagePaths &&
        processedImages.length > 0 && [
          ...productImages.map((img) => img.mediumImage),
          ...(findUniqueData?.mediumImage || []),
        ];
    }

    url = `${slug(name)}-${slug(sku)}`;

    const productData = {
      name,
      catalogue_id: catalogue_id || null,
      sku,
      url,
      quantity,
      weight,
      retail_price,
      retail_GST,
      retail_discount,
      offer_price: finalOfferPrice,
      description,
      label,
      tag,
      showInSingle,
      readyToShip,
      image: imagePaths ? [...imagePaths, ...images] : images,
      stitching,
    };

    let categoryId = [];
    // if (category_id && Array.isArray(category_id)) {
    //   if (!category_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
    //     return res
    //       .status(400)
    //       .json({ isSuccess: false, message: "Invalid ID format!" });
    //   }

    //   const existingCategories = await prisma.categoryMaster.findMany({
    //     where: { id: { in: category_id } },
    //   });
    //   if (existingCategories.length !== category_id.length) {
    //     if (req.files && req.files?.length > 0)
    //       await fileValidation(req.files, true);
    //     return res.status(400).json({
    //       isSuccess: false,
    //       message: "Some category IDs do not exist.",
    //     });
    //   }

    //   categoryId = category_id.map((catId) => ({
    //     category: { connect: { id: catId } },
    //   }));
    //   productData["categories"] = {
    //     deleteMany: {},
    //     create: categoryId,
    //   };
    // }
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
    }
    let attributeValue = [];
    // if (attributeValue_id && Array.isArray(attributeValue_id)) {
    //   if (!attributeValue_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
    //     return res
    //       .status(400)
    //       .json({ isSuccess: false, message: "Invalid ID format!" });
    //   }
    //   const existingAttributes = await prisma.attributeValue.findMany({
    //     where: { id: { in: attributeValue_id } },
    //   });
    //   if (existingAttributes.length !== attributeValue_id.length) {
    //     if (req.files && req.files?.length > 0)
    //       await fileValidation(req.files, true);
    //     return res.status(400).json({
    //       isSuccess: false,
    //       message: "Some Attribute IDs do not exist.",
    //     });
    //   }
    //   attributeValue = attributeValue_id.map((attrVal) => ({
    //     attributeValue: { connect: { id: attrVal } },
    //   }));
    //   productData["attributeValues"] = {
    //     deleteMany: {},
    //     create: attributeValue,
    //   };
    // }
    // if (attributeValue_id) {
    //   const { status, message } = await handleProductConnection(
    //     "attributeValue",
    //     attributeValue_id,
    //     imagePaths
    //   );
    //   if (!status)
    //     return res.status(400).json({
    //       isSuccess: status,
    //       message: message,
    //     });

    //   attributeValue = attributeValue_id.map((attrVal) => ({
    //     attributeValue: { connect: { id: attrVal } },
    //   }));
    //   productData["attributeValues"] = {
    //     deleteMany: {},
    //     create: attributeValue,
    //   };
    // }
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
      // attributeValueConnection = attributes.map((attrVal) => ({
      //   attributeValue: { connect: { id: attrVal } },
      // }));
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
        if (req.files && req.files.length > 0)
          await removeProductImage(imagePaths);
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }

      productData["RelatedProducts"] = {
        create: data.map((productId) => ({
          related: { connect: { id: productId } },
        })),
      };
    } else if (relatedProduct && relatedProduct.length === 0) {
      productData["RelatedProducts"] = {
        deleteMany: {},
      };
    }

    let colourConnection = [];
    // if (colour_id && Array.isArray(colour_id)) {
    //   // categoryIds = category_id.split(",").map((id) => id.trim());
    //   if (!colour_id.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
    //     await removeProductImage(imagePaths);
    //     return res
    //       .status(400)
    //       .json({ isSuccess: false, message: "Invalid ID format!" });
    //   }

    //   const existingColour = await prisma.colour.findMany({
    //     where: { id: { in: colour_id } },
    //   });
    //   if (existingColour.length !== colour_id.length) {
    //     // await fileValidation(req.files, true);
    //     await removeProductImage(imagePaths);
    //     return res.status(400).json({
    //       isSuccess: false,
    //       message: "Some colour IDs do not exist.",
    //     });
    //   }

    //   colourConnection = colour_id.map((colourId) => ({
    //     colour: { connect: { id: colourId } },
    //   }));
    //   productData["colours"] = {
    //     deleteMany: {},
    //     create: colourConnection,
    //   };
    // }
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
        deleteMany: {},
        create: productLabelConnection,
      };
    } else if (productlabels?.length === 0) {
      productData["labels"] = {
        deleteMany: {},
      };
    }

    let productSizeConnection = [];
    if (size) {
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
        price: size.price,
        quantity: size.quantity,
      }));
      productData["sizes"] = {
        deleteMany: {},
        create: productSizeConnection,
      };
    } else if (size.length === 0) {
      productData["sizes"] = {
        deleteMany: {},
      };
    }

    const newProduct = await prisma.product.update({
      where: {
        id: id,
      },
      data: productData,
    });

    // if (category_id && Array.isArray(category_id)) {
    //   const existingCategories = await prisma.productCategory.findMany({
    //     where: { product_id: newProduct.id },
    //   });
    //   const existingCategoryIds = existingCategories.map(
    //     (cat) => cat.category_id
    //   );
    //   const categoriesToAdd = category_id.filter(
    //     (id) => !existingCategoryIds.includes(id)
    //   );
    //   const categoriesToRemove = existingCategoryIds.filter(
    //     (id) => !category_id.includes(id)
    //   );
    //   if (categoriesToRemove.length > 0) {
    //     await prisma.productCategory.deleteMany({
    //       where: {
    //         product_id: newProduct.id,
    //         category_id: { in: categoriesToRemove },
    //       },
    //     });
    //   }

    //   const categoryDataToAdd = categoriesToAdd.map((catId) => ({
    //     product_id: newProduct.id,
    //     category_id: catId,
    //   }));

    //   if (categoryDataToAdd.length > 0) {
    //     await prisma.productCategory.createMany({ data: categoryDataToAdd });
    //   }
    // }

    // if (attributeValue_id && Array.isArray(attributeValue_id)) {
    //   const existingAttributes = await prisma.productAttributeValue.findMany({
    //     where: { product_id: newProduct.id },
    //   });
    //   const existingAttributeIds = existingAttributes.map(
    //     (attr) => attr.attributeValue_id
    //   );
    //   const attributesToAdd = attributeValue_id.filter(
    //     (id) => !existingAttributeIds.includes(id)
    //   );
    //   const attributesToRemove = existingAttributeIds.filter(
    //     (id) => !attributeValue_id.includes(id)
    //   );

    //   if (attributesToRemove.length > 0) {
    //     await prisma.productAttributeValue.deleteMany({
    //       where: {
    //         product_id: newProduct.id,
    //         attributeValue_id: { in: attributesToRemove },
    //       },
    //     });
    //   }
    //   const attributeDataToAdd = attributesToAdd.map((attrId) => ({
    //     product_id: newProduct.id,
    //     attributeValue_id: attrId,
    //   }));
    //   if (attributeDataToAdd.length > 0) {
    //     await prisma.productAttributeValue.createMany({
    //       data: attributeDataToAdd,
    //     });
    //   }
    // }

    return res.status(200).json({
      isSuccess: true,
      message: "Product Update successfully.",
      data: newProduct,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteReatailProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await prisma.product.findUnique({ where: { id: id } });
    if (!product) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });
    }

    if (product.catalogue_id !== null) {
      const existingCatalogue = await prisma.catalogue.findUnique({
        where: { id: product.catalogue_id },
      });

      if (!existingCatalogue) {
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found!" });
      }
      let prevCatalogueState;
      if (existingCatalogue.no_of_product === 1) {
        const { status, message, data } = await deleteData(
          "catalogue",
          product.catalogue_id
        );
        if (status === false)
          return res.status(400).json({ isSuccess: status, message: message });
        await deleteFile(data.coverImage);
      } else {
        prevCatalogueState = {
          no_of_product: existingCatalogue.no_of_product,
          price: existingCatalogue.price,
          average_price: existingCatalogue.average_price,
          offer_price: existingCatalogue.offer_price,
        };
        const updatedCataloguePrice =
          existingCatalogue.price - product.average_price;
        const catalogueDiscount = existingCatalogue.catalogue_discount;

        let finalOfferPrice = 0;
        if (updatedCataloguePrice > 0 && catalogueDiscount > 0) {
          finalOfferPrice =
            parseFloat(updatedCataloguePrice) *
            (1 - parseFloat(catalogueDiscount) / 100);
        } else {
          finalOfferPrice = updatedCataloguePrice;
        }

        const updatedCatalogue = await prisma.catalogue.update({
          where: { id: product.catalogue_id },
          data: {
            no_of_product: { decrement: 1 },
            price: updatedCataloguePrice,
            average_price:
              updatedCataloguePrice / (existingCatalogue.no_of_product - 1),
            offer_price: finalOfferPrice,
          },
        });
      }

      try {
        const result = await prisma.product.delete({
          where: { id: id },
        });
        await removeProductImage(result.image);
        await deleteFile(result.thumbImage);
        await deleteFile(result.mediumImage);

        return res.status(200).json({
          isSuccess: true,
          message: `Product deleted successfully.`,
          data: result,
        });
      } catch (error) {
        await prisma.catalogue.update({
          where: { id: product.catalogue_id },
          data: prevCatalogueState,
        });

        return res.status(500).json({
          isSuccess: false,
          message: "Product deletion failed",
          error: error.message,
        });
      }
    } else {
      const result = await prisma.product.delete({
        where: { id: id },
      });
      await removeProductImage(result.image);
      await deleteFile(result.thumbImage);
      await deleteFile(result.mediumImage);

      return res.status(200).json({
        isSuccess: true,
        message: `Product deleted successfully.`,
        data: result,
      });
    }
  } catch (error) {
    console.error(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateReatailProductStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("product", id);
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

// const deleteProductImage = async (req, res, next) => {
//   try {
//     const { id, image } = req.body;
//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const uniqueProduct = await prisma.product.findUnique({
//       where: { id: id },
//     });

//     if (!uniqueProduct)
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Product not found!" });

//     if (!uniqueProduct.image.includes(image))
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "image not exists!" });

//     if (uniqueProduct.image.length === 1)
//       return res.status(400).json({
//         isSuccess: false,
//         message: "At least minimum 1 image are exists in this product!",
//       });

//     // const getImagePaths = async (originalPath) => {
//     //   const baseName = path.basename(originalPath);
//     //   return {
//     //     thumb: `/uploads/product/thumb/${baseName}`,
//     //     medium: `/uploads/product/medium/${baseName}`,
//     //   };
//     // };

//     // const { thumb, medium } = await getImagePaths(image);

//     const updatedImages = uniqueProduct.image.filter((img) => img !== image);
//     // const thumbImages = uniqueProduct.thumbImage.filter((img) => img !== thumb);
//     // const mediumImages = uniqueProduct.mediumImage.filter(
//     //   (img) => img !== medium
//     // );

//     await deleteFile(image);
//     // await deleteFile(thumb);
//     // await deleteFile(medium);

//     const result = await prisma.product.update({
//       where: { id: id },
//       data: {
//         image: updatedImages,
//         // thumbImage: thumbImages,
//         // mediumImage: mediumImages,
//       },
//     });

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Product image deleted successfully.",
//     });
//   } catch (err) {
//     console.log(err);
//     const error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

const deleteProductImage = async (req, res, next) => {
  try {
    const { id, image } = req.body;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const uniqueProduct = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!uniqueProduct)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });

    if (!uniqueProduct.image.includes(image))
      return res
        .status(400)
        .json({ isSuccess: false, message: "image not exists!" });

    if (uniqueProduct.image.length === 1)
      return res.status(400).json({
        isSuccess: false,
        message: "At least minimum 1 image are exists in this product!",
      });

    const thumbImage = `uploads/product/thumb/${path.basename(image)}`;
    const mediumImage = `uploads/product/medium/${path.basename(image)}`;

    const updatedImages = uniqueProduct.image.filter((img) => img !== image);
    const updatedThumbImage = uniqueProduct.thumbImage.filter(
      (img) => img !== thumbImage
    );
    const updatedMediumImage = uniqueProduct.mediumImage.filter(
      (img) => img !== mediumImage
    );
    console.log(mediumImage, "updatedImages");
    console.log(thumbImage, "updatedThumbImage");
    console.log(image, "image");
    await deleteFile(image);
    await deleteFile(thumbImage);
    await deleteFile(mediumImage);

    const result = await prisma.product.update({
      where: { id: id },
      data: {
        image: updatedImages,
        thumbImage: updatedThumbImage,
        mediumImage: updatedMediumImage,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Product image deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// const deleteProductImage = async (req, res, next) => {
//   try {
//     const { id, image } = req.body;
//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const uniqueProduct = await prisma.product.findUnique({
//       where: { id: id },
//     });

//     if (!uniqueProduct)
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Product not found!" });

//     if (!uniqueProduct.image.includes(image))
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "image not exists!" });

//     if (uniqueProduct.image.length === 1)
//       return res.status(400).json({
//         isSuccess: false,
//         message: "At least minimum 1 image are exists in this product!",
//       });

//     const updatedImages = uniqueProduct.image.filter((img) => img !== image);

//     await deleteFile(image);

//     const result = await prisma.product.update({
//       where: { id: id },
//       data: { image: updatedImages },
//     });
//     return res.status(200).json({
//       isSuccess: true,
//       message: "Product image deleted successfully.",
//     });
//   } catch (err) {
//     const error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

const arrayProducts = async (req, res, next) => {
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
      price,
      discount,
      offer_price,
      description,
      label,
      tag,
      showInSingle,
      category_id,
      attributes,
      colour_id,
      readyToShip,
    } = req.body;

    // attributes = attributes.map((jsonString) => JSON.parse(jsonString));
    req.body.attributes = attributes;
    const schema = await productSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }

    showInSingle = showInSingle == "true" ? true : false;
    const findUniqueData = await prisma.product.findUnique({
      where: { sku: sku },
    });

    if (findUniqueData) {
      await removeProductImage(imagePaths);
      return res
        .status(409)
        .json({ isSuccess: false, message: "Code Already Used" });
    }

    const finalOfferPrice = offer_price
      ? parseFloat(offer_price)
      : parseFloat(price) * (1 - parseFloat(discount) / 100);

    url = `${slug(name)}-${slug(sku)}`;

    const productData = {
      name,
      catalogue_id: null,
      sku,
      url,
      quantity,
      weight,
      price: parseFloat(price),
      discount: parseFloat(discount),
      offer_price: finalOfferPrice,
      description,
      label,
      tag,
      showInSingle,
      readyToShip,
      image: imagePaths,
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
    let products = await readProductsFromFile();
    const existingProductIndex = products.findIndex(
      (value) => value.sku === sku
    );
    if (existingProductIndex !== -1) {
      const oldImage = await products[existingProductIndex].image;
      const images = oldImage.filter((image) => !imagePaths.includes(image));
      if (images.length > 0) await removeProductImage(images);

      products[existingProductIndex] = {
        ...products[existingProductIndex],
        name,
        catalogue_id: null,
        quantity,
        weight,
        price: parseFloat(price),
        discount: parseFloat(discount),
        offer_price: offer_price
          ? parseFloat(offer_price)
          : parseFloat(price) * (1 - parseFloat(discount) / 100),
        description,
        label,
        tag,
        showInSingle,
        readyToShip,
        image: imagePaths,
      };
      await writeProductsToFile(products);
    } else {
      products.push(productData);
      await writeProductsToFile(products);
    }
    return res.status(200).json({
      isSuccess: true,
      message: "Product store successfully.",
      data: productData,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const removeArrayOfProducts = async (req, res, next) => {
  try {
    await deleteProductFiles();
    return res.status(200).json({
      isSuccess: true,
      message: "Products remove successfully.",
      data: [],
    });
  } catch (err) {
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.product.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        showInSingle: true,
        catalogue_id: true,
        catalogue: {
          select: { id: true, name: true, url: true },
        },
        url: true,
        quantity: true,
        weight: true,
        average_price: true,
        retail_price: true,
        retail_discount: true,
        offer_price: true,
        image: true,
        description: true,
        tag: true,
        readyToShip: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        optionType: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                StitchingGroup: {
                  select: {
                    id: true,
                    name: true,
                    stitchingGroupOption: {
                      select: {
                        stitchingOption: {
                          select: {
                            id: true,
                            name: true,
                            catalogue_price: true,
                            price: true,
                            type: true,
                            dispatch_time: true,
                            isActive: true,
                            isCustom: true,
                            isDefault: true,
                            stitchingValues: {
                              select: {
                                id: true,
                                type: true,
                                name: true,
                                range: true,
                                values: true,
                              },
                              where: {
                                isActive: true,
                              },
                            },
                          },
                        },
                      },
                      where: {
                        stitchingOption: {
                          isActive: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        attributeValues: {
          select: {
            attribute: true,
            attributeValue: true,
          },
        },
        colours: {
          include: {
            colour: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        labels: {
          select: {
            id: true,
            label: {
              select: {
                id: true,
                name: true,
              },
            },
            expiryTime: true,
          },
        },
        sizes: {
          where: { size: { isActive: true } },
          include: {
            size: {
              select: {
                id: true,
                value: true,
                position: true,
              },
            },
          },
        },
        RelatedProduct: {
          where: {
            related: { catalogue: { deletedAt: null }, isActive: true },
          },
          select: {
            related: {
              select: {
                id: true,
                sku: true,
                url: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!data)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });

    data.catalogueUrl = data.catalogue?.url || null;
    if (data?.attributeValues?.length > 0) {
      let labels = [];
      let colours = [];
      const processedAttributes = data.attributeValues.reduce((acc, item) => {
        const { attribute, attributeValue } = item;
        if (attribute.type === "ExpiryTime") return acc;
        if (attribute.type === "Label") {
          labels.push({
            label: attributeValue.name,
            colour: attributeValue.colour,
          });
          return acc;
        }
        if (attribute.type === "Colour") {
          colours.push({
            color: attributeValue.value,
            code: attributeValue.code,
          });
          return acc;
        }

        if (!acc[attribute.id]) {
          acc[attribute.id] = {
            name: attribute.name,
            key: attribute.key,
            values: [],
          };
        }
        if (attributeValue && attributeValue.attr_id === attribute.id) {
          acc[attribute.id].values.push(attributeValue.value);
        }
        return acc;
      }, {});
      data.labels = labels;
      data.colours = colours;
      data.attributeValues = Object.values(processedAttributes);
    }
    if (data && data.optionType === "Stitching") {
      data.stitchingOption = data.categories
        ?.map((item) => {
          const stitchingGroup = item.category?.StitchingGroup;

          if (Array.isArray(stitchingGroup) && stitchingGroup.length > 0) {
            return stitchingGroup.flatMap((group) => ({
              id: group.id,
              name: group.name,
              stitchingOption: group.stitchingGroupOption
                .map((option) => ({
                  ...option.stitchingOption,
                }))
                .flat(),
            }));
          }

          return [];
        })
        .flat();
    }
    if (data && data.categories) {
      data.categories = data.categories.map((item) => item.category.id);
    }

    if (data && data.sizes) {
      data.sizes = data.sizes
        ?.map((item) => {
          item.size.price = item.price;
          item.size.quantity = item.quantity;
          return item.size;
        })
        .flat();
    }
    if (data && data.RelatedProduct) {
      data.RelatedProduct = data.RelatedProduct?.map((item) => {
        return item.related;
      }).flat();
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data: data,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export {
  postRetailProduct,
  getAllReatialProduct,
  paginationReatilProduct,
  updateRetailProduct,
  deleteReatailProduct,
  updateReatailProductStatus,
  postCatalogueProduct,
  deleteProductImage,
  arrayProducts,
  removeArrayOfProducts,
  getProductDetails,
};

const __dirname = path.resolve();
const productsFilePath = path.join(__dirname, "products.json");

const readProductsFromFile = async () => {
  try {
    const data = await fs.readFile(productsFilePath, "utf8");
    return JSON.parse(data || []);
  } catch (error) {
    console.error("Error reading products file:", error);
    return [];
  }
};

const writeProductsToFile = async (products) => {
  try {
    await fs.writeFile(
      productsFilePath,
      JSON.stringify(products, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Error writing to products file:", error);
  }
};

const deleteProductFiles = async () => {
  try {
    const products = await readProductsFromFile();
    if (products) {
      const images = products.map(async (val) => {
        await removeProductImage(val.image);
      });

      await Promise.all(images);
    }
    await fs.unlink(productsFilePath);
  } catch (error) {
    console.log(error);
  }
};
