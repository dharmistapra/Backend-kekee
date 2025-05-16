import prisma from "../../../db/config.js";
import csvtojson from "csvtojson";
import {
  arraySplit,
  deleteFile,
  getId,
  isNameRecordsExist,
  productsSku,
  removeProductImage,
  uniqueImage,
} from "../../../helper/common.js";
import slug from "slug";
import _, { select } from "underscore";
import {
  importCatalogue,
  importCatalogueSchema,
  importProductSchema,
} from "../../../schema/joi_schema.js";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import fastCsv from "fast-csv";
import sharp from "sharp";
import { connect } from "http2";

const cataloguesProductFields = [
  "category",
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
  "isActive",
  "showInSingle",
  "relatedProduct",
];
const importCatalogues = async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload csv file!" });

    let filePath = req.file.path;
    const jsonArray = await csvtojson().fromFile(req.file.path);
    let catalogues = [];
    let productArray = [];
    let errors = [];
    let catImage = [];
    let productImage = [];
    let additional_attr = [];
    const imageNames = new Set();
    const imagesToCheck = [];
    let uniqueImages = [];
    let message;

    for (let [index, row] of jsonArray.entries()) {
      let {
        category,
        productCode,
        productName,
        description,
        noOfProduct,
        quantity,
        catalogueItemMarketPrice,
        catalogueItemDiscount,
        retailPrice,
        retailDiscount,
        GST,
        metaTitle,
        metaKeyword,
        metaDescription,
        weight,
        tag,
        cat_image,
        image,
        isStitching,
        isSize,
        optionType,
        size,
        isActive,
        catCode,
        cat_tag,
        showInSingle,
        relatedProduct,
      } = row;
      index = index + 1;
      quantity = parseInt(quantity);
      if (!catCode && !productCode) {
        await deleteFile(filePath);
        message = `Row ${index} Please enter catCode or productCode!`;
        errors.push(message);
      }
      let attributes = [];
      let attributeValue = {};

      const keys = Object.keys(row);

      keys.forEach(async (value) => {
        if (!cataloguesProductFields.includes(value)) {
          attributeValue[value] = row[value];
          attributes.push(value);
        }
      });
      const isAttributeExists = await prisma.attributeMaster.findMany({
        where: { name: { in: attributes } },
        select: { id: true, name: true, isDefault: true },
      });

      const existingAttributes = isAttributeExists.map((cat) => cat.name);

      const isDefault = isAttributeExists.find(
        (val) => val.isDefault === false
      );

      const missingAttributes = attributes.filter(
        (val) => !existingAttributes.includes(val)
      );

      if (missingAttributes.length > 0) {
        await deleteFile(filePath);
        missingAttributes.forEach((val) => {
          if (!additional_attr.includes(val)) {
            additional_attr.push(val);
          }
        });

      }
      const nonDefaultAttributeNames = isAttributeExists
        .filter((attr) => !attr.isDefault)
        .map((attr) => attr.name);
      if (!category) {
        await deleteFile(filePath);
        message = `Row ${index} Please enter Category!`;
        errors.push(message);

      }
      let result;

      if (category) {
        let categories = await arraySplit(category);
        let Category = _.uniq(categories);

        result = await isNameRecordsExist(Category, "category");
        if (!result.exists) {
          await deleteFile(filePath);
          message = `Row ${index} contains ${result.missingNames} invalid Categories!`;
          errors.push(message);

        }
        category = result.existingIds;
        let missingAttributes = [];
        if (nonDefaultAttributeNames.length > 0) {
          for (const val of category) {
            const isExistingCategoryAttribute =
              await prisma.categoryAttribute.findMany({
                where: {
                  category_id: val,
                  attribute: { name: { in: nonDefaultAttributeNames } },
                },
                select: {
                  attribute: {
                    select: {
                      name: true,
                    },
                  },
                },
              });

            const existingAttributesNames = isExistingCategoryAttribute.map(
              (attr) => attr.attribute.name
            );
            const missing = nonDefaultAttributeNames.filter(
              (attr) => !existingAttributesNames.includes(attr)
            );
            if (missing.length > 0) {
              const categoryName = await prisma.categoryMaster.findUnique({
                where: { id: val },
                select: { name: true },
              });
              missingAttributes.push({
                category: categoryName?.name,
                attributes: missing,
              });
            }
          }
        }

        if (missingAttributes.length > 0) {
          await deleteFile(filePath);
          const formattedAttributes = missingAttributes
            .map(
              (item) =>
                `Category: "${item.category
                }", Missing Attributes: [${item.attributes.join(", ")}]`
            )
            .join("; ");

          message = `Row ${index} ${formattedAttributes} Some attribues are missing for certain categories!`;
          errors.push(message);
        }
      }
      
      let attributeData = [];
      if (attributes.length > 0 && Object.keys(attributeValue).length > 0) {
        const existingAttributes = await prisma.attributeMaster.findMany({
          where: {
            name: { in: attributes },
          },
          select: { id: true, name: true },
        });

        const attributeMap = {};
        existingAttributes.forEach(async (attr) => {
          attributeMap[attr.name] = attr.id;
        });

        for (const [key, values] of Object.entries(attributeValue)) {
          let attribute_id;

          if (attributeMap[key]) {
            attribute_id = attributeMap[key];
          }

          let valueIds = [];
          for (let val of [].concat(values)) {
            val = _.uniq(await arraySplit(val));

            for (const value of val) {
              if (value !== "") {
                let existingValue = await prisma.attributeValue.findFirst({
                  where: {
                    name: value,
                    attr_id: attribute_id,
                  },
                });

                if (!existingValue) {
                  await deleteFile(filePath);
                  message = `Row ${index} ${key} attribute have ${value} attributeValue are not exist!`;
                  errors.push(message);
                }

                valueIds.push(existingValue?.id);
                attributeData.push({
                  attribute_id: attribute_id || "",
                  attributeValue_id: existingValue?.id || "",
                });
              }
            }
          }
        }
      }
      cat_tag = _.uniq(await arraySplit(tag));
      let sizeDataWithIds = [];
      if (size) {
        let sizes = _.uniq(await arraySplit(size));
        let sizeError = [];
        const sizeEntries = sizes.map((entry) => {
          const [size, quantity, price] = entry.split("-");
          return {
            size,
            quantity: parseInt(quantity),
            price: parseFloat(price || 0),
          };
        });
        const validSizes = await prisma.size.findMany();
        const sizeMap = new Map(
          validSizes.map((size) => [size.value, size.id])
        );
        sizeDataWithIds = sizeEntries.map((entry) => {
          const sizeId = sizeMap.get(entry.size);
          if (!sizeId) {
            deleteFile(filePath);
            sizeError.push(entry.size);
          }
          return {
            id: sizeId || "",
            quantity: entry.quantity,
            price: entry.price,
          };
        });
        if (sizeError.length > 0) {
          message = `Row ${index} ${sizeError} In valid sizes!`;
          errors.push(message);
        }

        const totalSizeQuantity = sizeEntries.reduce(
          (sum, entry) => sum + entry.quantity,
          0
        );
        if (quantity !== totalSizeQuantity) {
          await deleteFile(filePath);
          message = `Row ${index} Total quantity of sizes ${totalSizeQuantity} does not match with quantity!`;
          errors.push(message);
        }
      }

      let catalogue = catalogues.find((cat) => cat.cat_code === catCode);
      if (catCode && !productCode) {
        if (catalogue) {
          message = `Row ${index} ${catCode} Catcode must be unique!`;
          errors.push(message);
        }

        let finalOfferPrice =
          parseFloat(catalogueItemMarketPrice) > 0 &&
            parseFloat(catalogueItemDiscount) > 0
            ? parseFloat(catalogueItemMarketPrice) *
            (1 - parseFloat(catalogueItemDiscount) / 100)
            : parseFloat(catalogueItemMarketPrice);

        let cat_url = `${slug(productName)}-${slug(catCode)}`;

        let average_price = parseFloat(finalOfferPrice) / parseInt(noOfProduct);

        let catalog = {
          ...(category.length > 0 && { category: category }),
          name: productName,
          cat_code: catCode,
          url: cat_url,
          no_of_product: parseInt(noOfProduct),
          price: parseFloat(catalogueItemMarketPrice),
          catalogue_discount: parseFloat(catalogueItemDiscount),
          average_price: parseFloat(average_price) || 0,
          offer_price: parseFloat(finalOfferPrice) || 0,
          weight: parseFloat(weight),
          quantity: quantity,
          GST: parseFloat(GST),
          meta_title: metaTitle,
          meta_keyword: metaKeyword,
          meta_description: metaDescription,
          description: description,
          ...(attributes.length > 0 && { attributes: attributeData }),
          tag: cat_tag,
          coverImage: cat_image,
          optionType: optionType,

          ...(size && sizeDataWithIds.length > 0 && { size: sizeDataWithIds }),
          ...(isActive && { isActive: isActive != "N" ? true : false }),
          product: [],
        };

        const catalogueschema = await importCatalogueSchema();
        const option = {
          abortEarly: false,
          allowUnknown: false,
        };
        const { error } = catalogueschema.validate(catalog, option);
        if (error) {
          await deleteFile(filePath);
          message = `Row ${index} ${error?.details[0].message}`;
          errors.push(message);
        }
        catalog.coverImage = `uploads/catalogue/${cat_image}`;

        if (!fs.existsSync(catalog.coverImage)) {
          await deleteFile(filePath);
          catImage.push(index);
        }
        catalogues.push(catalog);
      } else if (productCode) {
        const isSkuExists =
          catalogues.some((cat) =>
            cat.product.some((product) => product.sku === productCode)
          ) || productArray.some((product) => product.sku === productCode);

        if (isSkuExists) {
          await deleteFile(filePath);
          let message = `${productCode} Product Sku must be unique!`;
          errors.push(message);
        }
        if (relatedProduct) {
          let relatedProducts = await arraySplit(relatedProduct);
          const { status, message, data } = await productsSku(relatedProducts);
          if (!status) {
            await deleteFile(filePath);
            let messages = `Row ${index} ${message}`;
            errors.push(messages);
          }
          relatedProduct = data;
        }
        for (const images of image.split(",")) {
          if (imageNames.has(images)) {
            await deleteFile(filePath);
            imagesToCheck.push(images);
          }
          imageNames.add(images);
        }
        let product_image = image
          .split(",")
          .map((val) => `uploads/product/${val}`);

        let thumbImage = image
          .split(",")
          .map((val) => `uploads/product/thumb/${val}`);

        let mediumImage = image
          .split(",")
          .map((val) => `uploads/product/medium/${val}`);
        let finalOfferPrice = 0;
        if (showInSingle === "Y") {
          if (retailPrice > 0 && retailDiscount > 0) {
            finalOfferPrice =
              parseFloat(retailPrice) * (1 - parseFloat(retailDiscount) / 100);
          } else {
            finalOfferPrice = parseFloat(retailPrice);
          }
        } else if (catalogue) {
          finalOfferPrice = catalogue.average_price;
        }
        let url = `${slug(productName)}-${slug(productCode)}`;

        let product = {
          name: productName,
          sku: productCode,
          url: url,
          cat_code: catCode,
          quantity: quantity,
          ...(attributes.length > 0 && { attributes: attributeData }),
          weight: parseFloat(weight),
          average_price: catalogue ? catalogue.average_price : 0,
          retail_price: parseFloat(retailPrice),
          retail_GST: parseFloat(GST),
          retail_discount: parseFloat(retailDiscount),
          offer_price: parseFloat(finalOfferPrice) || 0,
          description: description,
          meta_title: metaTitle,
          meta_keyword: metaKeyword,
          meta_description: metaDescription,
          tag: cat_tag,
          ...(showInSingle && {
            showInSingle: showInSingle !== "N" ? true : false,
          }),
          image: image,
          optionType,
          ...(isActive && { isActive: isActive !== "N" ? true : false }),
          ...(size && sizeDataWithIds.length > 0 && { size: sizeDataWithIds }),
          // ...(isStitching && { stitching: isStitching !== "N" ? true : false }),
          ...(category.length > 0 && { category: category }),
          ...(relatedProduct &&
            relatedProduct.length > 0 && { relatedProduct: relatedProduct }),
        };

        let catalog = catalogues.find((cat) => cat.cat_code === catCode);
        const productSchema = await importProductSchema();
        const option = {
          abortEarly: false,
          allowUnknown: false,
        };
        const { error } = productSchema.validate(product, option);
        if (error) {
          await deleteFile(filePath);
          let messages = `Row ${index} ${error?.details.map(
            (item) => item.message
          )}`;
          errors.push(messages);
        }
        product.image = product_image;
        product.thumbImage = thumbImage;
        product.mediumImage = mediumImage;

        let images = product_image.filter((value) => !fs.existsSync(value));
        if (images.length > 0) {
          await deleteFile(filePath);
          productImage.push(index);
        }

        category.length > 0 &&
          (product["categories"] = {
            create: category.map((catId) => ({
              category: { connect: { id: catId } },
            })),
          });
        delete product["cat_code"];

        const isProductExists = await prisma.product.findFirst({
          where: { sku: product.sku },
        });

        let id = isProductExists?.id || null;
        const { isSuccess, message } = await uniqueImage(product.image, id);
        if (!isSuccess) {
          await deleteFile(filePath);
          let messages = `Row ${index} ${message}`;
          uniqueImages.push(messages);
        }
        if (catalog) {
          if (product.showInSingle !== true) {
            const sortSizes = (a, b) => a.size?.localeCompare(b.size);
            catalog?.size?.sort(sortSizes);
            product?.size?.sort(sortSizes);
            const catalogueJson = JSON.stringify(catalog?.size);
            const productJson = JSON.stringify(product?.size);
            if (catalogueJson !== productJson) {
              await deleteFile(filePath);
              let message = `Row ${index} catalogue size and product size not match!`;
              errors.push(message);
            }
          }

          if (product.optionType !== catalog.optionType) {
            await deleteFile(filePath);
            message = `Row ${index} Option type mismatch! Catalogue has '${catalog.optionType}', but Product has '${product.optionType}`;
            errors.push(message);
          }
          catalog.product.push(product);
        } else {
          productArray.push(product);
        }
      }


    }

    for (const cat of catalogues) {
      if (cat.no_of_product != cat.product.length) {
        await deleteFile(filePath);
        message = `${cat.cat_code} Catalogue of No of product not matched!`;
        errors.push(message);
      }
    }
    if (catImage.length > 0)
      errors.push(`Row ${catImage} cat_image files not exist!`);
    if (productImage.length > 0)
      errors.push(`Row ${productImage} product image file not exist!`);
    if (additional_attr.length > 0) {
      errors.push(`${additional_attr} attributes not found!`);
    }
    if (imagesToCheck.length > 0) {
      errors.push(`Duplicate image found: ${imagesToCheck}`);
    }
    if (uniqueImages.length > 0) {
      errors.push(uniqueImages);
    }
    if (errors.length > 0) {
      return res.status(400).json({ isSuccess: false, message: errors });
    }

    await prisma.$transaction(
      async (tx) => {
        if (catalogues.length > 0) {
          for (let catalogue of catalogues) {
            let category = catalogue.category;
            const products = catalogue.product;
            const attributeValueConnection = catalogue?.attributes;
            let catalogueSizeConnection = [];
            if (catalogue.optionType === "Size") {
              catalogueSizeConnection = catalogue?.size?.map((size) => ({
                size: { connect: { id: size.id } },
                price: size.price,
                quantity: size.quantity,
              }));
              catalogue["CatalogueSize"] = { create: catalogueSizeConnection };
            }

            delete catalogue.product;
            delete catalogue.category;
            delete catalogue.attributes;
            delete catalogue?.size;
            catalogue["deletedAt"] = null;

            if (category.length > 0) {
              catalogue.CatalogueCategory = {
                create: category.map((catId) => ({
                  category: { connect: { id: catId } },
                })),
              };
            }

            if (attributeValueConnection?.length > 0) {
              catalogue["attributeValues"] = {
                create: attributeValueConnection,
              };
            }

            const existingCatalogue = await tx.catalogue.findFirst({
              where: { cat_code: catalogue.cat_code },
              select: { id: true },
            });

            if (existingCatalogue) {
              await tx.CatalogueCategory.deleteMany({
                where: { catalogue: { id: existingCatalogue.id } },
              });

              await tx.catalogueAttributeValue.deleteMany({
                where: { catalogue: { id: existingCatalogue.id } },
              });

              await tx.catalogueSize.deleteMany({
                where: { catalogue: { id: existingCatalogue.id } },
              });

              let catCoverImage = await tx.catalogue.findMany({
                where: {
                  id: { not: existingCatalogue.id },
                  coverImage: existingCatalogue.coverImage,
                },
              });
              if (
                existingCatalogue.coverImage !== catalogue.coverImage &&
                catCoverImage.length === 0
              ) {
                await deleteFile(existingCatalogue.coverImage);
              }
            }

            let savedCatalogue = await tx.catalogue.upsert({
              where: existingCatalogue?.id
                ? { id: existingCatalogue?.id }
                : { url: catalogue.url },
              update: { ...catalogue },
              create: { ...catalogue },
            });

            const productUpserts = products.map(async (product) => {
              const attributeValueConnection = product.attributes;
              delete product.attributes;
              delete product.category;
              let productSizeConnection = [];
              let relatedProducts = [];
              if (product.optionType === "Size") {
                productSizeConnection = product.size.map((size) => ({
                  size: { connect: { id: size.id } },
                  price: size.price,
                  quantity: size.quantity,
                }));
                product["sizes"] = { create: productSizeConnection };
              }
              product["attributeValues"] = {
                create: attributeValueConnection,
              };
              if (product.relatedProduct && product.relatedProduct.length > 0) {
                relatedProducts = product.relatedProduct;
              }
              delete product?.size;
              delete product?.relatedProduct;

              const existingProduct = await tx.product.findFirst({
                where: { sku: product.sku },
                select: { id: true, image: true },
              });

              // let id = existingProduct?.id || null;
              // const { isSuccess, message } = await uniqueImage(
              //   product.image,
              //   id
              // );
              // if (!isSuccess) {
              //   await deleteFile(filePath);
              //   uniqueImages.push(message);
              //   // return res.status(400).json({ isSuccess, message });
              // }

              if (existingProduct) {
                await tx.productCategory.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });

                await tx.productAttributeValue.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });

                await tx.productSize.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });

                await tx.relatedProduct.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });

                let productImage = existingProduct.image.filter(
                  (value) => !product.image.includes(value)
                );

                if (productImage.length > 0) {
                  for (const value of productImage) {
                    const productData = await tx.product.findMany({
                      where: {
                        id: { not: existingProduct.id },
                        image: { has: value },
                      },
                    });
                    if (productData.length === 0) {
                      console.log(existingProduct, value);
                      await deleteFile(value);
                      await deleteFile(`uploads/product/thumb/${value}`);
                      await deleteFile(`uploads/product/medium/${value}`);
                    }
                  }
                }
              }

              // return;
              const savedProduct = await tx.product.upsert({
                where: { sku: product.sku },
                update: {
                  ...product,
                  // RelatedProduct:
                  //   relatedProducts.length > 0
                  //     ? { deleteMany: {}, create: relatedProducts }
                  //     : { deleteMany: {} },
                  catalogue_id: savedCatalogue.id,
                },
                create: {
                  ...product,
                  // ...(relatedProducts.length > 0 && {
                  //   relatedProduct: {
                  //     create: relatedProducts,
                  //   },
                  // }),
                  catalogue_id: savedCatalogue.id,
                },
              });

              if (relatedProducts.length > 0) {
                await tx.relatedProduct.createMany({
                  data: relatedProducts.map((relatedProductId) => ({
                    product_id: savedProduct.id, // Now we have the correct ID
                    relatedProduct_id: relatedProductId,
                  })),
                });
              }
              return savedProduct;
            });

            await Promise.all(productUpserts);
          }
        }

        if (productArray.length > 0) {
          const productUpserts = productArray.map(async (product) => {
            const attributeValueConnection = product?.attributes;
            delete product?.attributes;
            delete product.category;

            product["attributeValues"] = {
              create: attributeValueConnection,
            };

            let productSizeConnection = [];
            if (product.optionType === "Size") {
              productSizeConnection = product.size.map((size) => ({
                size: { connect: { id: size.id } },
                price: size.price,
                quantity: size.quantity,
              }));
              product["sizes"] = { create: productSizeConnection };
            }

            // if (product.relatedProduct && product.relatedProduct.length > 0) {
            //   product["RelatedProducts"] = {
            //     create: product.relatedProduct.map((productId) => ({
            //       connect: {
            //         relatedProduct: {
            //           id: productId,
            //         },
            //       },
            //     })),
            //   };
            // }
            const relatedProducts = product?.relatedProduct || [];
            delete product?.size;
            delete product?.relatedProduct;

            const existingProduct = await tx.product.findFirst({
              where: { sku: product.sku },
              select: { id: true, image: true },
            });

            if (existingProduct) {
              await tx.productCategory.deleteMany({
                where: { product: { sku: product.sku } },
              });

              await tx.productAttributeValue.deleteMany({
                where: { product: { sku: product.sku } },
              });

              await tx.productSize.deleteMany({
                where: { product: { sku: product.sku } },
              });

              await tx.relatedProduct.deleteMany({
                where: { product: { sku: product.sku } },
              });
              let productImage = existingProduct.image.filter(
                (value) => !product.image.includes(value)
              );

              if (productImage.length > 0) {
                for (const value of productImage) {
                  const productData = await tx.product.findMany({
                    where: {
                      id: { not: existingProduct.id },
                      image: { has: value },
                    },
                  });
                  if (productData.length === 0) {
                    console.log(existingProduct, value);
                    await deleteFile(value);
                    await deleteFile(`uploads/product/thumb/${value}`);
                    await deleteFile(`uploads/product/medium/${value}`);
                  }
                }
              }
            }

            const savedProduct = await tx.product.upsert({
              where: { sku: product.sku },
              update: { ...product, catalogue_id: null },
              create: { ...product, catalogue_id: null },
            });

            if (relatedProducts?.length > 0) {
              await tx.relatedProduct.createMany({
                data: relatedProducts.map((relatedProductId) => ({
                  product_id: savedProduct.id, // Now we have the correct ID
                  relatedProduct_id: relatedProductId,
                })),
              });
            }

            return savedProduct;
          });

          await Promise.all(productUpserts);
        }
      },
      { timeout: 60000 } // Increase transaction timeout to 20s
    );

    return res
      .status(200)
      .json({ isSuccess: true, message: "File imported successfully." });

  } catch (err) {
    console.log(err);
    next(err);
  }
};

const zipImages = async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload zip file!" });

    const zip = new AdmZip(req.file.path);
    const outPutDir = `./uploads/product/zip`;
    zip.extractAllTo(outPutDir, true);

    if (req.file) await deleteFile(req.file.path);

    const files = fs.readdir(outPutDir, async (err, files) => {
      if (err) return res.status(400).json({ isSuccess: false, message: err });

      files.forEach(async (file) => {
        let origionalImage = `uploads/product/zip/${file}`;

        let coverImages = file.toLowerCase().includes("cover");
        if (coverImages) {
          let coverImage = `uploads/catalogue/${file}`;
          fs.rename(origionalImage, coverImage, (err) => {
            if (err) {
              return res.status(400).json({ isSuccess: false, message: err });
            }
            console.log("successfully move file!");
          });
        } else {
          let productImage = `uploads/product/${file}`;
          const thumbImage = `uploads/product/thumb/${file}`;
          const mediumImage = `uploads/product/medium/${file}`;

          await sharp(origionalImage)
            .resize(200, 200, { fit: "inside" })
            .toFile(thumbImage);

          await sharp(origionalImage)
            .resize(300, 300, { fit: "inside" })
            .toFile(mediumImage);

          fs.rename(origionalImage, productImage, (err) => {
            if (err) {
              return res.status(400).json({ isSuccess: false, message: err });
            }
            console.log("successfully move file!");
          });
        }
      });
    });

    return res
      .status(200)
      .json({ isSuccess: true, message: "File upload successfully." });
  } catch (err) {
    console.log(err);
    const error = new Error("Some thing went wrong, please try again!");
    next(error);
  }
};

const exportCatalogue = async (req, res, next) => {
  try {
    let category_id = req.body.category_id || [];
    let filter = req.body.filter?.toLowerCase() || null;
    const catalogueData = await prisma.catalogue.findMany({
      where: {
        ...(category_id.length > 0 && {
          CatalogueCategory: {
            some: { category_id: { in: category_id } },
          },
        }),
        ...(filter !== null && {
          cat_code: { contains: filter, mode: "insensitive" },
        }),
      },
      include: {
        Product: {
          include: {
            attributeValues: {
              include: {
                attribute: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                attributeValue: {
                  select: {
                    id: true,
                    name: true,
                    value: true,
                    colour: true,
                  },
                },
              },
            },
            categories: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            RelatedProduct: {
              where: { related: { catalogue: { deletedAt: null } } },
              select: {
                related: {
                  select: {
                    id: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
        CatalogueCategory: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attributeValues: {
          select: {
            attribute: { select: { id: true, name: true } },
            attributeValue: { select: { id: true, name: true, value: true } },
          },
        },
      },
    });
    const productData = await prisma.product.findMany({
      where: {
        ...(filter === null && { catalogue_id: null }),
        ...(category_id.length > 0 && {
          categories: {
            some: {
              category_id: { in: category_id },
            },
          },
        }),
        ...(filter !== null && {
          sku: { contains: filter, mode: "insensitive" },
        }),
      },
      include: {
        attributeValues: {
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
              },
            },
            attributeValue: {
              select: {
                id: true,
                name: true,
                value: true,
                colour: true,
              },
            },
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        RelatedProduct: {
          where: { related: { catalogue: { deletedAt: null } } },
          select: {
            related: {
              select: {
                id: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    let products = [];
    let allAttributes = new Set();
    for (let catalogue of catalogueData) {
      let category = catalogue.CatalogueCategory.map(
        (value) => value.category.name
      );
      let attributes = [];
      catalogue.attributeValues.map((value) => {
        let isAttribute = Object.values(allAttributes).includes(
          value.attribute.name
        );
        if (attributes && attributes.length > 0) {
          let isAttributeExist = attributes.find(
            (val) => val.name === value.attribute.name
          );
          if (isAttributeExist) {
            isAttributeExist.value.push(value.attributeValue.name);
          } else {
            attributes.push({
              name: value.attribute.name,
              value: [value.attributeValue.name],
            });
          }
          !isAttribute && allAttributes.add(value.attribute.name);
        } else {
          attributes.push({
            name: value.attribute.name,
            value: [value.attributeValue.name],
          });
          !isAttribute && allAttributes.add(value.attribute.name);
        }
      });
      let catImage = path.basename(catalogue.coverImage);
      let data = {
        category: category.join(","),
        catCode: catalogue.cat_code,
        productCode: "",
        productName: catalogue.name,
        description: catalogue.description,
        noOfProduct: catalogue.no_of_product,
        quantity: catalogue.quantity,
        catalogueItemMarketPrice: catalogue.price,
        catalogueItemDiscount: catalogue.catalogue_discount,
        retailPrice: "",
        retailDiscount: "",
        GST: catalogue.GST,
        metaTitle: catalogue.meta_title,
        metaKeyword: catalogue.meta_keyword,
        metaDescription: catalogue.meta_description,
        weight: catalogue.weight,
        tag: catalogue.tag.join(","),
        cat_image: catImage,
        image: "",
        relatedProduct: "",
        optionType: catalogue.optionType,
        // isStitching: catalogue.stitching === true ? "Y" : "N",
        // isSize: catalogue.size === true ? "Y" : "N",
        isActive: catalogue.isActive === true ? "Y" : "N",
        showInSingle: "",
      };
      if (attributes.length > 0) {
        attributes.forEach((value) => {
          data[value.name] = value.value.join(",");
        });
      }
      products.push(data);
      if (catalogue.Product.length > 0) {
        for (const product of catalogue.Product) {
          let category = product.categories.map((value) => value.category.name);
          let attributes = [];
          product.attributeValues.map((value) => {
            let isAttribute = Object.values(allAttributes).includes(
              value.attribute.name
            );
            if (attributes && attributes.length > 0) {
              let isAttributeExist = attributes.find(
                (val) => val.name === value.attribute.name
              );
              if (isAttributeExist) {
                isAttributeExist.value.push(value.attributeValue.name);
              } else {
                attributes.push({
                  name: value.attribute.name,
                  value: [value.attributeValue.name],
                });
                !isAttribute && allAttributes.add(value.attribute.name);
              }
            } else {
              attributes.push({
                name: value.attribute.name,
                value: [value.attributeValue.name],
              });
              !isAttribute && allAttributes.add(value.attribute.name);
            }
          });

          const relatedProduct = product?.RelatedProduct.map(
            (item) => item.related.sku
          );
          const productImage = product.image.map((val) => path.basename(val));
          let data = {
            category: category.join(","),
            catCode: catalogue.cat_code,
            productCode: product.sku,
            productName: product.name,
            description: product.description,
            noOfProduct: "",
            quantity: product.quantity,
            catalogueItemMarketPrice: product.average_price,
            catalogueItemDiscount: catalogue.catalogue_discount,
            retailPrice: product.retail_price || "",
            retailDiscount: product.retail_discount || "",
            GST: product.retail_GST,
            metaTitle: product.meta_title,
            metaKeyword: product.meta_keyword,
            metaDescription: product.meta_description,
            weight: product.weight,
            tag: product.tag.join(","),
            cat_image: "",
            image: productImage.join(","),
            // isStitching: product.stitching === true ? "Y" : "N",
            // isSize: product.size === true ? "Y" : "N",
            relatedProduct:
              relatedProduct && relatedProduct.length > 0
                ? relatedProduct.join(",")
                : "",
            optionType: product.optionType,
            isActive: product.isActive === true ? "Y" : "N",
            showInSingle: product.showInSingle === true ? "Y" : "N",
          };
          if (attributes.length > 0) {
            attributes.forEach((value) => {
              data[value.name] = value.value.join(",");
            });
          }
          products.push(data);
        }
      }
    }

    if (productData.length > 0) {
      for (let product of productData) {
        const productExist = products.find(
          (val) => val.productCode === product.sku
        );
        if (!productExist) {
          let category = product.categories.map((value) => value.category.name);
          let attributes = [];
          product.attributeValues.map((value) => {
            let isAttribute = Object.values(allAttributes).includes(
              value.attribute.name
            );
            if (attributes && attributes.length > 0) {
              let isAttributeExist = attributes.find(
                (val) => val.name === value.attribute.name
              );
              if (isAttributeExist) {
                isAttributeExist.value.push(value.attributeValue.name);
              } else {
                attributes.push({
                  name: value.attribute.name,
                  value: [value.attributeValue.name],
                });
                !isAttribute && allAttributes.add(value.attribute.name);
              }
            } else {
              attributes.push({
                name: value.attribute.name,
                value: [value.attributeValue.name],
              });
              !isAttribute && allAttributes.add(value.attribute.name);
            }
          });

          const relatedProduct = product?.RelatedProduct.map(
            (item) => item.related.sku
          );
          const productImage = product.image.map((val) => path.basename(val));
          let data = {
            category: category.join(","),
            catCode: "",
            productCode: product.sku,
            productName: product.name,
            description: product.description,
            noOfProduct: "",
            quantity: product.quantity,
            catalogueItemMarketPrice: "",
            catalogueItemDiscount: "",
            retailPrice: product.retail_price,
            retailDiscount: product.retail_discount,
            GST: product.retail_GST,
            metaTitle: product.meta_title,
            metaKeyword: product.meta_keyword,
            metaDescription: product.meta_description,
            weight: product.weight,
            tag: product.tag.join(","),
            cat_image: "",
            image: productImage.join(","),
            relatedProduct:
              relatedProduct && relatedProduct.length > 0
                ? relatedProduct.join(",")
                : "",
            optionType: product.optionType,
            // isStitching: product.stitching === true ? "Y" : "N",
            // isSize: product.size === true ? "Y" : "N",
            isActive: product.isActive === true ? "Y" : "N",
            showInSingle: product.showInSingle === true ? "Y" : "N",
          };
          if (attributes.length > 0) {
            attributes.forEach((value) => {
              data[value.name] = value.value.join(",");
            });
          }
          products.push(data);
        }
      }
    }
    // let products = catalogueData.flatMap((catalogue) => {
    //   let formattedCatalogue = formatData(catalogue, true);
    //   let formattedProducts = catalogue.Product.map((product) =>
    //     formatData(product)
    //   );
    //   return [formattedCatalogue, ...formattedProducts];
    // });

    // products.push(...productData.map((product) => formatData(product)));
    cataloguesProductFields.push(...allAttributes);
    let csvHeaders = cataloguesProductFields;
    // const __dirname = path.resolve();
    // const csvFilePath = path.join(
    //   `${__dirname}/uploads/csv`,
    //   "cataloguedata.csv"
    // );
    // console.log(csvFilePath);
    // const ws = fs.createWriteStream(csvFilePath);

    // fastCsv
    //   .write(products, { headers: csvHeaders })
    //   .pipe(ws)
    //   .on("finish", () => {
    //     res.download(csvFilePath, "cataloguedata.csv", (err) => {
    //       if (err) {
    //         console.log(err);
    //         return res
    //           .status(500)
    //           .json({ isSuccess: false, message: "Error exporting CSV" });
    //       } else {
    //         console.log("File downloaded successfully.");
    //       }
    //     });
    //   });

    return res.status(200).json({
      isSuccess: true,
      message: "catalogue data get successfully.",
      data: { products, csvHeaders },
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const processAttributes = (attributeValues) => {
  return attributeValues.reduce((acc, { attribute, attributeValue }) => {
    let attr = acc.find((item) => item.name === attribute.name);
    if (attr) {
      attr.value.push(attributeValue.name);
    } else {
      acc.push({ name: attribute.name, value: [attributeValue.name] });
    }
    return acc;
  }, []);
};

const formatData = (item, isCatalogue = false) => {
  let category =
    item.CatalogueCategory?.map((v) => v.category.name) ||
    item.categories?.map((v) => v.category.name);
  let attributes = processAttributes(item.attributeValues || []);

  let data = {
    category: category.join(","),
    productName: item.name,
    ...(isCatalogue
      ? {
        catCode: item.cat_code,
        noOfProduct: item.no_of_product,
        catalogueItemMarketPrice: item.price,
        catalogueItemDiscount: item.catalogue_discount,
        GST: item.GST,
        cat_image: item.coverImage,
      }
      : {
        productCode: item.productCode || item.sku,
        catalogueItemMarketPrice: item.average_price || 0,
        catalogueItemDiscount: item.catalogue_discount || 0,
        retailPrice: item.retail_price,
        retailDiscount: item.retail_discount,
        GST: item.retail_GST,
        image: item.image.join(","),
        showInSingle: item.showInSingle ? "Y" : "N",
      }),
    description: item.description,
    quantity: item.quantity,
    metaTitle: item.meta_title,
    metaKeyword: item.meta_keyword,
    metaDescription: item.meta_description,
    weight: item.weight,
    tag: item.tag.join(","),
    isStitching: item.stitching ? "Y" : "N",
    isSize: item.size ? "Y" : "N",
    isActive: item.isActive ? "Y" : "N",
  };

  attributes.forEach((attr) => {
    data[attr.name] = attr.value.join(",");
  });
  return data;
};

export {
  //  importCatalogue,
  importCatalogues,
  zipImages,
  exportCatalogue,
};
