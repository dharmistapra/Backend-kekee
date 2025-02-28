import prisma from "../../db/config.js";
import { updateStatus } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";
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
        const result = await prisma.order.findMany({
            where: {
                userId: userId
            },
            select: {
                id: true,
                createdAt: true,
                status: true,
                totalAmount: true,
                orderItems: {
                    select: {
                        productname: true,
                        type: true,
                        quantity: true,
                        productsnapshots: true,
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
        })

        const formattedResult = result.map(order => {
            const product = order.orderItems[0];
            const parsedata = JSON.parse(product.productsnapshots)
            const payment = order.payment[0]
            return {
                orderId: order?.id,
                productName: parsedata?.name || 'N/A',
                orderDate: new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }),
                status: order.status,
                amount: order.totalAmount.toFixed(2),
                quantity: parsedata?.cartQuantity || '',
                type: parsedata?.type || "",
                url: parsedata?.url || "",
                paymentMethod: payment.paymentMethod,
                paymentstatus: payment.status

            }
        });

        return res.status(200).json({
            message: "Order history fetched successfully",
            isSuccess: true,
            data: formattedResult
        });


    } catch (error) {
        console.log(error)
        let err = new Error("Something went wrong, Please try again!");
        next(err)
    }
}


const getOrderdetailsUsers = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        const orderDetails = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                createdAt: true,
                subtotal: true,
                Tax: true,
                discount: true,
                shippingcharge: true,
                totalAmount: true,
                status: true,
                orderItems: {
                    select: {
                        id: true,
                        quantity: true,
                        productsnapshots: true,
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
                    },
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
                        GstNumber: true,
                        companyname: true,
                        whatsapp: true,
                    }
                },
                payment: {
                    select: {
                        paymentMethod: true,
                        transactionId: true,
                        status: true,
                        bankAccountId: true,
                        bankaccount: {
                            select: {
                                bankName: true,
                                accountHolderName: true,
                                accountNumber: true,
                                ifscCode: true,
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

        const transformedOrderItems = orderDetails.orderItems.map(item => ({
            ...item,
            productsnapshots: JSON.parse(item.productsnapshots)
        }));

        return res.status(200).json({
            message: "Order retrieved successfully",
            isSuccess: true,
            data: {
                ...orderDetails,
                orderDate: new Date(orderDetails.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }),
                orderItems: transformedOrderItems,
            },
        });

    } catch (error) {
        console.log("Error fetching order details:", error);
        let err = new Error("Something went wrong, Please try again!");
        next(err);
    }
};
export { paginationusers, updateUsersStatus, getOrderHistoryusers, getOrderdetailsUsers }