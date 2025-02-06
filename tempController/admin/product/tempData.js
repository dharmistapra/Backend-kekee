import slug from "slug";
import prisma from "../../../db/config.js";
import {
  convertFilePathSlashes,
  handleProductAttributeConnection,
  handleProductConnection,
  removeProductImage,
} from "../../../helper/common.js";
import { productSchema } from "../../../schema/joi_schema.js";
import { promises as fs } from "fs";
import path from "path";

const arrayProducts = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    const imagePaths = await Promise.all(
      req.files.map(async (file) => convertFilePathSlashes(file?.path))
    );

    let {
      id,
      name,
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
      // category_id,
      attributes,
      colour_id,
      readyToShip,
    } = req.body;

    attributes = attributes.map((jsonString) => JSON.parse(jsonString));
    req.body.attributes = attributes;

    let products = await readProductsFromFile();

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

    url = `${slug(name)}-${sku}`;

    const indexProduct = await products.filter(
      (val) => val.cat_code === cat_code
    );
    const productData = {
      id: id ? parseInt(id) : indexProduct.length + 1,
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
      showInSingle,
      readyToShip,
      image: imagePaths,
    };
    // let categoryConnection = [];
    // if (category_id) {
    //   const { status, message } = await handleProductConnection(
    //     "category",
    //     category_id,
    //     imagePaths
    //   );
    //   if (!status)
    //     return res.status(400).json({
    //       isSuccess: status,
    //       message: message,
    //     });
    //   categoryConnection = category_id.map((catId) => ({
    //     category: { connect: { id: catId } },
    //   }));
    //   productData["categories"] = {
    //     create: categoryConnection,
    //   };
    // }
    let attributeConnection = [];
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
    const uniqueSku = await products.find((product) =>
      id
        ? product.sku === sku &&
          product.id !== parseInt(id) &&
          product.cat_code === cat_code
        : product.sku === sku
    );
    if (uniqueSku) {
      await removeProductImage(imagePaths);
      return res
        .status(400)
        .json({ isSuccess: false, message: "Sku already exists!" });
    }
    const existingProductIndex = products.findIndex(
      (value) => value.id === parseInt(id) && value.cat_code === cat_code
    );
    if (existingProductIndex !== -1) {
      const oldImage = await products[existingProductIndex].image;
      const images = oldImage.filter((image) => !imagePaths.includes(image));
      if (images.length > 0) await removeProductImage(images);

      products[existingProductIndex] = {
        // ...products[existingProductIndex],
        id: parseInt(id),
        name,
        catalogue_id: null,
        cat_code,
        sku,
        url,
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
        // ...(category_id && {
        //   categories: { create: categoryConnection },
        // }),
        ...(attributes &&
          attributes.length > 0 && {
            attributeValues: { create: attributeConnection },
          }),
        ...(colour_id && { colours: { create: colourConnection } }),
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

const getArrayOfProducts = async (req, res, next) => {
  try {
    const cat_code = req.params.cat_code;
    const product = await readProductsFromFile();
    const products = await product.filter(
      (product) => product.cat_code === cat_code
    );
    return res.status(200).json({
      isSuccess: true,
      message: "Products get successfully.",
      data: products,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const removeArrayOfProduct = async (req, res, next) => {
  try {
    // await deleteProductFiles();
    const { id, cat_code } = req.body;

    const products = await readProductsFromFile();
    const existingProductIndex = products.find(
      (value) => value.id === id && value.cat_code === cat_code
    );

    if (!existingProductIndex)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });

    const removeProducts = await products.filter(
      (value) => !(value.id === id && value.cat_code === cat_code)
    );
    console.log(removeProducts);
    const product = removeProducts.map((value) => {
      if (value.cat_code === cat_code) {
        if (value.id > existingProductIndex.id) value.id -= 1;
      }
      return value;
    });
    await writeProductsToFile(product);
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

const removeArrayOfProducts = async (req, res, next) => {
  try {
    const { cat_code } = req.body;

    const products = await readProductsFromFile();

    const removeProduct = await products.filter(
      (product) => !product.cat_code === cat_code
    );

    await writeProductsToFile(removeProduct);
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

export {
  arrayProducts,
  removeArrayOfProduct,
  removeArrayOfProducts,
  getArrayOfProducts,
  readProductsFromFile,
};
