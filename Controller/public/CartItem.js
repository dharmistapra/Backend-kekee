import prisma from "../../db/config.js";
import {
  extractMeasurementData,
  findCatalogueStitchingprice,
  findproductpriceOnSize,
  findproductpriceonStitching,
  getAllStitchingData,
  isvalidstitching,
  updateStitchingValues,
  validateStitching,
} from "../../helper/cartItemHelper.js";

const postCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    let { product_id, catalogue_id, size, stitching, quantity } = req.body;
    if (
      ![user_id, product_id || catalogue_id].every((id) =>
        /^[a-fA-F0-9]{24}$/.test(id)
      )
    )
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    const findUser = await prisma.users.findUnique({ where: { id: user_id } });
    if (!findUser)
      res.status(404).json({ isSuccess: false, message: "user not found." });

    if (product_id) {
      const findProduct = await prisma.product.findUnique({
        where: { id: product_id },
        include: { sizes: true, categories: true },
      });
      if (!findProduct)
        return res
          .status(404)
          .json({ isSuccess: false, message: "Product not found." });
      if (findProduct.quantity < quantity)
        return res.status(400).json({
          isSuccess: false,
          message: `product quantity must be less than ${findProduct.quantity}`,
        });
    }

    if (catalogue_id) {
      const findCatalogue = await prisma.catalogue.findUnique({
        where: { id: catalogue_id },
        include: { CatalogueSize: true },
      });
      if (!findCatalogue)
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found." });

      if (findCatalogue.quantity < quantity)
        return res.status(400).json({
          isSuccess: false,
          message: `catalogue quantity must be less than ${findCatalogue.quantity}`,
        });
    }

    let cart = await prisma.cart.findUnique({
      where: {
        user_id: user_id,
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({ data: { user_id: user_id } });
    }

    if (stitching && Array.isArray(stitching) && stitching?.length > 0) {
      const stitchingValidationResult = await validateStitching(stitching); // AGAR STTICHING YES HAI TO HIM STITCHING KE DATA KO VALIDATE KARENEGE
      if (!stitchingValidationResult?.isValid)
        return res.status(404).json({
          isSuccess: false,
          message: stitchingValidationResult.message,
        });
    } else if (size && Array.isArray(size) && size?.length > 0) {
      const result = await Promise.all(
        size.map(async (item, index) => {
          return await isvalidstitching(item.id, "size"); // AGAR SIZE YES HAI TO HIM SIZE KE ID KO DB KE STAH MATCH KARAYENEG  [true,true,true]
        })
      );

      if (result?.length > 0 && result.includes(false)) {
        ///  AGAR EK BHE SIZE FALSE HUWE THEN HUM RETUN MESSAGE PAAS KAR DENEGE
        return res
          ?.status(400)
          .json({ isSuccess: false, message: "size Does Not Found" });
      }
    }

    const result = await prisma.cartItem.create({
      // AFTER ALL VALIDATION COMPLETE THEN WE STRORE DATA IN THE DATABASE
      data: {
        ...(product_id && { product_id: product_id }),
        ...(catalogue_id && { catalogue_id: catalogue_id }),
        cart_id: cart.id,
        stitching: JSON.stringify(stitching),
        size: JSON.stringify(size),
        quantity: quantity,
      },
      select: {
        id: true,
        cart_id: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Add to cart Successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    let { cartItem_id, quantity } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(cartItem_id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid Cart Item ID format!" });
    }

    let cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItem_id },
      include: { product: true },
    });

    if (!cartItem) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Cart item not found." });
    }
    let findData;
    if (cartItem.product_id) {
      findData = await prisma.product.findUnique({
        where: { id: cartItem.product_id },
        select: { quantity: true },
      });
    } else if (cartItem.catalogue_id) {
      findData = await prisma.catalogue.findUnique({
        where: { id: cartItem.catalogue_id },
        select: { quantity: true },
      });
    }

    if (findData.quantity < quantity)
      return res.status(400).json({
        isSuccess: false,
        message: `Quantity must be less than ${findData.quantity}`,
      });

    const updatedCartItem = await prisma.cartItem.update({
      where: { id: cartItem_id },
      data: {
        quantity: quantity,
      },
      select: {
        product: { select: { name: true } },
        catalogue: { select: { name: true } },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Cart item updated successfully.",
      data: updatedCartItem,
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
const getAllcartitem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const finduser = await prisma.cart.findUnique({ where: { user_id: id } });
    if (!finduser) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Cart item not found" });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cart_id: finduser?.id },
      select: {
        id: true,
        quantity: true,
        size: true,
        stitching: true,
        product: {
          select: {
            id: true,
            name: true,
            catalogue_id: true,
            sku: true,
            url: true,
            average_price: true,
            retail_price: true,
            retail_discount: true,
            offer_price: true,
            image: true,
            tag: true,
            showInSingle: true,
          },
        },
      },
    });

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Cart items not found" });
    }

    let subtotal = 0,
      tax = 0;
    let stitchingDataMap = [];

    await Promise.all(
      cartItems.map(async (item) => {
        let itemSubtotal = 0,
          itemTax = 0;
        const findProduct = item.product?.id;
        const { quantity, stitching, size } = item;

        if (size) {
          const priceDetails = await findproductpriceOnSize(
            findProduct,
            stitching,
            quantity
          );
          itemSubtotal = priceDetails?.subtotal || 0;
          itemTax = priceDetails?.tax || 0;
        } else if (stitching) {
          const parsedStitching = JSON.parse(stitching);
          const priceDetails = await findproductpriceonStitching(
            findProduct,
            parsedStitching,
            quantity
          );
          itemSubtotal = priceDetails?.subtotal || 0;
          itemTax = priceDetails?.tax || 0;

          const measurementData = extractMeasurementData(parsedStitching);
          stitchingDataMap = await getAllStitchingData(
            parsedStitching,
            parsedStitching
          );
          console.log("stitchingDataMap", stitchingDataMap);
        }

        item.subtotal = itemSubtotal;
        item.tax = itemTax;
        item.stitching = stitchingDataMap;
        subtotal += itemSubtotal;
        tax += itemTax;
      })
    );

    const orderTotal = subtotal + tax;

    return res.status(200).json({
      isSuccess: true,
      message: "Cart items retrieved successfully.",
      data: cartItems,
      subtotal,
      tax,
      orderTotal,
    });
  } catch (error) {
    console.error(error);
    next(new Error("Something went wrong, please try again!"));
  }
};

const deletecartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[a-fA-F0-9]{24}$/.test(id))
      res.status(400).json({ isSuccess: false, message: "Invalid ID format!" });

    const finddata = await prisma.cartItem.findUnique({
      where: {
        id: id,
      },
    });

    if (!finddata) {
      return res.status(4000).json({
        isSuccess: false,
        message: "Cart item not founf.",
      });
    }

    const deletecartItem = await prisma.cartItem.delete({
      where: {
        id: id,
      },
      select: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      isSuccess: false,
      message: "Cart item remove successfully.",
      data: deletecartItem,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// CART ITEM TESTING SUCCESSFULY WORKING

// const postCartItemTesting = async (req, res, next) => {
//   try {
//     const user_id = req.user.id;
//     let { product_id, catalogue_id, size, stitching, quantity } = req.body;

//     const findUser = await prisma.users.findUnique({ where: { id: user_id } });
//     if (!findUser)
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "User not found." });

//     let cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
//     if (!cart) {
//       cart = await prisma.cart.create({ data: { user_id: user_id } });
//     }

//     // Validate stitching or size
//     if (stitching && Array.isArray(stitching) && stitching.length > 0) {
//       const stitchingValidationResult = await validateStitching(stitching);
//       if (!stitchingValidationResult?.isValid)
//         return res.status(400).json({
//           isSuccess: false,
//           message: stitchingValidationResult.message,
//         });
//     } else if (size && Array.isArray(size) && size.length > 0) {
//       const result = await Promise.all(
//         size.map(async (item) => await isvalidstitching(item.id, "size"))
//       );
//       if (result.includes(false))
//         return res
//           .status(400)
//           .json({ isSuccess: false, message: "Size does not exist." });
//     }

//     if (catalogue_id && !product_id) {
//       const products = await prisma.product.findMany({
//         where: { catalogue_id: catalogue_id },
//       });
//       if (!products.length)
//         return res
//           .status(400)
//           .json({ error: "No products found in this catalogue" });

//       for (let product of products) {
//         const existingCatalogueItem = await prisma.cartItem.findFirst({
//           where: {
//             cart_id: cart.id,
//             product_id: product.id,
//             isCatalogue: true,
//           },
//         });

//         if (existingCatalogueItem) {
//           await prisma.cartItem.update({
//             where: { id: existingCatalogueItem.id },
//             data: { quantity },
//           });
//         } else {
//           await prisma.cartItem.create({
//             data: {
//               cart_id: cart.id,
//               product_id: product.id,
//               stitching: JSON.stringify(stitching),
//               size: JSON.stringify(size),
//               quantity: quantity,
//               isCatalogue: true,
//             },
//           });
//         }
//       }

//       return res.status(200).json({
//         isSuccess: true,
//         message: "Catalogue items added to cart successfully.",
//       });
//     }

//     if (product_id) {
//       const findProduct = await prisma.product.findUnique({
//         where: { id: product_id },
//         include: { sizes: true, categories: true },
//       });
//       if (!findProduct)
//         return res
//           .status(404)
//           .json({ isSuccess: false, message: "Product not found." });

//       const existingSingleItem = await prisma.cartItem.findFirst({
//         where: {
//           cart_id: cart.id,
//           product_id: product_id,
//           isCatalogue: false,
//         },
//       });

//       let result;
//       let message;
//       if (existingSingleItem) {
//         result = await prisma.cartItem.update({
//           where: { id: existingSingleItem.id },
//           data: {
//             product_id: product_id,
//             stitching: JSON.stringify(stitching),
//             size: JSON.stringify(size),
//             quantity: quantity,
//           },
//         });

//         message = "item update successfully";
//       } else {
//         result = await prisma.cartItem.create({
//           data: {
//             cart_id: cart.id,
//             product_id: product_id,
//             stitching: JSON.stringify(stitching),
//             size: JSON.stringify(size),
//             quantity: quantity,
//             isCatalogue: false,
//           },
//         });
//         message = "item add in cart successfully";
//       }

//       return res.status(200).json({
//         isSuccess: true,
//         message: message,
//         data: result,
//       });
//     }
//   } catch (error) {
//     console.log("Error:", error);
//     return next(new Error("Something went wrong, please try again!"));
//   }
// };





// const getAllcartitemTesting = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const finduser = await prisma.cart.findUnique({ where: { user_id: id } });

//     if (!finduser) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Cart item not found" });
//     }

//     const cartItems = await prisma.cartItem.findMany({
//       where: { cart_id: finduser?.id },
//       select: {
//         id: true,
//         quantity: true,
//         isCatalogue: true,
//         size: true,
//         stitching: true,
//         product: {
//           select: {
//             id: true,
//             name: true,
//             catalogue_id: true,
//             sku: true,
//             url: true,
//             average_price: true,
//             retail_price: true,
//             retail_discount: true,
//             offer_price: true,
//             image: true,
//             tag: true,
//             showInSingle: true,
//           },
//         },
//       },
//     });

//     if (!cartItems || cartItems.length === 0) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Cart items not found" });
//     }

//     let subtotal = 0,
//       tax = 0;
//     let individualItems = [];
//     let stitchingDataMap = [];

//     const catalogueIds = [
//       ...new Set(
//         cartItems.map((item) => item?.product?.catalogue_id).filter((id) => id)
//       ),
//     ];
//     console.log(catalogueIds);
//     const catalogueDetails = await prisma.catalogue.findMany({
//       where: { id: { in: catalogueIds } },
//       select: {
//         id: true,
//         name: true,
//         cat_code: true,
//         no_of_product: true,
//         url: true,
//         coverImage: true,
//         price: true
//       },
//     });

//     const catalogueMap = {};
//     catalogueDetails.forEach((catalogue) => {
//       catalogueMap[catalogue.id] = {
//         ...catalogue,
//         quantity: 0,
//         isCatalogue: true,
//         subtotal: 0,
//         tax: 0,
//         size: null,
//         stitching: [],
//         products: [],
//       };
//     });

//     await Promise.all(
//       cartItems.map(async (item) => {
//         let itemSubtotal = 0,
//           itemTax = 0;
//         let itemMessage = "";
//         const findProduct = item.product?.id;
//         const { quantity, stitching, size, isCatalogue } = item;
//         let catalogueId = item?.product?.catalogue_id;

//         if (size) {
//           const priceDetails = await findproductpriceOnSize(
//             findProduct,
//             size,
//             quantity
//           );
//           itemSubtotal = priceDetails?.subtotal || 0;
//           itemTax = priceDetails?.tax || 0;
//           itemMessage = priceDetails?.message || null;
//         } else if (stitching) {
//           const parsedStitching = JSON.parse(stitching);
//           const priceDetails = await findproductpriceonStitching(
//             findProduct,
//             parsedStitching,
//             quantity
//           );
//           itemSubtotal = priceDetails?.subtotal * quantity || 0;
//           itemTax = priceDetails?.tax || 0;
//           itemMessage = priceDetails?.message || null;
//           stitchingDataMap = await getAllStitchingData(
//             parsedStitching,
//             parsedStitching
//           );
//         }

//         subtotal += itemSubtotal;
//         tax += itemTax;

//         if (isCatalogue && catalogueId && catalogueMap[catalogueId]) {
//           catalogueMap[catalogueId].products.push({
//             ...item.product,
//             subtotal: itemSubtotal,
//             tax: itemTax,
//             message: itemMessage,
//           });
//           catalogueMap[catalogueId].quantity = quantity;
//           catalogueMap[catalogueId].size = size;
//           catalogueMap[catalogueId].stitching = stitchingDataMap;
//           catalogueMap[catalogueId].subtotal += itemSubtotal;
//           catalogueMap[catalogueId].tax += itemTax;
//         } else {
//           individualItems.push({
//             ...item.product,
//             quantity: item.quantity,
//             subtotal: itemSubtotal,
//             tax: itemTax,
//             message: itemMessage,
//           });
//         }
//       })
//     );

//     const orderTotal = subtotal + tax;

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Cart items retrieved successfully.",
//       catalogues: Object.values(catalogueMap),
//       individualItems,
//       subtotal,
//       tax,
//       orderTotal,
//     });
//   } catch (error) {
//     console.error(error);
//     next(new Error("Something went wrong, please try again!"));
//   }
// };

const deleteCartItemTesting = async (req, res, next) => {
  try {
    const { product_id, catalogue_id, user_id } = req.body;

    const cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
    if (!cart)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Cart not found." });

    // DELETE ALL CATALOGUE
    if (catalogue_id) {
      await prisma.cartItem.deleteMany({
        where: {
          cart_id: cart.id,
          isCatalogue: true,
          product: { catalogue_id: catalogue_id },
        },
      });

      return res.status(200).json({
        isSuccess: true,
        message: "All catalogue products removed from cart.",
      });
    }

    // DELETE SINGLE PRODUCT
    if (product_id) {
      const existingProduct = await prisma.cartItem.findFirst({
        where: { cart_id: cart.id, product_id: product_id, isCatalogue: false },
      });

      if (!existingProduct) {
        return res
          .status(404)
          .json({ isSuccess: false, message: "Product not found in cart." });
      }

      await prisma.cartItem.delete({ where: { id: existingProduct.id } });

      return res.status(200).json({
        isSuccess: true,
        message: "Product removed from cart.",
      });
    }

    return res
      .status(400)
      .json({ isSuccess: false, message: "Invalid request parameters." });
  } catch (error) {
    console.error("Error:", error);
    return next(new Error("Something went wrong, please try again!"));
  }
};

































const postCartItemTesting = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    let { product_id, catalogue_id, size, stitching, quantity } = req.body;

    const findUser = await prisma.users.findUnique({ where: { id: user_id } });
    if (!findUser)
      return res
        .status(404)
        .json({ isSuccess: false, message: "User not found." });

    let cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { user_id: user_id } });
    }

    // Validate stitching or size
    if (stitching && Array.isArray(stitching) && stitching.length > 0) {
      const stitchingValidationResult = await validateStitching(stitching);
      if (!stitchingValidationResult?.isValid)
        return res.status(400).json({
          isSuccess: false,
          message: stitchingValidationResult.message,
        });
    } else if (size && Array.isArray(size) && size.length > 0) {
      const result = await Promise.all(
        size.map(async (item) => await isvalidstitching(item.id, "size"))
      );
      if (result.includes(false))
        return res
          .status(400)
          .json({ isSuccess: false, message: "Size does not exist." });
    }



    if (catalogue_id && !product_id) {
      const products = await prisma.product.findMany({
        where: { catalogue_id: catalogue_id },
      });
      if (!products.length)
        return res
          .status(400)
          .json({ error: "No products found in this catalogue" });

      const existingCatalogueItem = await prisma.cartItem.findFirst({
        where: {
          cart_id: cart.id,
          catalogue_id: catalogue_id,
          isCatalogue: true,
        },
      });
      if (existingCatalogueItem) {
        await prisma.cartItem.update({
          where: { id: existingCatalogueItem.id },
          data: { quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cart_id: cart.id,
            catalogue_id: catalogue_id,
            stitching: JSON.stringify(stitching),
            size: JSON.stringify(size),
            quantity: quantity,
            isCatalogue: true,
          },
        });
      }
      return res.status(200).json({
        isSuccess: true,
        message: "Catalogue items added to cart successfully.",
      });
    }

    if (product_id) {
      const findProduct = await prisma.product.findUnique({
        where: { id: product_id },
        include: { sizes: true, categories: true },
      });
      if (!findProduct)
        return res
          .status(404)
          .json({ isSuccess: false, message: "Product not found." });

      const existingSingleItem = await prisma.cartItem.findFirst({
        where: {
          cart_id: cart.id,
          product_id: product_id,
          isCatalogue: false,
        },
      });

      let result;
      let message;
      if (existingSingleItem) {
        result = await prisma.cartItem.update({
          where: { id: existingSingleItem.id },
          data: {
            product_id: product_id,
            stitching: JSON.stringify(stitching),
            size: JSON.stringify(size),
            quantity: quantity,
          },
        });

        message = "item update successfully";
      } else {
        result = await prisma.cartItem.create({
          data: {
            cart_id: cart.id,
            product_id: product_id,
            stitching: JSON.stringify(stitching),
            size: JSON.stringify(size),
            quantity: quantity,
            isCatalogue: false,
          },
        });
        message = "item add in cart successfully";
      }

      return res.status(200).json({
        isSuccess: true,
        message: message,
        data: result,
      });
    }
  } catch (error) {
    console.log("Error:", error);
    return next(new Error("Something went wrong, please try again!"));
  }
};
















const getAllcartitemTesting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const finduser = await prisma.cart.findUnique({ where: { user_id: id } });

    if (!finduser) {
      return res.status(400).json({ isSuccess: false, message: "Cart item not found" });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cart_id: finduser?.id },
      select: {
        id: true,
        quantity: true,
        product_id: true,
        isCatalogue: true,
        catalogue_id: true,
        size: true,
        stitching: true,
        product: {
          select: {
            id: true,
            name: true,
            catalogue_id: true,
            sku: true,
            url: true,
            average_price: true,
            retail_price: true,
            retail_discount: true,
            offer_price: true,
            image: true,
            tag: true,
            showInSingle: true,
          },
        },
        catalogue: {
          select: {
            id: true,
            name: true,
            cat_code: true,
            url: true,
            quantity: true,
            price: true,
            GST: true,
            offer_price: true,
            coverImage: true,
            Product: {
              select: {
                id: true,
                name: true,
                catalogue_id: true,
                sku: true,
                url: true,
                average_price: true,
                retail_price: true,
                retail_discount: true,
                offer_price: true,
                image: true,
                tag: true,
                quantity: true,
                showInSingle: true,
              },
            }
          }
        }
      },
    });


    let subtotal = 0, tax = 0;
    let stitchingDataMap = [];



    for (let item of cartItems) {
      const { quantity, stitching, size, isCatalogue, catalogue, product_id } = item;

      if (item.isCatalogue && item.catalogue_id) {
        const checkproductquantity = catalogue?.Product?.map(data => {
          if (data.quantity <= quantity) {
            return { ...data, outOfStock: true };
          }
          return data;
        });

        catalogue.Product = checkproductquantity
        if (item.stitching) {
          const parsedStitching = JSON.parse(stitching);
          const priceDetails = await findCatalogueStitchingprice(catalogue?.id, parsedStitching, quantity, checkproductquantity);
          item.Subtotal = priceDetails?.subtotal * quantity || 0;
          item.Tax = priceDetails?.tax || 0;
          stitchingDataMap = await getAllStitchingData(parsedStitching, parsedStitching);
        }
      } else {
        if (size) {
          const priceDetails = await findproductpriceOnSize(
            product_id,
            size,
            quantity
          );
          item.Subtotal = priceDetails?.subtotal || 0;
          item.Tax = priceDetails?.tax || 0;
        } else if (stitching) {
          const parsedStitching = JSON.parse(stitching);
          const priceDetails = await findproductpriceonStitching(product_id, parsedStitching, quantity);
          console.log("Price Details", priceDetails)
          item.Subtotal = priceDetails?.subtotal * quantity || 0;
          item.Tax = priceDetails?.tax || 0;
          item.message = priceDetails.message || ''
          stitchingDataMap = await getAllStitchingData(
            parsedStitching,
            parsedStitching
          );
        }
      }
      subtotal += item.Subtotal
      tax += item.Tax;
    }



    const DataModified = cartItems && cartItems?.length > 0 && cartItems?.map((item, index) => {
      let outOfStockProducts = [];
      let outOfStock = false;
      let message = '';
      if (item.isCatalogue && item.catalogue_id) {
        item.catalogue?.Product?.forEach(product => {
          if (product.outOfStock && product.quantity < item.quantity) {
            outOfStock = true;
            message = "At This Time Product Quantity IS Not Available";
            outOfStockProducts.push({
              sku: product.sku,
              outOfStock: product.outOfStock,
              message: message
            });
          }
        });
      }


      return {
        id: item.id,
        product_id: item?.product_id,
        catalogue_id: item?.catalogue_id,
        isCatalogue: item.isCatalogue,
        stitching: stitchingDataMap,
        name: item?.catalogue ? item?.catalogue.name : item?.product?.name,
        quantity: item.quantity,
        sku: item?.catalogue ? item?.catalogue.cat_code : item?.product?.sku,
        price: item?.catalogue ? item?.catalogue.offer_price : item?.product.offer_price,
        image: item?.catalogue ? item?.catalogue.coverImage : item?.product?.image[0],
        size: item.size,
        subtotal: item?.Subtotal,
        tax: item?.Tax,
        message: outOfStockProducts,
        // outOfStock: item?.product?.outOfStock
      }
    })

    console.log("DataModified", DataModified)
    return res.status(200).json({
      "status": true,
      "message": "Cart Items Get Successfully",
      "data": DataModified,
      "totalSubtotal": subtotal,
      "totalTax": tax
    })

  } catch (error) {
    console.error(error);
    next(new Error("Something went wrong, please try again!"));
  }
};

















export {
  postCartItem,
  getAllcartitem,
  updateCartItem,
  deletecartItem,
  postCartItemTesting,
  getAllcartitemTesting,
  deleteCartItemTesting,
};
