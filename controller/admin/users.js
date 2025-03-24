import prisma from "../../db/config.js";
import { updateStatus } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";
import { checkStock, reduceProductQuantity } from "../public/orderPlace.js";
const paginationusers = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    const searchFilter = createSearchFilter(search, filter);

    const count = await prisma.users.count({
      where: searchFilter || undefined,
    });
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "users not found!", data: [] });

    const result = await prisma.users.findMany({
      where: searchFilter || undefined,
      select: {
        id: true,
        name: true,
        email: true,
        mobile_number: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "users get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
      let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
const updateUsersStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("users", id);
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

const getOrderHistoryusers = async (req, res, next) => {
  try {
    const { perPage, pageNo, userId } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const whereCondition = userId ? { userId: userId } : {};

    const count = await prisma.order.count({ where: whereCondition })

    const result = await prisma.order.findMany({
      where: whereCondition,
      select: {
        orderId: true,
        createdAt: true,
        status: true,
        totalAmount: true,
        _count: { select: { orderItems: true } },
        payment: { select: { paymentMethod: true, status: true } },
        orderItems: {
          select: {
            quantity: true,
            product: { select: { sku: true, image: true } },
            catalogue: { select: { cat_code: true, coverImage: true } },
          },
        },
      },
      skip,
      take,
    });

    const formattedResult = result.map((order) => {
      const payment = order.payment[0] || null;
      const orderItem = order.orderItems[0] || {};
      const { sku, image } = orderItem.product || {};
      const { cat_code, coverImage } = orderItem.catalogue || {};

      return {
        orderId: order.orderId,
        createdAt: order.createdAt,
        status: order.status,
        totalAmount: order.totalAmount,
        orderItemCount: order._count.orderItems,
        payment,
        orderItems: orderItem
          ? {
            sku: sku || cat_code,
            image: image?.[0] || coverImage,
          }
          : null,
      };
    });

    return res.status(200).json({
      message: "Order history fetched successfully",
      isSuccess: true,
      data: formattedResult,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (error) {
    const err = new Error("Something went wrong, Please try again!");
    next(err);
  }
};

const getOrderdetailsUsers = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const orderDetails = await prisma.order.findUnique({
      where: { orderId: orderId },
      select: {
        id: true,
        createdAt: true,
        subtotal: true,
        Tax: true,
        discount: true,
        shippingcharge: true,
        totalAmount: true,
        status: true,
        billingAddress: true,
        shippingAddress: true,
        user: {
          select: {
            name: true,
            email: true,
            mobile_number: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            productsnapshots: true,
            // type: true,
            product: {
              select: {
                name: true,
                sku: true,
                image: true,
                quantity: true,
              },
            },
            catalogue: {
              select: {
                name: true,
                cat_code: true,
                coverImage: true,
                quantity: true,
              },
            },
          },
        },
        payment: {
          select: {
            paymentMethod: true,
            transactionId: true,
            status: true,
            bankaccount: {
              select: {
                bankName: true,
                accountHolderName: true,
                ifscCode: true,
                accountNumber: true,
              },
            },
          },
        },
      },
    });

    if (!orderDetails) {
      return res.status(404).json({
        message: "Order not found",
        isSuccess: false,
      });
    }

    let totalStitchingCharges = 0;
    const transformedOrderItems = orderDetails.orderItems.map((item) => {
      return {
        id: item.id,
        quantity: item.quantity,
        products: JSON.parse(item.productsnapshots),
        name: item?.catalogue?.name || item?.product?.name,
        sku: item?.catalogue?.cat_code || item?.product?.sku,
        type: item?.catalogue?.cat_code ? "Catalogue" : "products",
        image: item?.catalogue?.coverImage || item?.product?.image[0],
      };
    });



    const response = {
      message: "Order retrieved successfully",
      isSuccess: true,
      data: {
        orderId: orderDetails.id,
        orderDate: new Date(orderDetails.createdAt).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        ),
        subtotal: orderDetails.subtotal,
        tax: orderDetails.Tax,
        discount: orderDetails.discount,
        shippingCharge: orderDetails.shippingcharge,
        stitchingCharges: totalStitchingCharges,
        totalAmount: orderDetails.totalAmount,
        status: orderDetails.status,
        name: orderDetails?.user?.name,
        email: orderDetails?.user?.email,
        phone: orderDetails?.user?.mobile_number,
        shippingDetails: typeof orderDetails?.shippingAddress === "string"
          ? JSON.parse(orderDetails.shippingAddress)
          : {},

        billingDetails: typeof orderDetails?.billingAddress === "string"
          ? JSON.parse(orderDetails.billingAddress)
          : {},


        paymentDetails: orderDetails.payment,
        orderItems: transformedOrderItems,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(new Error("Something went wrong, Please try again!"));
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderstatus, orderId } = req.body;
    const order = await prisma.order.findUnique({ where: { orderId }, select: { id: true, status: true }, });
    if (!order) return res.status(400).json({ message: "Order not found", isSuccess: false });

    const initialStatus = order.status;
    if (orderstatus === "CONFIRMED" && initialStatus !== "CONFIRMED") {
      const stockCheck = await checkStock(orderId);

      if (!stockCheck.isSuccess) {
        return res.status(400).json({ isSuccess: false, message: stockCheck.message });
      }

      const reduceResponse = await reduceProductQuantity(orderId);
      if (!reduceResponse.isSuccess) {
        return res.status(400).json(reduceResponse);
      }

    } else if (initialStatus === "CONFIRMED" && orderstatus !== "CONFIRMED") {
      const revertResponse = await revertProductQuantity(order.id);
      if (!revertResponse.isSuccess) {
        return res.status(400).json(revertResponse);
      }
    }

    await prisma.order.update({
      where: { orderId },
      data: { status: orderstatus },
    });

    return res
      .status(200)
      .json({ isSuccess: true, message: "Order status updated successfully" });
  } catch (error) {
    console.log(error);
    next(new Error("Something went wrong, Please try again!"));
  }
};

// const revertProductQuantity = async (orderId) => {
//   const orderDetails = await prisma.orderItem.findMany({ where: { orderId } });

//   for (const item of orderDetails) {
//     if (item.catlogueId) {
//       await prisma.catalogue.update({
//         where: { id: item.catlogueId },
//         data: { quantity: { increment: item.quantity } },
//       });

//       await prisma.product.updateMany({
//         where: {
//           catalogue_id: item.catlogueId,
//         },
//         data: { quantity: { increment: item.quantity } },
//       });
//     } else {
//       await prisma.product.update({
//         where: { id: item.productId },
//         data: { quantity: { increment: item.quantity } },
//       });
//     }
//   }
// };



const revertProductQuantity = async (orderId) => {
  try {
    const orderDetails = await prisma.orderItem.findMany({
      where: { orderId },
      select: { productId: true, catlogueId: true, quantity: true, productsnapshots: true }
    });

    if (!orderDetails.length) {
      return { isSuccess: false, message: "No order items found" };
    }

    for (const item of orderDetails) {
      try {
        const extractSize = item.productsnapshots ? JSON.parse(item.productsnapshots)?.size : null;

        if (item.catlogueId) {
          if (extractSize) {
            const sizeId = JSON.parse(extractSize)?.id;

            await prisma.catalogueSize.update({
              where: {
                catalogue_id_size_id: {
                  catalogue_id: item.catlogueId,
                  size_id: sizeId
                }
              },
              data: { quantity: { increment: item.quantity } }
            });
          }

          await prisma.catalogue.update({
            where: { id: item.catlogueId },
            data: { quantity: { increment: item.quantity } }
          });

          await prisma.product.updateMany({
            where: { catalogue_id: item.catlogueId },
            data: { quantity: { increment: item.quantity } }
          });
        } else if (item.productId) {

          if (extractSize) {
            const sizeId = JSON.parse(extractSize)?.id;
            await prisma.productSize.update({
              where: {
                product_id_size_id: {
                  product_id: item?.productId,
                  size_id: sizeId
                }
              },
              data: { quantity: { increment: item.quantity } }
            })
          }
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } }
          });
        }
      } catch (error) {
        console.error(`Error processing order item (ID: ${item.productId || item.catlogueId}):`, error);
        return { isSuccess: false, message: "Error processing some order items" };
      }
    }

    return { isSuccess: true, message: "Product quantities reverted successfully" };
  } catch (error) {
    console.error("Error reverting product quantity:", error);
    return { isSuccess: false, message: "Internal server error" };
  }
};



export {
  paginationusers,
  updateUsersStatus,
  getOrderHistoryusers,
  getOrderdetailsUsers,
  updateOrderStatus,
};
