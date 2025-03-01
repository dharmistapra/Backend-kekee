import prisma from "../../../db/config.js";
import csvtojson from "csvtojson";
import {
  arraySplit,
  cataloguesProductFields,
  deleteFile,
  getId,
  isNameRecordsExist,
} from "../../../helper/common.js";
import slug from "slug";
import _ from "underscore";
import {
  importCatalogue,
  importCatalogueSchema,
  importProductSchema,
} from "../../../schema/joi_schema.js";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import fastCsv from "fast-csv";
import { Parser } from "json2csv";

// const importCatalogue = async (req, res, next) => {
//   try {
//     if (!req.file)
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Please upload file" });
//     importFile(req.file.path);
//     async function importFile(filePath) {
//       const jsonArray = await csvtojson().fromFile(filePath);
//       let catalogues = [];
//       let productArray = [];

//       for (let row of jsonArray) {
//         let {
//           category,
//           collection,
//           cat_name,
//           cat_code,
//           no_of_product,
//           cat_tag,
//         } = row;
//         let attributes = [];
//         let attributeValue = {};

//         const keys = Object.keys(row);

//         keys.map((value) => {
//           if (!cataloguesProductFields.includes(value)) {
//             attributeValue[value] = row[value];
//             attributes.push(value);
//           }
//         });

//         const isAttributeExists = await prisma.attributeMaster.findMany({
//           where: { name: { in: attributes } },
//           select: { id: true, name: true, isDefault: true },
//         });

//         const existingAttributes = isAttributeExists.map((cat) => cat.name);

//         const isDefault = isAttributeExists.find(
//           (val) => val.isDefault === false
//         );

//         const attribute = attributes.filter(
//           (val) => !existingAttributes.includes(val)
//         );

//         if (attribute.length > 0) {
//           await deleteFile(filePath);
//           return res.status(404).json({
//             isSuccess: false,
//             message: `${attribute} attributes not found!`,
//           });
//         }
//         const nonDefaultAttributeNames = isAttributeExists
//           .filter((attr) => !attr.isDefault)
//           .map((attr) => attr.name);

//         if (!category && !collection) {
//           await deleteFile(filePath);
//           return res.status(400).json({
//             isSuccess: false,
//             message: "Please enter Category or collection!",
//           });
//         }
//         let isRecordExists = false;

//         if (category) {
//           let categories = await arraySplit(category);
//           let Category = _.uniq(categories);
//           isRecordExists = await isNameRecordsExist(Category, "category");
//           if (!isRecordExists) {
//             await deleteFile(filePath);
//             return res
//               .status(400)
//               .json({ isSuccess: false, message: "InValid Categories!" });
//           }
//           category = await getId(categories, "category");
//           if (category.length === 0) {
//             await deleteFile(filePath);
//             return res
//               .status(400)
//               .json({ isSuccess: false, message: "Invalid Categories!" });
//           }

//           let missingAttributes = [];
//           if (nonDefaultAttributeNames.length > 0) {
//             for (const val of category) {
//               const isExistingCategoryAttribute =
//                 await prisma.categoryAttribute.findMany({
//                   where: {
//                     category_id: val,
//                     attribute: { name: { in: nonDefaultAttributeNames } },
//                   },
//                   select: {
//                     attribute: {
//                       select: {
//                         name: true,
//                       },
//                     },
//                   },
//                 });

//               const existingAttributesNames = isExistingCategoryAttribute.map(
//                 (attr) => attr.attribute.name
//               );
//               const missing = attributes.filter(
//                 (attr) => !existingAttributesNames.includes(attr)
//               );
//               if (missing.length > 0) {
//                 const categoryName = await prisma.categoryMaster.findUnique({
//                   where: { id: val },
//                   select: { name: true },
//                 });
//                 missingAttributes.push({
//                   category: categoryName?.name,
//                   attributes: missing,
//                 });

//                 if (missingAttributes.length > 0) {
//                   await deleteFile(filePath);
//                   return res.status(400).json({
//                     isSuccess: false,
//                     message:
//                       "Some attribues are missing for certain categories!",
//                     data: missingAttributes,
//                   });
//                 }
//               }
//             }
//           }
//         }

//         if (collection) {
//           let collections = await arraySplit(collection);
//           let Collection = _.unique(collections);
//           isRecordExists = await isNameRecordsExist(Collection, "collection");
//           if (!isRecordExists) {
//             await deleteFile(filePath);
//             return res
//               .status(400)
//               .json({ isSuccess: false, message: "InValid Collections!" });
//           }
//           collection = await getId(collections, "collection");
//           if (collection.length === 0) {
//             await deleteFile(filePath);
//             return res
//               .status(400)
//               .json({ isSuccess: false, message: "Invalid Collections!" });
//           }
//         }
//         let attributeData = [];
//         if (attributes.length > 0 && Object.keys(attributeValue).length > 0) {
//           const existingAttributes = await prisma.attributeMaster.findMany({
//             where: {
//               name: { in: attributes },
//             },
//             select: { id: true, type: true, name: true },
//           });

//           // Map existing attributes to a lookup object
//           const attributeMap = {};
//           let colorAttribute = [];
//           existingAttributes.forEach((attr) => {
//             attributeMap[attr.name] = attr.id;
//             if (attr.type === "Colour") colorAttribute.push(attr.id);
//           });

//           // Loop through attributeValue to construct response
//           for (const [key, values] of Object.entries(attributeValue)) {
//             let attribute_id;

//             // If attribute exists, use the ID
//             if (attributeMap[key]) {
//               attribute_id = attributeMap[key];
//             }
//             //  else {
//             //   // If not, create a new attribute and store its ID
//             //   const newAttribute = await prisma.attributeMaster.create({
//             //     data: { name: key },
//             //   });
//             //   attribute_id = newAttribute.id;
//             // }

//             // Fetch or create attribute values
//             let valueIds = [];
//             for (let val of [].concat(values)) {
//               val = _.uniq(await arraySplit(val));
//               console.log(val);
//               // Ensure values are in array format
//               for (const value of val) {
//                 if (value !== "") {
//                   let existingValue = await prisma.attributeValue.findFirst({
//                     where: {
//                       name: value,
//                       attr_id: attribute_id,
//                       value: slug(value),
//                     },
//                   });

//                   if (!existingValue) {
//                     // Create value if it doesn't exist
//                     if (colorAttribute.length > 0) {
//                       if (colorAttribute.includes(attribute_id)) {
//                         console.log(value);
//                         let color = colors[value];
//                         console.log(color);
//                         return;
//                       }
//                     }
//                     existingValue = await prisma.attributeValue.create({
//                       data: {
//                         name: value,
//                         attr_id: attribute_id,
//                         value: slug(value),
//                       },
//                     });
//                   }

//                   valueIds.push(existingValue.id);
//                   attributeData.push({
//                     attribute_id,
//                     attributeValue_id: existingValue.id,
//                   });
//                 }

//                 // Push final data to array
//                 // attributeData.push({
//                 //   attribute_id,
//                 //   attributeValue: valueIds,
//                 // });
//               }
//             }
//           }
//         }
//         console.log(attributeData);
//         cat_tag = _.uniq(await arraySplit(cat_tag));
//         let catalogue = catalogues.find((cat) => cat.cat_code === cat_code);
//         if (cat_name) {
//           let finalOfferPrice = parseFloat(row.cat_offer_price)
//             ? parseFloat(row.cat_offer_price)
//             : parseFloat(row.cat_price) > 0 && parseFloat(row.cat_discount) > 0
//             ? parseFloat(row.cat_price) *
//               (1 - parseFloat(row.cat_discount) / 100)
//             : parseFloat(row.cat_price);

//           let cat_url = `${slug(cat_name)}-${cat_code}`;

//           if (!catalogue) {
//             let catalog = {
//               ...(category.length > 0 && { category: category }),
//               ...(collection.length > 0 && { collection: collection }),
//               name: cat_name,
//               cat_code: cat_code,
//               url: cat_url,
//               no_of_product: parseInt(no_of_product),
//               price: parseFloat(row.cat_price),
//               catalogue_discount: parseFloat(row.cat_discount),
//               average_price: parseFloat(row.cat_average_price),
//               offer_price: parseFloat(finalOfferPrice),
//               weight: parseFloat(row.cat_weight),
//               quantity: parseInt(row.cat_quantity),
//               GST: parseFloat(row.cat_gst),
//               meta_title: row.cat_meta_title,
//               meta_keyword: row.cat_meta_keyword,
//               meta_description: row.cat_meta_description,
//               description: row.cat_description,
//               ...(attributes.length > 0 && { attributes: attributeData }),
//               tag: cat_tag,
//               coverImage: `uploads/catalogue/${row.cat_coverImage}`,
//               stitching: row.cat_isStitching != "N" ? true : false,
//               size: row.cat_isSize != "N" ? true : false,
//               isActive: row.isActive != "N" ? true : false,
//               product: [],
//             };

//             const catalogueschema = await importCatalogueSchema();
//             const { error } = catalogueschema.validate(catalog);
//             if (error) {
//               await deleteFile(filePath);
//               return res
//                 .status(400)
//                 .json({ isSuccess: false, message: error?.details[0].message });
//             }
//             catalogues.push(catalog);
//           }
//         }
//         const isSkuExists =
//           catalogues.some((cat) =>
//             cat.product.some((product) => product.sku === row.product_sku)
//           ) || productArray.some((product) => product.sku === row.product_sku);

//         if (isSkuExists) {
//           await deleteFile(filePath);
//           return res.status(400).json({
//             isSuccess: false,
//             message: "Product Sku must be unique!",
//           });
//         }

//         let product_image = row.product_image.split(",");
//         row.product_image = product_image.map((val) => {
//           return `uploads/product/${val}`;
//         });
//         let finalOfferPrice = 0;
//         if (row.product_showInSingle === true) {
//           if (row.product_retail_price > 0 && row.product_retail_discount > 0) {
//             finalOfferPrice = row.product_offer_price
//               ? parseFloat(row.product_offer_price)
//               : parseFloat(row.product_retail_price) *
//                 (1 - parseFloat(row.product_retail_discount) / 100);
//           } else {
//             finalOfferPrice = row.product_offer_price
//               ? parseFloat(row.product_offer_price)
//               : parseFloat(row.product_retail_price);
//           }
//         }

//         let url = `${slug(row.productName)}-${row.product_sku}`;
//         row.product_tags = await arraySplit(row.product_tags);
//         let tags = _.uniq(row.product_tags);

//         let product = {
//           name: row.productName,
//           sku: row.product_sku,
//           url: url,
//           quantity: parseInt(row.product_quantity),
//           ...(attributes.length > 0 && { attributes: attributeData }),
//           weight: parseFloat(row.product_weight),
//           average_price: catalogue ? parseFloat(catalogue.average_price) : 0,
//           retail_price: parseFloat(row.product_retail_price),
//           retail_GST: parseFloat(row.product_retail_GST),
//           retail_discount: parseFloat(row.product_retail_discount),
//           offer_price: parseFloat(finalOfferPrice),
//           description: row.product_description,
//           tag: tags,
//           showInSingle: row.product_showInSingle !== "N" ? true : false,
//           readyToShip: row.product_readyToShip !== "N" ? true : false,
//           image: row.product_image,
//           isActive: row.product_isActive !== "N" ? true : false,
//           stitching: row.product_isStitching !== "N" ? true : false,
//           ...(collection.length > 0 && { collection: collection }),
//           ...(category.length > 0 && { category: category }),
//         };

//         let catalog = catalogues.find((cat) => cat.cat_code === cat_code);

//         const productSchema = await importProductSchema();
//         const { error } = productSchema.validate(product);
//         if (error) {
//           await deleteFile(filePath);
//           return res
//             .status(400)
//             .json({ isSuccess: false, message: error?.details[0].message });
//         }

//         category.length > 0 &&
//           (product["categories"] = {
//             create: category.map((catId) => ({
//               category: { connect: { id: catId } },
//             })),
//           });

//         if (catalog) {
//           catalog.product.push(product);
//         } else {
//           productArray.push(product);
//         }
//       }

//       for (const cat of catalogues) {
//         if (cat.no_of_product != cat.product.length) {
//           await deleteFile(filePath);
//           return res.status(400).json({
//             isSuccess: false,
//             message: `${cat.cat_code} Catalogue of No of product not matched!`,
//           });
//         }
//       }

//       await prisma.$transaction(async (tx) => {
//         if (catalogues.length > 0) {
//           for (let catalogue of catalogues) {
//             let collection = catalogue.collection;
//             let category = catalogue.category;
//             const products = catalogue.product;
//             const attributeValueConnection = catalogue.attributes;
//             delete catalogue.collection;
//             delete catalogue.product;
//             delete catalogue.category;
//             delete catalogue.attributes;
//             category.length > 0 &&
//               (catalogue.CatalogueCategory = {
//                 create: category.map((catId) => ({
//                   category: { connect: { id: catId } },
//                 })),
//               });

//             attributeValueConnection.length > 0 &&
//               (catalogue["attributeValues"] = {
//                 create: attributeValueConnection,
//               });

//             const existingCatalogue = await tx.catalogue.findFirst({
//               where: { cat_code: catalogue.cat_code },
//               select: { id: true },
//             });

//             if (existingCatalogue) {
//               await tx.CatalogueCategory.deleteMany({
//                 where: { catalogue: { id: existingCatalogue.id } },
//               });

//               await tx.catalogueAttributeValue.deleteMany({
//                 where: { catalogue: { id: existingCatalogue.id } },
//               });
//             }

//             let savedCatalogue = await tx.catalogue.upsert({
//               where: existingCatalogue?.id
//                 ? { id: existingCatalogue?.id }
//                 : { url: catalogue.url },

//               update: { ...catalogue },
//               create: { ...catalogue },
//             });

//             await tx.catalogueCollection.deleteMany({
//               where: { catalogue_id: savedCatalogue.id },
//             });
//             if (collection && collection.length > 0) {
//               await tx.catalogueCollection.createMany({
//                 data: collection.map((collection) => ({
//                   catalogue_id: savedCatalogue.id,
//                   collection_id: collection,
//                   product_id: null,
//                 })),
//               });
//             }

//             for (let product of products) {
//               const attributeValueConnection = product.attributes;
//               // const category = product.category;
//               delete product.collection;
//               delete product.attributes;
//               delete product.category;

//               // category.length > 0 &&
//               //   (product["categories"] = {
//               //     create: category.map((catId) => ({
//               //       category: { connect: { id: catId } },
//               //     })),
//               //   });

//               product["attributeValues"] = {
//                 create: attributeValueConnection,
//               };

//               console.log(product);

//               const existingProduct = await tx.product.findFirst({
//                 where: { sku: product.sku },
//                 select: { id: true },
//               });

//               if (existingProduct) {
//                 await tx.productCategory.deleteMany({
//                   where: { product: { id: existingProduct.id } },
//                 });

//                 await tx.productAttributeValue.deleteMany({
//                   where: { product: { id: existingProduct.id } },
//                 });
//               }

//               let products = await tx.product.upsert({
//                 where: { sku: product.sku },
//                 update: { ...product, catalogue_id: savedCatalogue.id },
//                 create: { ...product, catalogue_id: savedCatalogue.id },
//               });

//               await tx.catalogueCollection.deleteMany({
//                 where: { product_id: products.id },
//               });

//               if (collection && collection.length > 0) {
//                 await tx.catalogueCollection.createMany({
//                   data: collection.map((collection) => ({
//                     catalogue_id: null,
//                     collection_id: collection,
//                     product_id: products.id,
//                   })),
//                 });
//               }
//             }
//           }
//         }

//         if (productArray.length > 0) {
//           for (let product of productArray) {
//             const attributeValueConnection = product.attributes;
//             let collection = product.collection;
//             delete product.collection;
//             delete product.attributes;
//             delete product.category;

//             product["attributeValues"] = {
//               create: attributeValueConnection,
//             };

//             await tx.productCategory.deleteMany({
//               where: { product: { sku: product.sku } },
//             });

//             await tx.productAttributeValue.deleteMany({
//               where: { product: { sku: product.sku } },
//             });

//             const products = await tx.product.upsert({
//               where: { sku: product.sku },
//               update: { ...product, catalogue_id: null },
//               create: { ...product, catalogue_id: null },
//             });

//             await tx.catalogueCollection.deleteMany({
//               where: { product_id: products.id },
//             });
//             if (collection && collection.length > 0) {
//               await tx.catalogueCollection.createMany({
//                 data: collection.map((collection) => ({
//                   catalogue_id: null,
//                   collection_id: collection,
//                   product_id: products.id,
//                 })),
//               });
//             }
//           }
//         }
//       });
//       return res
//         .status(200)
//         .json({ isSuccess: true, message: "File imported successfully." });
//     }
//   } catch (err) {
//     console.log(err);
//     next(err);
//   }
// };

const importCatalogues = async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload file" });

    let filePath = req.file.path;
    // importFile(req.file.path);
    // async function importFile(filePath) {
    const jsonArray = await csvtojson().fromFile(req.file.path);
    let catalogues = [];
    let productArray = [];
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
        isActive,
        catCode,
        cat_tag,
        showInSingle,
      } = row;
      index = index + 1;
      if (!catCode && !productCode) {
        return res.status(400).json({
          isSuccess: false,
          message: `Row ${index} Please enter catCode or productCode!`,
        });
      }
      let attributes = [];
      let attributeValue = {};

      const keys = Object.keys(row);

      keys.map((value) => {
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
        return res.status(404).json({
          isSuccess: false,
          message: `Row ${index} ${missingAttributes} attributes not found!`,
        });
      }
      const nonDefaultAttributeNames = isAttributeExists
        .filter((attr) => !attr.isDefault)
        .map((attr) => attr.name);

      if (!category) {
        await deleteFile(filePath);
        return res.status(400).json({
          isSuccess: false,
          message: `Row ${index} Please enter Category!`,
        });
      }
      let result;

      if (category) {
        let categories = await arraySplit(category);
        let Category = _.uniq(categories);

        result = await isNameRecordsExist(Category, "category");
        if (!result.exists) {
          // if (!isRecordExists)
          await deleteFile(filePath);
          return res.status(400).json({
            isSuccess: false,
            message: `Row ${index} contains ${result.missingNames} invalid Categories!`,
          });
        }
        category = result.existingIds;

        // category = await getId(categories, "category");
        if (category.length === 0) {
          await deleteFile(filePath);
          return res.status(400).json({
            isSuccess: false,
            message: `Row ${index} contains invalid Categories!`,
          });
        }

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
            const missing = attributes.filter(
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

              if (missingAttributes.length > 0) {
                await deleteFile(filePath);
                return res.status(400).json({
                  isSuccess: false,
                  message: "Some attribues are missing for certain categories!",
                  data: missingAttributes,
                });
              }
            }
          }
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
        existingAttributes.forEach((attr) => {
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
                  return res.status(404).json({
                    isSuccess: false,
                    message: `Row ${index} ${key} attribute have ${value} attributeValue are not exist!`,
                  });
                }

                valueIds.push(existingValue.id);
                attributeData.push({
                  attribute_id,
                  attributeValue_id: existingValue.id,
                });
              }
            }
          }
        }
      }
      cat_tag = _.uniq(await arraySplit(tag));

      let catalogue = catalogues.find((cat) => cat.cat_code === catCode);
      if (catCode && !productCode) {
        if (catalogue) {
          return res.status(400).json({
            isSuccess: false,
            message: `Row ${index} ${catCode} Catcode must be unique! `,
          });
        }
        let finalOfferPrice =
          parseFloat(catalogueItemMarketPrice) > 0 &&
            parseFloat(catalogueItemDiscount) > 0
            ? parseFloat(catalogueItemMarketPrice) *
            (1 - parseFloat(catalogueItemDiscount) / 100)
            : parseFloat(catalogueItemMarketPrice);

        let cat_url = `${slug(productName)}-${catCode}`;

        let average_price = parseFloat(finalOfferPrice) / parseInt(noOfProduct);

        let catalog = {
          ...(category.length > 0 && { category: category }),
          name: productName,
          cat_code: catCode,
          url: cat_url,
          no_of_product: parseInt(noOfProduct),
          price: parseFloat(catalogueItemMarketPrice),
          catalogue_discount: parseFloat(catalogueItemDiscount),
          average_price: parseFloat(average_price),
          offer_price: parseFloat(finalOfferPrice),
          weight: parseFloat(weight),
          quantity: parseInt(quantity),
          GST: parseFloat(GST),
          meta_title: metaTitle,
          meta_keyword: metaKeyword,
          meta_description: metaDescription,
          description: description,
          ...(attributes.length > 0 && { attributes: attributeData }),
          tag: cat_tag,
          coverImage: `uploads/catalogue/${cat_image}`,
          stitching: isStitching != "N" ? true : false,
          size: isSize != "N" ? true : false,
          isActive: isActive != "N" ? true : false,
          product: [],
        };

        const catalogueschema = await importCatalogueSchema();
        const { error } = catalogueschema.validate(catalog);
        if (error) {
          await deleteFile(filePath);
          return res
            .status(400)
            .json({ isSuccess: false, message: error?.details[0].message });
        }
        catalogues.push(catalog);
      } else if (productCode) {
        const isSkuExists =
          catalogues.some((cat) =>
            cat.product.some((product) => product.sku === productCode)
          ) || productArray.some((product) => product.sku === productCode);

        if (isSkuExists) {
          await deleteFile(filePath);
          return res.status(400).json({
            isSuccess: false,
            message: `${productCode} Product Sku must be unique!`,
          });
        }

        let product_image = image
          .split(",")
          .map((val) => `uploads/product/${val}`);
        // image = product_image.map((val) => {
        //   return `uploads/product/${val}`;
        // });
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
        let url = `${slug(productName)}-${productCode}`;

        let product = {
          name: productName,
          sku: productCode,
          url: url,
          quantity: parseInt(quantity),
          ...(attributes.length > 0 && { attributes: attributeData }),
          weight: parseFloat(weight),
          average_price: catalogue ? catalogue.average_price : 0,
          retail_price: parseFloat(retailPrice),
          retail_GST: parseFloat(GST),
          retail_discount: parseFloat(retailDiscount),
          offer_price: parseFloat(finalOfferPrice),
          description: description,
          meta_title: metaTitle,
          meta_keyword: metaKeyword,
          meta_description: metaDescription,
          tag: cat_tag,
          showInSingle: showInSingle !== "N" ? true : false,
          image: product_image,
          isActive: isActive !== "N" ? true : false,
          stitching: isStitching !== "N" ? true : false,
          ...(category.length > 0 && { category: category }),
        };

        let catalog = catalogues.find((cat) => cat.cat_code === catCode);

        const productSchema = await importProductSchema();
        const { error } = productSchema.validate(product);
        if (error) {
          await deleteFile(filePath);
          return res
            .status(400)
            .json({ isSuccess: false, message: error?.details[0].message });
        }

        category.length > 0 &&
          (product["categories"] = {
            create: category.map((catId) => ({
              category: { connect: { id: catId } },
            })),
          });

        if (catalog) {
          catalog.product.push(product);
        } else {
          productArray.push(product);
        }
      }
    }

    for (const cat of catalogues) {
      if (cat.no_of_product != cat.product.length) {
        await deleteFile(filePath);
        return res.status(400).json({
          isSuccess: false,
          message: `${cat.cat_code} Catalogue of No of product not matched!`,
        });
      }
    }

    await prisma.$transaction(
      async (tx) => {
        if (catalogues.length > 0) {
          for (let catalogue of catalogues) {
            let category = catalogue.category;
            const products = catalogue.product;
            const attributeValueConnection = catalogue?.attributes;

            delete catalogue.product;
            delete catalogue.category;
            delete catalogue.attributes;
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

              product["attributeValues"] = {
                create: attributeValueConnection,
              };

              const existingProduct = await tx.product.findFirst({
                where: { sku: product.sku },
                select: { id: true },
              });

              if (existingProduct) {
                await tx.productCategory.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });

                await tx.productAttributeValue.deleteMany({
                  where: { product: { id: existingProduct.id } },
                });
              }

              return tx.product.upsert({
                where: { sku: product.sku },
                update: { ...product, catalogue_id: savedCatalogue.id },
                create: { ...product, catalogue_id: savedCatalogue.id },
              });
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

            await tx.productCategory.deleteMany({
              where: { product: { sku: product.sku } },
            });

            await tx.productAttributeValue.deleteMany({
              where: { product: { sku: product.sku } },
            });

            return tx.product.upsert({
              where: { sku: product.sku },
              update: { ...product, catalogue_id: null },
              create: { ...product, catalogue_id: null },
            });
          });

          await Promise.all(productUpserts);
        }
      },
      { timeout: 20000 } // Increase transaction timeout to 20s
    );

    // await prisma.$transaction(async (tx) => {
    //   if (catalogues.length > 0) {
    //     for (let catalogue of catalogues) {
    //       let category = catalogue.category;
    //       const products = catalogue.product;
    //       const attributeValueConnection = catalogue?.attributes;
    //       delete catalogue.product;
    //       delete catalogue.category;
    //       delete catalogue.attributes;
    //       catalogue["deletedAt"] = null;
    //       category.length > 0 &&
    //         (catalogue.CatalogueCategory = {
    //           create: category.map((catId) => ({
    //             category: { connect: { id: catId } },
    //           })),
    //         });

    //       attributeValueConnection?.length > 0 &&
    //         (catalogue["attributeValues"] = {
    //           create: attributeValueConnection,
    //         });

    //       const existingCatalogue = await tx.catalogue.findFirst({
    //         where: { cat_code: catalogue.cat_code },
    //         select: { id: true },
    //       });

    //       if (existingCatalogue) {
    //         await tx.CatalogueCategory.deleteMany({
    //           where: { catalogue: { id: existingCatalogue.id } },
    //         });

    //         await tx.catalogueAttributeValue.deleteMany({
    //           where: { catalogue: { id: existingCatalogue.id } },
    //         });
    //       }

    //       let savedCatalogue = await tx.catalogue.upsert({
    //         where: existingCatalogue?.id
    //           ? { id: existingCatalogue?.id }
    //           : { url: catalogue.url },

    //         update: { ...catalogue },
    //         create: { ...catalogue },
    //       });

    //       for (let product of products) {
    //         const attributeValueConnection = product.attributes;
    //         delete product.attributes;
    //         delete product.category;

    //         product["attributeValues"] = {
    //           create: attributeValueConnection,
    //         };
    //         const existingProduct = await tx.product.findFirst({
    //           where: { sku: product.sku },
    //           select: { id: true },
    //         });

    //         if (existingProduct) {
    //           await tx.productCategory.deleteMany({
    //             where: { product: { id: existingProduct.id } },
    //           });

    //           await tx.productAttributeValue.deleteMany({
    //             where: { product: { id: existingProduct.id } },
    //           });
    //         }

    //         await Promise.all(products.map(product => tx.product.upsert({
    //           where: { sku: product.sku },
    //           update: { ...product, catalogue_id: savedCatalogue.id },
    //           create: { ...product, catalogue_id: savedCatalogue.id },
    //         })));

    //         // let products = await tx.product.upsert({
    //         //   where: { sku: product.sku },
    //         //   update: { ...product, catalogue_id: savedCatalogue.id },
    //         //   create: { ...product, catalogue_id: savedCatalogue.id },
    //         // });
    //       }
    //     }
    //   }

    //   if (productArray.length > 0) {
    //     for (let product of productArray) {
    //       const attributeValueConnection = product?.attributes;
    //       delete product?.attributes;
    //       delete product.category;

    //       product["attributeValues"] = {
    //         create: attributeValueConnection,
    //       };

    //       await tx.productCategory.deleteMany({
    //         where: { product: { sku: product.sku } },
    //       });

    //       await tx.productAttributeValue.deleteMany({
    //         where: { product: { sku: product.sku } },
    //       });

    //       const products = await tx.product.upsert({
    //         where: { sku: product.sku },
    //         update: { ...product, catalogue_id: null },
    //         create: { ...product, catalogue_id: null },
    //       });
    //     }
    //   }
    // });
    return res
      .status(200)
      .json({ isSuccess: true, message: "File imported successfully." });
    // }
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
    const { category_id } = req.query;

    const category_ids = category_id.split(",");
    const catalogueData = await prisma.catalogue.findMany({
      where: {
        CatalogueCategory: {
          some: { category_id: { in: category_ids } },
        },
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
        CatalogueCategory: {
          some: {
            category: { id: category_id },
          },
        },
      },
      where: { catalogue_id: null },
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
        isStitching: catalogue.stitching === true ? "Y" : "N",
        isSize: catalogue.size === true ? "Y" : "N",
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
            isStitching: product.stitching === true ? "Y" : "N",
            isSize: product.size === true ? "Y" : "N",
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
          isStitching: product.stitching === true ? "Y" : "N",
          isSize: product.size === true ? "Y" : "N",
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
