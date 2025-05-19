import prisma from "../../db/config.js";
import {
  calculateCartItemTotal,
  isvalidstitching,
  validateStitching,
  validateStitchingOption,
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
  } catch (error) {
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

    if (stitching && Array.isArray(stitching) && stitching.length > 0) {
      console.log("stitching", stitching);
      return;
      const stitchingValidationResult = await validateStitching(stitching);
      if (!stitchingValidationResult?.isValid)
        return res.status(400).json({
          isSuccess: false,
          message: stitchingValidationResult.message,
        });
    } else if (size) {
      const result = await isvalidstitching(size.id, "size");
      if (!result)
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

      let result;
      let message;
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

// const postCartItemOptimizeCode = async (req, res, next) => {
//   try {
//     let { product_id, catalogue_id, size, stitching, quantity, user_id } = req.body;

//     const findUser = await prisma.users.findUnique({ where: { id: user_id } });
//     if (!findUser)
//       return res.status(404).json({ isSuccess: false, message: "User not found." });

//     let cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
//     if (!cart) {
//       cart = await prisma.cart.create({ data: { user_id: user_id } });
//     }

//     if (stitching) {
//       const { success } = await validateStitchingOption(stitching);
//       if (!success)
//         return res.status(400).json({
//           isSuccess: false,
//           message: "Option Id Not Found",
//         });
//     } else if (size) {
//       const result = await isvalidstitching(size.id, "size");
//       if (!result)
//         return res.status(400).json({ isSuccess: false, message: "Size does not exist." });
//     }

//     const normalizeStitching = (s) => {
//       if (!s || !Array.isArray(s)) return [];
//       return s
//         .map((item) => ({
//           optionid: item.optionid,
//           measurment: item.measurment || [],
//         }))
//         .sort((a, b) => a.optionid.localeCompare(b.optionid));
//     };

//     if (catalogue_id && !product_id) {
//       const products = await prisma.product.findMany({
//         where: { catalogue_id: catalogue_id },
//       });

//       if (!products.length)
//         return res.status(400).json({ error: "No products found in this catalogue" });

//       const existingCartItems = await prisma.cartItem.findMany({
//         where: {
//           cart_id: cart.id,
//           catalogue_id: catalogue_id,
//           isCatalogue: true,
//         },
//       });

//       const normalizedIncoming = JSON.stringify(normalizeStitching(stitching));
//       let existingCartItem = null;

//       for (const item of existingCartItems) {
//         const normalizedExisting = JSON.stringify(
//           normalizeStitching(JSON.parse(item.stitching || "[]"))
//         );

//         if (normalizedExisting === normalizedIncoming) {
//           existingCartItem = item;
//           break;
//         }
//       }

//       if (existingCartItem) {
//         const updatedCartItem = await prisma.cartItem.update({
//           where: { id: existingCartItem.id },
//           data: {
//             quantity: existingCartItem.quantity + quantity,
//           },
//         });

//         return res.status(200).json({
//           isSuccess: true,
//           message: "Catalogue item quantity updated successfully.",
//           data: updatedCartItem,
//         });
//       }


//       const result = await prisma.cartItem.create({
//         data: {
//           cart_id: cart.id,
//           catalogue_id: catalogue_id,
//           stitching: JSON.stringify(stitching),
//           size: JSON.stringify(size),
//           quantity: quantity,
//           isCatalogue: true,
//         },
//       });

//       if (stitching?.length > 0) {
//         for (const stitch of stitching) {
//           await prisma.cartItemStitching.create({
//             data: {
//               cartItem_id: result.id,
//               stitching_option: stitch.optionid,
//               measurment: stitch.measurment
//                 ? JSON.stringify(stitch.measurment)
//                 : null,
//             },
//           });
//         }
//       }

//       return res.status(200).json({
//         isSuccess: true,
//         message: "Catalogue items added to cart successfully.",
//         data: result,
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

//       const result = await prisma.cartItem.create({
//         data: {
//           cart_id: cart.id,
//           product_id: product_id,
//           stitching: JSON.stringify(stitching),
//           size: JSON.stringify(size),
//           quantity: quantity,
//           isCatalogue: false,
//         },
//       });

//       if (stitching?.length > 0) {
//         for (const stitch of stitching) {
//           await prisma.cartItemStitching.create({
//             data: {
//               cartItem_id: result.id,
//               stitching_option: stitch.optionid,
//               measurment: stitch.measurment
//                 ? JSON.stringify(stitch.measurment)
//                 : null,
//             },
//           });
//         }
//       }

//       return res.status(200).json({
//         isSuccess: true,
//         message: "Item added to cart successfully.",
//         data: result,
//       });
//     }
//   } catch (error) {
//     console.log("Error:", error);
//     return next(new Error("Something went wrong, please try again!"));
//   }
// };


const postCartItemOptimizeCode = async (req, res, next) => {
  try {
    const { product_id, catalogue_id, size, stitching, quantity, user_id } = req.body;

    // 1. Validate User
    const user = await prisma.users.findUnique({ where: { id: user_id } });
    if (!user) {
      return res.status(404).json({ isSuccess: false, message: "User not found." });
    }

    // 2. Ensure Cart Exists
    let cart = await prisma.cart.findUnique({ where: { user_id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { user_id } });
    }

    // 3. Stitching or Size Validation
    if (stitching && stitching.length > 0) {
      const { success } = await validateStitchingOption(stitching);
      if (!success) {
        return res.status(400).json({ isSuccess: false, message: "Invalid stitching options." });
      }
    } else if (size) {
      const sizeExists = await isvalidstitching(size.id, "size");
      if (!sizeExists) {
        return res.status(400).json({ isSuccess: false, message: "Invalid size selected." });
      }
    }

    // 4. Normalize Helpers
    const normalizeStitching = (s) => {
      if (!Array.isArray(s)) return [];
      return s
        .map(({ optionid, measurment = [] }) => ({ optionid, measurment }))
        .sort((a, b) => a.optionid.localeCompare(b.optionid));
    };

    const normalizeSize = (s) => {
      if (!s || typeof s !== "object") return {};
      return s;
    };

    const normalizedStitchingStr = JSON.stringify(normalizeStitching(stitching));
    const sizeStr = JSON.stringify(normalizeSize(size));

    // 5. Helper to store stitching details
    const addStitchingDetails = async (cartItemId, stitchingData) => {
      for (const stitch of stitchingData) {
        await prisma.cartItemStitching.create({
          data: {
            cartItem_id: cartItemId,
            stitching_option: stitch.optionid,
            measurment: stitch.measurment ? JSON.stringify(stitch.measurment) : null,
          },
        });
      }
    };

    // 6. Handle Catalogue Add
    if (catalogue_id && !product_id) {
      const products = await prisma.product.findMany({ where: { catalogue_id } });
      if (!products.length) {
        return res.status(400).json({ isSuccess: false, message: "No products in catalogue." });
      }

      const existingItems = await prisma.cartItem.findMany({
        where: {
          cart_id: cart.id,
          catalogue_id,
          isCatalogue: true,
        },
      });

      const existingItem = existingItems.find((item) => {
        const existingStitching = normalizeStitching(JSON.parse(item.stitching || "[]"));
        return JSON.stringify(existingStitching) === normalizedStitchingStr;
      });

      if (existingItem) {
        const updatedItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });

        return res.status(200).json({
          isSuccess: true,
          message: "Catalogue item quantity updated.",
          data: updatedItem,
        });
      }

      const newItem = await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          catalogue_id,
          stitching: JSON.stringify(stitching),
          size: sizeStr,
          quantity,
          isCatalogue: true,
        },
      });

      if (stitching?.length > 0) {
        await addStitchingDetails(newItem.id, stitching);
      }

      return res.status(200).json({
        isSuccess: true,
        message: "New catalogue item added to cart.",
        data: newItem,
      });
    }

    // 7. Handle Single Product Add
    if (product_id) {
      const product = await prisma.product.findUnique({
        where: { id: product_id },
        include: { sizes: true, categories: true },
      });

      if (!product) {
        return res.status(404).json({ isSuccess: false, message: "Product not found." });
      }

      const existingItems = await prisma.cartItem.findMany({
        where: {
          cart_id: cart.id,
          product_id,
          isCatalogue: false,
        },
      });

      const existingItem = existingItems.find((item) => {
        const existingStitching = normalizeStitching(JSON.parse(item.stitching || "[]"));
        const existingSize = normalizeSize(JSON.parse(item.size || "{}"));
        return (
          JSON.stringify(existingStitching) === normalizedStitchingStr &&
          JSON.stringify(existingSize) === sizeStr
        );
      });

      if (existingItem) {
        const updatedItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });

        return res.status(200).json({
          isSuccess: true,
          message: "Product quantity updated in cart.",
          data: updatedItem,
        });
      }

      const newItem = await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id,
          stitching: JSON.stringify(stitching),
          size: sizeStr,
          quantity,
          isCatalogue: false,
        },
      });

      if (stitching?.length > 0) {
        await addStitchingDetails(newItem.id, stitching);
      }

      return res.status(200).json({
        isSuccess: true,
        message: "Product added to cart.",
        data: newItem,
      });
    }

    // 8. No product or catalogue ID
    return res.status(400).json({
      isSuccess: false,
      message: "Either product_id or catalogue_id must be provided.",
    });
  } catch (error) {
    console.error("Cart Add Error:", error);
    return next(new Error("Something went wrong, please try again."));
  }
};



const getAllcartitemOptimizecode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const finduser = await prisma.cart.findUnique({ where: { user_id: id } });


    if (!finduser) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Cart item not found" });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cart_id: finduser.id },
      include: {
        stitchingItems: {
          include: {
            option: true,
          },
        },
        product: {
          include: {
            categories: { include: { category: true } },
            sizes: { include: { size: true } },
          },
        },
        catalogue: {
          include: {
            Product: { include: { sizes: { include: { size: true } } } },
            CatalogueCategory: { include: { category: true } },
            CatalogueSize: { include: { size: true } },
          },
        },
      },
    });

    const { DataModified2, totalSubtotal, totalTax, totalWeight } =
      calculateCartItemTotal(cartItems);
    console.log("totalSubtotal", totalSubtotal)

    return res.status(200).json({
      status: true,
      message: "Cart Items Get Successfully",
      data: DataModified2,
      totalSubtotal,
      totalTax,
      totalOrder: parseFloat((totalSubtotal + totalTax).toFixed(2)),
    });
  } catch (error) {
    console.error(error);
    next(new Error("Something went wrong, please try again!"));
  }
};

export {
  updateCartItem,
  postCartItem,
  deleteCartItem,
  postCartItemOptimizeCode,
  getAllcartitemOptimizecode,
};
