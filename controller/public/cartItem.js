import prisma from "../../db/config.js";
import {
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
      return res.status(404).json({ isSuccess: false, message: "User not found." });

    let cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { user_id: user_id } });
    }

    if (stitching && Array.isArray(stitching) && stitching.length > 0) {
      console.log("stitching", stitching);
      return
      const stitchingValidationResult = await validateStitching(stitching);
      if (!stitchingValidationResult?.isValid)
        return res.status(400).json({
          isSuccess: false,
          message: stitchingValidationResult.message,
        });
    } else if (size) {
      const result = await isvalidstitching(size.id, "size");
      if (!result)
        return res.status(400).json({ isSuccess: false, message: "Size does not exist." });
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







const postCartItemOptimizeCode = async (req, res, next) => {
  try {
    // const user_id = req.user.id;
    let { product_id, catalogue_id, size, stitching, quantity, user_id } = req.body;
    const findUser = await prisma.users.findUnique({ where: { id: user_id } });
    if (!findUser)
      return res.status(404).json({ isSuccess: false, message: "User not found." });

    let cart = await prisma.cart.findUnique({ where: { user_id: user_id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { user_id: user_id } });
    }

    if (stitching) {
      const { success } = await validateStitchingOption(stitching);

      if (!success)
        return res.status(400).json({
          isSuccess: false,
          message: "Option Id Not Founf",
        });
    } else if (size) {
      const result = await isvalidstitching(size.id, "size");
      if (!result)
        return res.status(400).json({ isSuccess: false, message: "Size does not exist." });
    }

    if (catalogue_id && !product_id) {
      const products = await prisma.product.findMany({ where: { catalogue_id: catalogue_id }, });
      if (!products.length)
        return res.status(400).json({ error: "No products found in this catalogue" });

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

      if (stitching?.length > 0) {
        for (const stitch of stitching) {
          await prisma.cartItemStitching.create({
            data: {
              cartItem_id: result.id,
              stitching_option: stitch.optionid,
              measurment: stitch.measurment ? JSON.stringify(stitch.measurment) : null,
            },
          });
        }
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

      if (stitching && stitching?.length > 0) {
        for (const stitch of stitching) {
          await prisma.cartItemStitching.create({
            data: {
              cartItem_id: result.id,
              stitching_option: stitch.optionid,
              measurment: stitch.measurment ? JSON.stringify(stitch.measurment) : null,
            },
          });
        }
      }


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


const getAllcartitemOptimizecode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const finduser = await prisma.cart.findUnique({ where: { user_id: id } });

    if (!finduser) {
      return res.status(400).json({ isSuccess: false, message: "Cart item not found" });
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

    let totalSubtotal = 0;
    let totalTax = 0;

    const DataModified2 = await Promise.all(
      cartItems.map((item) => {
        const { quantity, size, isCatalogue, stitchingItems, catalogue, product } = item;
        const totalStitchingPrice = stitchingItems.reduce((acc, stitch) => acc + (stitch.option?.price || 0), 0);
        let subtotal = 0;
        let tax = 0;
        let outOfStock = false;

        if (isCatalogue && catalogue) {
          let availableProductCount = catalogue.Product.reduce((count, data) => {
            if (size) {
              const selectedSize = JSON.parse(size);
              const sizeData = data.sizes.find(s => s?.size?.id === selectedSize?.id);
              if (sizeData && sizeData.quantity >= quantity) return count + 1;
              data.outOfStock = true;
            } else {
              if (data.quantity >= quantity) return count + 1;
              data.outOfStock = true;
            }
            return count;
          }, 0);

          outOfStock = availableProductCount === 0;
          const sizePrice = size ? catalogue.Product[0]?.sizes?.find(s => s?.size?.id === JSON.parse(size)?.id)?.price || 0 : 0;
          subtotal = availableProductCount * (catalogue.average_price + sizePrice + totalStitchingPrice);
          tax = (subtotal * (catalogue.GST || 0)) / 100;
        } else if (product) {
          const sizePrice = size ? product.sizes?.find(s => s?.size?.id === JSON.parse(size)?.id)?.price || 0 : 0;
          if ((size && !sizePrice) || product.quantity < quantity) {
            outOfStock = true;
          } else {
            subtotal = (product.offer_price + sizePrice + totalStitchingPrice) * quantity;
            tax = (subtotal * (product.retail_GST || 0)) / 100;
          }
        }

        totalSubtotal += subtotal;
        totalTax += tax;

        return {
          id: item.id,
          product_id: item.product_id,
          catalogue_id: item.catalogue_id,
          isCatalogue,
          stitching: stitchingItems,
          no_of_product: catalogue?.no_of_product,
          average_price: catalogue?.average_price || product?.price,
          url: catalogue?.url || product?.url,
          name: catalogue?.name || product?.name,
          quantity,
          sku: catalogue?.cat_code || product?.sku,
          weight: catalogue?.weight || product?.weight,
          price: catalogue?.offer_price || product?.offer_price,
          image: catalogue?.coverImage || product?.image?.[0],
          category: { name: catalogue?.CatalogueCategory?.[0]?.category?.name || product?.categories?.[0]?.category?.name, url: catalogue?.CatalogueCategory?.[0]?.category?.url || product?.categories?.[0]?.category?.url },
          size,
          subtotal,
          tax,
          outOfStock,
          products: isCatalogue ? catalogue.Product.map(prod => ({
            name: prod.name,
            url: prod.url,
            quantity: prod.quantity,
            outOfStock: prod.outOfStock,
            code: prod.sku
          })) : undefined,
        };
      })
    );

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


export { updateCartItem, postCartItem, deleteCartItem, postCartItemOptimizeCode, getAllcartitemOptimizecode };
