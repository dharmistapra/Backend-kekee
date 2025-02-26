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
        message: `Cart limit reached! Please choose only ${findData.quantity} items.`,
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

const deleteCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const id = req.params.id;
    // const { product_id, catalogue_id } = req.body;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid Cart Item ID format!" });
    }

    const cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
    if (!cart)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Cart not found." });

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: id },
    });

    if (!cartItem)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Cart item not found!" });

    const result = await prisma.cartItem.delete({
      where: { id: id },
    });

    if (!result)
      return res
        .status(200)
        .json({ isSuccess: false, message: "Cart item not found!" });

    return res
      .status(200)
      .json({ isSuccess: true, message: "Cart item deleted successfully." });

    // DELETE ALL CATALOGUE
    // if (catalogue_id) {
    //   await prisma.cartItem.deleteMany({
    //     where: {
    //       cart_id: cart.id,
    //       isCatalogue: true,
    //       product: { catalogue_id: catalogue_id },
    //     },
    //   });

    //   return res.status(200).json({
    //     isSuccess: true,
    //     message: "All catalogue products removed from cart.",
    //   });
    // }

    // DELETE SINGLE PRODUCT
    // if (product_id) {
    //   const existingProduct = await prisma.cartItem.findFirst({
    //     where: { cart_id: cart.id, product_id: product_id, isCatalogue: false },
    //   });

    //   if (!existingProduct) {
    //     return res
    //       .status(404)
    //       .json({ isSuccess: false, message: "Product not found in cart." });
    //   }

    //   await prisma.cartItem.delete({ where: { id: existingProduct.id } });

    //   return res.status(200).json({
    //     isSuccess: true,
    //     message: "Product removed from cart.",
    //   });
    // }
  } catch (error) {
    console.error("Error:", error);
    return next(new Error("Something went wrong, please try again!"));
  }
};

const postCartItem = async (req, res, next) => {
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

      // const existingCatalogueItem = await prisma.cartItem.findFirst({
      //   where: {
      //     cart_id: cart.id,
      //     catalogue_id: catalogue_id,
      //     isCatalogue: true,
      //   },
      // });
      // if (existingCatalogueItem) {
      //   await prisma.cartItem.update({
      //     where: { id: existingCatalogueItem.id },
      //     data: { quantity },
      //   });
      // } else {
      const result = await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          catalogue_id: catalogue_id,
          stitching: JSON.stringify(stitching),
          size: JSON.stringify(size),
          quantity: quantity,
          isCatalogue: true,
        },
      });
      // }
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

const getAllcartitem = async (req, res, next) => {
  try {
    const { id } = req.params;
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
            weight: true,
            categories: {
              select: {
                id: true,
                category: {
                  select: {
                    id: true,
                    Menu: { select: { id: true, name: true, url: true } },
                  },
                },
              },
            },
            tag: true,
            showInSingle: true,
            quantity: true,
          },
        },
        catalogue: {
          select: {
            id: true,
            name: true,
            cat_code: true,
            no_of_product: true,
            url: true,
            quantity: true,
            price: true,
            GST: true,
            offer_price: true,
            coverImage: true,
            average_price: true,
            weight: true,
            CatalogueCategory: {
              select: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    Menu: {
                      select: {
                        id: true,
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },
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
            },
          },
        },
      },
    });

    // let subtotal = 0,
    //   tax = 0;
    // let stitchingDataMap = [];

    // for (let item of cartItems) {
    //   const { quantity, stitching, size, isCatalogue, catalogue, product_id } =
    //     item;

    //   if (item.isCatalogue && item.catalogue_id) {
    //     const checkproductquantity = catalogue?.Product?.map((data) => {
    //       if (data.quantity < quantity) {
    //         return { ...data, outOfStock: true };
    //       }
    //       return data;
    //     });

    //     catalogue.Product = checkproductquantity;
    //     if (item.stitching) {
    //       const parsedStitching = JSON.parse(stitching);
    //       const priceDetails = await findCatalogueStitchingprice(
    //         catalogue?.id,
    //         parsedStitching,
    //         quantity,
    //         checkproductquantity
    //       );
    //       item.Subtotal = priceDetails?.subtotal * quantity || 0;
    //       item.Tax = priceDetails?.tax || 0;
    //       item.outOfStock = priceDetails.catalogueOutOfStock;
    //       stitchingDataMap = await getAllStitchingData(
    //         parsedStitching,
    //         parsedStitching
    //       );
    //       console.log(JSON.stringify(stitchingDataMap, null, 2));

    //     }
    //   } else {
    //     if (size) {
    //       const priceDetails = await findproductpriceOnSize(
    //         product_id,
    //         size,
    //         quantity
    //       );
    //       item.Subtotal = priceDetails?.subtotal || 0;
    //       item.Tax = priceDetails?.tax || 0;
    //     } else if (stitching) {
    //       const parsedStitching = JSON.parse(stitching);
    //       const priceDetails = await findproductpriceonStitching(
    //         product_id,
    //         parsedStitching,
    //         quantity
    //       );

    //       item.Subtotal = priceDetails?.subtotal * quantity || 0;
    //       item.Tax = priceDetails?.tax || 0;
    //       item.message = priceDetails.message || "";
    //       stitchingDataMap = await getAllStitchingData(
    //         parsedStitching,
    //         parsedStitching
    //       );
    //     }
    //   }
    //   subtotal += item.Subtotal;
    //   tax += item.Tax;
    // }

    // const DataModified =
    //   cartItems &&
    //   cartItems?.length > 0 &&
    //   cartItems?.map((item, index) => {
    //     let outOfStockProducts = [];
    //     let outOfStock = false;
    //     let message = "";
    //     if (item.isCatalogue && item.catalogue_id) {
    //       item.catalogue?.Product?.forEach((product) => {
    //         if (product.outOfStock && product.quantity < item.quantity) {
    //           outOfStock = item.outOfStock;
    //           message = "At This Time Product Quantity IS Not Available";
    //           outOfStockProducts.push({
    //             sku: product.sku,
    //             outOfStock: product.outOfStock,
    //             message: message,
    //           });
    //         }
    //       });
    //     } else if (item.product.quantity < item.quantity) {
    //       outOfStock = true;
    //       message = "At This Time Stock Is Unavailable";
    //       outOfStockProducts.push({
    //         sku: item.product.sku,
    //         outOfStock: item.product.outOfStock,
    //         message: message,
    //       });
    //     }

    //     let menu;
    //     if (item?.catalogue?.CatalogueCategory) {
    //       const category = item?.catalogue?.CatalogueCategory.map(
    //         (value) => value.category.Menu[0].url
    //       );
    //       menu = category[0];
    //       delete item?.catalogue?.CatalogueCategory;
    //     }
    //     if (item?.product?.categories) {
    //       const category = item?.product?.categories.map(
    //         (value) => value.category.Menu[0].url
    //       );
    //       menu = category[0];
    //       delete item?.product?.categories;
    //     }
    //     return {
    //       id: item.id,
    //       product_id: item?.product_id,
    //       catalogue_id: item?.catalogue_id,
    //       isCatalogue: item.isCatalogue,
    //       stitching: stitchingDataMap,
    //       ...(item?.catalogue && { no_of_product: item?.catalogue?.no_of_product }),
    //       average_price: item?.catalogue ? item?.catalogue.average_price : item?.product?.price,
    //       url: item?.catalogue ? item?.catalogue.url : item?.product?.url,
    //       name: item?.catalogue ? item?.catalogue.name : item?.product?.name,
    //       quantity: item.quantity,
    //       sku: item?.catalogue ? item?.catalogue.cat_code : item?.product?.sku,
    //       weight: item?.catalogue
    //         ? item?.catalogue.weight
    //         : item.product?.weight,
    //       price: item?.catalogue
    //         ? item?.catalogue.offer_price
    //         : item?.product.offer_price,
    //       image: item?.catalogue
    //         ? item?.catalogue.coverImage
    //         : item?.product?.image[0],
    //       category: item?.catalogue
    //         ? item?.catalogue.CatalogueCategory
    //         : item?.product?.categories,
    //       menu: menu,
    //       size: item.size,
    //       subtotal: item?.Subtotal,
    //       tax: item?.Tax,
    //       outOfStock: outOfStock,
    //       message: outOfStockProducts,
    //     };
    //   });

    // const totalOrder = subtotal + tax;

    // return res.status(200).json({
    //   status: true,
    //   message: "Cart Items Get Successfully",
    //   data: DataModified,
    //   totalSubtotal: subtotal,
    //   totalTax: tax,
    //   totalOrder: totalOrder,
    // });

    let subtotal = 0,
      tax = 0;

    let DataModified =
      cartItems &&
      cartItems.length > 0 &&
      (await Promise.all(
        cartItems.map(async (item) => {
          let stitchingData = [];

          const {
            quantity,
            stitching,
            size,
            isCatalogue,
            catalogue,
            product_id,
          } = item;

          if (isCatalogue && item.catalogue_id) {
            const checkproductquantity = catalogue?.Product?.map((data) => {
              if (data.quantity < quantity) {
                return { ...data, outOfStock: true };
              }
              return data;
            });

            catalogue.Product = checkproductquantity;

            if (stitching) {
              const parsedStitching = JSON.parse(stitching);
              const priceDetails = await findCatalogueStitchingprice(
                catalogue?.id,
                parsedStitching,
                quantity,
                checkproductquantity
              );
              item.Subtotal = priceDetails?.subtotal * quantity || 0;
              item.Tax = priceDetails?.tax || 0;
              item.outOfStock = priceDetails.catalogueOutOfStock;
              stitchingData = await getAllStitchingData(
                parsedStitching,
                parsedStitching
              );
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
              const priceDetails = await findproductpriceonStitching(
                product_id,
                parsedStitching,
                quantity
              );
              item.Subtotal = priceDetails?.subtotal * quantity || 0;
              item.Tax = priceDetails?.tax || 0;
              item.message = priceDetails.message || "";
              stitchingData = await getAllStitchingData(
                parsedStitching,
                parsedStitching
              );
            }
          }

          subtotal += item.Subtotal;
          tax += item.Tax;

          let outOfStockProducts = [];
          let outOfStock = false;
          let message = "";

          if (isCatalogue && item.catalogue_id) {
            item.catalogue?.Product?.forEach((product) => {
              if (product.outOfStock && product.quantity < item.quantity) {
                outOfStock = item.outOfStock;
                message = "At This Time Product Quantity IS Not Available";
                outOfStockProducts.push({
                  sku: product.sku,
                  outOfStock: product.outOfStock,
                  message: message,
                });
              }
            });
          } else if (item.product.quantity < item.quantity) {
            outOfStock = true;
            message = "At This Time Stock Is Unavailable";
            outOfStockProducts.push({
              sku: item.product.sku,
              outOfStock: item.product.outOfStock,
              message: message,
            });
          }

          let menu;
          if (item?.catalogue?.CatalogueCategory) {
            const category = item?.catalogue?.CatalogueCategory.map(
              (value) => value.category.Menu[0].url
            );
            menu = category[0];
            delete item?.catalogue?.CatalogueCategory;
          }
          if (item?.product?.categories) {
            const category = item?.product?.categories.map(
              (value) => value.category.Menu[0].url
            );
            menu = category[0];
            delete item?.product?.categories;
          }

          return {
            id: item.id,
            product_id: item?.product_id,
            catalogue_id: item?.catalogue_id,
            isCatalogue: item.isCatalogue,
            stitching: stitchingData,
            ...(item?.catalogue && {
              no_of_product: item?.catalogue?.no_of_product,
            }),
            average_price: item?.catalogue
              ? item?.catalogue.average_price
              : item?.product?.price,
            url: item?.catalogue ? item?.catalogue.url : item?.product?.url,
            name: item?.catalogue ? item?.catalogue.name : item?.product?.name,
            quantity: item.quantity,
            sku: item?.catalogue
              ? item?.catalogue.cat_code
              : item?.product?.sku,
            weight: item?.catalogue
              ? item?.catalogue.weight
              : item.product?.weight,
            price: item?.catalogue
              ? item?.catalogue.offer_price
              : item?.product.offer_price,
            image: item?.catalogue
              ? item?.catalogue.coverImage
              : item?.product?.image[0],
            category: item?.catalogue
              ? item?.catalogue.CatalogueCategory
              : item?.product?.categories,
            menu: menu,
            size: item.size,
            subtotal: item?.Subtotal,
            tax: item?.Tax,
            outOfStock: outOfStock,
            message: outOfStockProducts,
          };
        })
      ));

    const totalOrder = subtotal + tax;

    return res.status(200).json({
      status: true,
      message: "Cart Items Get Successfully",
      data: DataModified,
      totalSubtotal: subtotal,
      totalTax: tax,
      totalOrder: totalOrder,
    });
  } catch (error) {
    console.error(error);
    next(new Error("Something went wrong, please try again!"));
  }
};

export { updateCartItem, postCartItem, getAllcartitem, deleteCartItem };
