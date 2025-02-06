// const fs = require('fs');
import fs from "fs";
import path from "path";
import {
  convertFilePathSlashes,
  deleteFile,
  fileValidation,
  fileValidationError,
  handleCatalogueAttributeConnection,
  handleProductAttributeConnection,
  handleProductConnection,
  removeProductAndCatalogueImage,
  removeProductImage,
} from "../../../helper/common.js";
import prisma from "../../../db/config.js";
import { productSchema } from "../../../schema/joi_schema.js";
import slug from "slug";

const storedCatalogs = [];
let product = [];
let catalogueMeta = null;

const __dirname = path.resolve();
const productsFilePath = path.join(__dirname, "products.json");
const writeToFile = (filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
};

const HandleChunkData = async (req, res, next) => {
  let imagePaths = await Promise.all(
    req.files.map(async (file) => convertFilePathSlashes(file?.path))
  );
  let productImage = [];
  let catImage;
  let catProducts = [];
  if (catalogueMeta !== null) {
    catProducts = product.filter(
      (value) => value.cat_code === catalogueMeta.cat_code
    );
    console.log(catProducts);
    catImage = catalogueMeta.desktopImage;

    const productImages = catProducts.map(
      async (value) =>
        await value.image.map((images) => productImage.push(images))
    );
  }
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    if (catalogueMeta === null) {
      await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Catalogue not found!" });
    }

    let convertattributes = req.body.attributes.map((jsonString) =>
      JSON.parse(jsonString)
    );
    req.body.attributes = convertattributes;
    // imagePaths.push(...productImage);
    const schema = await productSchema();
    const { error } = schema.validate(req.body);
    if (error) {
      await removeProductAndCatalogueImage(imagePaths, catImage, productImage);

      product = [];
      catalogueMeta = null;
      return res
        .status(400)
        .json({ isSuccess: false, message: error?.details[0].message });
    }
    let {
      name,
      catalogue_id,
      cat_code,
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
      readyToShip,
      category_id,
      attributes,
      colour_id,
    } = req.body;

    const uniqueSku = await product.find((product) => product.sku === sku);
    if (uniqueSku) {
      await removeProductAndCatalogueImage(imagePaths, catImage, productImage);
      product = [];
      catalogueMeta = null;
      return res.status(400).json({
        isSuccess: false,
        message: "Sku already exists!",
      });
    }

    const findUniqueData = await prisma.product.findUnique({
      where: { sku: sku },
    });
    if (findUniqueData) {
      await removeProductAndCatalogueImage(imagePaths, catImage, productImage);
      product = [];
      catalogueMeta = null;
      return res
        .status(409)
        .json({ isSuccess: false, message: "Code Already Used" });
    }
    const finalOfferPrice = offer_price
      ? parseFloat(offer_price)
      : parseFloat(price) * (1 - parseFloat(discount) / 100);

    url = `${slug(name)}-${sku}`;

    const productData = {
      name,
      catalogue_id: null,
      cat_code,
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
      showInSingle:
        showInSingle === "true"
          ? true
          : showInSingle === "false"
          ? false
          : null,
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
      if (!status) {
        await deleteFile(catImage);
        await removeProductImage(productImage);
        product = [];
        catalogueMeta = null;
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }
      categoryConnection = category_id.map((catId) => ({
        category: { connect: { id: catId } },
      }));
      productData["categories"] = {
        create: categoryConnection,
      };
    }

    let attributeConnection = [];
    if (attributes && attributes.length > 0) {
      const { status, message, data } = await handleProductAttributeConnection(
        attributes,
        imagePaths
      );
      if (!status) {
        await deleteFile(catImage);
        await removeProductImage(productImage);
        product = [];
        catalogueMeta = null;
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }
      attributeConnection = data;
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
      if (!status) {
        await deleteFile(catImage);
        await removeProductImage(productImage);
        product = [];
        catalogueMeta = null;
        return res.status(400).json({
          isSuccess: status,
          message: message,
        });
      }

      colourConnection = colour_id.map((colourId) => ({
        colour: { connect: { id: colourId } },
      }));
      productData["colours"] = {
        create: colourConnection,
      };
    }
    if (
      catProducts.length > 0 &&
      catProducts.length === catalogueMeta.no_of_product
    ) {
      const totalPrice = catProducts.reduce((accumulator, product) => {
        return accumulator + (product.price || 0);
      }, 0);
      if (totalPrice !== catalogueMeta.price) {
        await removeProductAndCatalogueImage(
          imagePaths,
          catImage,
          productImage
        );
        product = [];
        catalogueMeta = null;
        return res.status(400).json({
          isSuccess: false,
          message: "Price mismatch with catalogue. Please verify.",
        });
      }
    }

    product = [...product, productData];
    console.log("product", product);

    if (catalogueMeta?.no_of_product == product.length) {
      // const finalData = {
      //   catalog: catalogueMeta,
      //   products: productData,
      // };
      const result = await prisma.catalogue.create({
        data: catalogueMeta,
      });

      let productData = product.map(async (value) => {
        value.catalogue_id = result.id;
        delete value.cat_code;
        return value;
      });
      const data = await Promise.all(
        productData.map(async (product) => {
          await prisma.product.create({
            data: product,
          });
        })
      );

      // const data = await prisma.product.createMany({ data: productData });
      if (!data) {
        await prisma.catalogue.delete({ where: { id: result.id } });
        await removeProductAndCatalogueImage(
          imagePaths,
          catImage,
          productImage
        );
        product = [];
        catalogueMeta = null;
        return res
          .status(400)
          .json({ isSuccess: false, message: "Product not created." });
      }
    }
    return res.status(200).json({
      isSuccess: true,
      message: "All product data received and stored successfully.",
      data: product,
    });

    return res.status(200).json({
      isSuccess: true,
      message: `Chunk received successfully. Waiting for more chunks...`,
    });

    const totalProducts = products.length;
    if (totalProducts !== catlognumberofproducts) {
      return res.status(400).json({
        isSuccess: false,
        message: `Total number of products (${totalProducts}) does not match catalog number of products (${catlognumberofproducts})`,
      });
    }

    // const totalPrice = products.reduce(
    //   (sum, product) => sum + product.price,
    //   0
    // );
    // if (totalPrice !== catlogtotalprice) {
    //   return res.status(400).json({
    //     isSuccess: false,
    //     message: `Total price of products ($${totalPrice}) does not match catalog total price ($${catlogtotalprice})`,
    //   });
    // }

    const tempData = {
      catlogname,
      catlogcode,
      catlognumberofproducts,
      catlogtotalprice,
      products,
    };

    const filePath = "./tempCatalogData.json";
    fs.writeFileSync(filePath, JSON.stringify(tempData, null, 2));

    return res.status(200).json({
      isSuccess: true,
      message: "Catalog and products validated and stored successfully.",
    });
  } catch (error) {
    // await removeProductImage(imagePaths);
    // await deleteFile(catImage);
    await removeProductAndCatalogueImage(imagePaths, catImage, productImage);
    product = [];
    catalogueMeta = null;
    console.log(error);
    return res.status(400).json({
      isSuccess: false,
      message: error.message,
    });
  }
};

const postCatalogueChunk = async (req, res, next) => {
  try {
    const {
      name,
      cat_code,
      category_id,
      no_of_product,
      price,
      catalogue_discount,
      average_price,
      // retail_discount,
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
    const existingCategoryIds = isCategoryExists?.map((cat) => cat.id);
    const invalidCategories = category_id?.filter(
      (catId) => !existingCategoryIds?.includes(catId)
    );
    if (invalidCategories?.length > 0) {
      if (req.files) await fileValidation(req.files, true);
      return res.status(404).json({
        isSuccess: false,
        message: "Invalid Categories provided.",
        invalidCategories,
      });
    }
    categoryConnection = category_id?.map((catId) => ({
      category: { connect: { id: catId } },
    }));

    let attributeValueConnection;
    if (attributes && attributes.length > 0) {
      const { status, message, data } =
        await handleCatalogueAttributeConnection(attributes, req.files);
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

    const desktopImage = await convertFilePathSlashes(
      req.files.desktopImage[0].path
    );
    // const mobileImage = await convertFilePathSlashes(
    //   req.files.mobileImage[0].path
    // );

    console.log("Data", "hhhhhhhhhhhhhhh===========>");

    let data = {
      name: name,
      cat_code: cat_code,
      no_of_product: +no_of_product,
      price: +price,
      catalogue_discount: +catalogue_discount,
      average_price: +average_price,
      // retail_discount: retail_discount,
      stitching:
        stitching === "true" ? true : stitching === "false" ? false : null,
      size: size === "true" ? true : size === "false" ? false : null,
      weight: +weight,
      meta_title: meta_title,
      meta_keyword: meta_keyword,
      meta_description: meta_description,
      desktopImage: desktopImage,
      mobileImage: "",
      description: description,
      // ...(category_id && {
      CatalogueCategory: {
        create: categoryConnection,
      },
      // }),
      ...(attributes &&
        attributes.length > 0 && {
          attributeValues: { create: attributeValueConnection },
        }),
      tag: tag,
      isActive,
    };

    catalogueMeta = data;
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
export default HandleChunkData;
export { postCatalogueChunk };
