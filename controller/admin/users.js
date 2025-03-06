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
        ]
        const searchFilter = createSearchFilter(search, filter);

        const count = await prisma.users.count({ where: searchFilter || undefined });
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
                    }
                }
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
        console.log("error", error)
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
        console.log('users-status', err)
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
        const result = await prisma.order.findMany({
            where: whereCondition,
            select: {
                orderId: true,
                createdAt: true,
                status: true,
                totalAmount: true,

                orderItems: {
                    select: {
                        productname: true,
                        type: true,
                        quantity: true,
                        productsnapshots: true,
                        product: {
                            select: {
                                sku: true,
                                image: true,
                            }
                        },
                        catalogue: {
                            select: {
                                cat_code: true,
                                coverImage: true
                            }
                        }
                    }
                },
                payment: {
                    select: {
                        paymentMethod: true,
                        status: true,
                    }

                }
            },
            skip,
            take
        });

        const formattedResult = result.map(order => {
            const product = order.orderItems[0];
            const parsedata = JSON.parse(product?.productsnapshots ? product?.productsnapshots : []);
            const payment = order.payment?.[0];
            return {
                orderId: order?.orderId,
                productName: parsedata?.name || 'N/A',
                orderDate: new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }),
                status: order.status,
                amount: order.totalAmount.toFixed(2),
                quantity: parsedata?.cartQuantity || '',
                type: parsedata?.type || "",
                url: parsedata?.url || "",
                paymentMethod: payment?.paymentMethod,
                paymentstatus: payment?.status,
                image: product?.product?.image || product.catalogue.coverImage,
                sku: product?.product?.sku || product.catalogue.cat_code,
            };
        });

        return res.status(200).json({
            message: "Order history fetched successfully",
            isSuccess: true,
            data: formattedResult
        });

    } catch (error) {
        console.log(error)
        let err = new Error("Something went wrong, Please try again!");
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
                user: {
                    select: {
                        name: true,
                        email: true,
                        mobile_number: true
                    }
                },
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        productsnapshots: true,
                        type: true,
                    }
                },
                shipping: {
                    select: {
                        fullName: true,
                        address1: true,
                        address2: true,
                        city: true,
                        country: true,
                        state: true,
                        zipCode: true,
                        mobile: true,
                    }
                },
                billing: {
                    select: {
                        fullName: true,
                        address1: true,
                        address2: true,
                        city: true,
                        country: true,
                        state: true,
                        zipCode: true,
                        mobile: true,
                    }
                },
                payment: {
                    select: {
                        paymentMethod: true,
                        transactionId: true,
                        status: true,
                        bankaccount:{
                            select:{
                                bankName:true,
                                accountHolderName:true,
                                ifscCode:true,
                                accountNumber:true
                            }
                        }
                    }
                }
            }
        });

        if (!orderDetails) {
            return res.status(404).json({
                message: "Order not found",
                isSuccess: false,
            });
        }

        let totalStitchingCharges = 0;
        const transformedOrderItems = orderDetails.orderItems.map(item => {
            const productSnapshot = JSON.parse(item.productsnapshots);
            totalStitchingCharges += productSnapshot.stitchingcharges || 0;

            return {
                id: item.id,
                quantity: item.quantity,
                productName: productSnapshot.name,
                price: productSnapshot.price,
                subtotal: productSnapshot.subtotal,
                products: productSnapshot.products,
                type: item.type,
                stitching: productSnapshot.stitching.map(stitch => ({
                    stitchingGroupName: stitch.stitchingGroup?.name || '',
                    options: stitch.option.map(opt => ({
                        name: opt.name,
                        price: opt.price,
                        dispatchTime: opt.dispatch_time
                    }))
                }))
            };
        });

        const response = {
            message: "Order retrieved successfully",
            isSuccess: true,
            data: {
                orderId: orderDetails.id,
                orderDate: new Date(orderDetails.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }),
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

                shippingDetails: orderDetails.shipping.length > 0 ? orderDetails.shipping[0] : {},
                billingDetails: orderDetails.billing.length > 0 ? orderDetails.billing[0] : {},

                paymentDetails: orderDetails.payment,
                orderItems: transformedOrderItems,
            },
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching order details:", error);
        next(new Error("Something went wrong, Please try again!"));
    }
};

// const updateOrderStatus = async (req, res, next) => {
//     try {
//         const { orderstatus, orderId } = req.body;
//         const order = await prisma.order.findUnique({ where: { orderId: orderId }, select: { id: true } });
//         if (!order) {
//             return res.status(400).json({ message: "Order not found", isSuccess: false });
//         }

//         const initialStatus = order.status;


//         if (orderstatus === "CONFIRMED") {
//             const stockCheck = await checkStock(orderId);
//             if (!stockCheck.isSuccess) {
//                 return res.status(400).json({ isSuccess: false, message: stockCheck.message });
//             }
//             await reduceProductQuantity(orderId);
//         } else if (initialStatus === "CONFIRMED" && orderstatus !== "CONFIRMED") {
//             await revertProductQuantity(orderId.id);
//         }

//         await prisma.order.update({
//             where: { orderId },
//             data: { status: orderstatus },
//         });

//         return res.status(200).json({ isSuccess: true, message: "Order status updated successfully" });

//     } catch (error) {
//         console.log(error)
//         next(new Error("Something went wrong, Please try again!"));
//     }
// }





const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderstatus, orderId } = req.body;

        // Fetch the current order status
        const order = await prisma.order.findUnique({
            where: { orderId },
            select: { id: true, status: true }, // Select current status
        });

        if (!order) {
            return res.status(400).json({ message: "Order not found", isSuccess: false });
        }

        const initialStatus = order.status;
        if (orderstatus === "CONFIRMED" && initialStatus !== "CONFIRMED") {
            const stockCheck = await checkStock(orderId);
            if (!stockCheck.isSuccess) {
                return res.status(400).json({ isSuccess: false, message: stockCheck.message });
            }
            await reduceProductQuantity(orderId);
        }
        else if (initialStatus === "CONFIRMED" && orderstatus !== "CONFIRMED") {
            await revertProductQuantity(order.id);
        }

        await prisma.order.update({
            where: { orderId },
            data: { status: orderstatus },
        });

        return res.status(200).json({ isSuccess: true, message: "Order status updated successfully" });

    } catch (error) {
        console.log(error);
        next(new Error("Something went wrong, Please try again!"));
    }
};


const revertProductQuantity = async (orderId) => {
    const orderDetails = await prisma.orderItem.findMany({
        where: { orderId },
    });

    for (const item of orderDetails) {
        if (item.catlogueId) {
            await prisma.catalogue.update({
                where: { id: item.catlogueId },
                data: { quantity: { increment: item.quantity } },
            });

            await prisma.product.updateMany({
                where: {
                    catalogue_id: item.catlogueId
                },
                data: { quantity: { increment: item.quantity } },
            })
        } else {
            await prisma.product.update({
                where: { id: item.productId },
                data: { quantity: { increment: item.quantity } },
            });
        }
    }
};


export { paginationusers, updateUsersStatus, getOrderHistoryusers, getOrderdetailsUsers, updateOrderStatus }