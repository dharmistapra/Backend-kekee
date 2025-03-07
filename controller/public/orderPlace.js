import prisma from "../../db/config.js";
import {
    findCatalogueStitchingprice,
    findproductpriceOnSize,
    findproductpriceonStitching,
    getAllStitchingData,
} from "../../helper/cartItemHelper.js";
import { calculateShippingCost } from "../admin/shippingcharges.js";
import { rozarpay } from "../../config/paymentConfig.js";
import crypto from "crypto";
import "dotenv/config";
const OrderPlace = async (req, res, next) => {
    try {
        const { user_id, billingform, shippingdata, paymentMethod, currency, bankdata } = req.body;
        const finduser = await prisma.cart.findUnique({ where: { user_id: user_id } });

        if (!finduser)
            return res.status(400).json({ isSuccess: false, message: "User not found", data: null });
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
                        url: true,
                        quantity: true,
                        price: true,
                        GST: true,
                        offer_price: true,
                        coverImage: true,
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

        if (cartItems?.length === 0)
            return res
                .status(400)
                .json({ isSuccess: false, message: "items not Found", data: null });

        let outOfStockItems = [];
        for (const item of cartItems) {
            if (!item.isCatalogue) {
                if (item.quantity > item.product.quantity) {
                    outOfStockItems.push(`Product: ${item.product.sku}`);
                }
            } else {
                if (item.quantity > item.catalogue.quantity) {
                    outOfStockItems.push(`Catalogue: ${item.catalogue.cat_code}`);
                }
            }
        }

        if (outOfStockItems.length > 0) {
            return res.status(400).json({
                isSuccess: false,
                message: `Stock unavailable for: ${outOfStockItems.join(", ")}`,
                data: null,
            });
        }

        let subtotal = 0,
            tax = 0,
            totalweight = 0,
            discount = 0;
        let stitchingDataMap = [];
        for (let item of cartItems) {
            const { quantity, stitching, size, isCatalogue, catalogue, product_id } =
                item;
            if (item.isCatalogue && item.catalogue_id) {
                const checkproductquantity = catalogue?.Product?.map((data) => {
                    if (data.quantity < quantity) {
                        return { ...data, outOfStock: true };
                    }
                    return data;
                });

                catalogue.Product = checkproductquantity;
                if (item.stitching) {
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
                    item.discount = item.price - item.offer_price;
                    totalweight += Number(catalogue?.weight) * Number(quantity);
                    stitchingDataMap = await getAllStitchingData(
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
                    item.discount = item.price - item.offer_price;
                    totalweight += Number(item.product?.weight) * Number(quantity);
                    stitchingDataMap = await getAllStitchingData(
                        parsedStitching,
                        parsedStitching
                    );
                }
            }
            subtotal += item.Subtotal;
            tax += item.Tax;
            discount += item.discount;
        }

        if (totalweight === 0) {
            return res
                .status(200)
                .json({ isSuccess: false, message: "Total weight is 0", data: null });
        }

        const shippingconst = await calculateShippingCost(
            totalweight,
            shippingdata?.country
        );

        let findstitchingcharge = subtotal

        let ordertotal = subtotal + tax + shippingconst.shippingCost;
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // Format YYYYMMDD
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const orderId = `ORD-${date}-${time}`;

        const order = await prisma.order.create({
            data: {
                userId: user_id,
                orderId: orderId,
                subtotal: subtotal,
                Tax: tax,
                discount: discount,
                shippingcharge: shippingconst.shippingCost,
                totalAmount: ordertotal,
                status: "PENDING",
            },
        });


        await prisma.orderItem.createMany({
            data: cartItems.map((item) => {
                let snapshot = {};
                let itemSubtotal = 0;

                if (item.isCatalogue) {
                    const availableProducts = item.catalogue.Product.filter(
                        (prod) => prod.quantity >= item.quantity
                    ).map((prod) => ({
                        id: prod.id,
                        name: prod.name,
                        sku: prod.sku,
                        url: prod.url,
                        offer_price: prod.offer_price,
                    }));

                    itemSubtotal = item.catalogue.offer_price * item.quantity;

                    snapshot = {
                        type: "catalogue",
                        name: item.catalogue.name,
                        url: item.catalogue.url,
                        price: item.catalogue.offer_price,
                        cartQuantity: item.quantity,
                        products: availableProducts,
                        discount: item.catalogue_discount,
                        tax: item.isCatalogue?.GST,
                        subtotal: subtotal,
                        stitchingcharges: Math.round(findstitchingcharge - item.catalogue.offer_price),
                        stitching: stitchingDataMap,
                    };
                } else {
                    itemSubtotal = item.product.offer_price * item.quantity;

                    snapshot = {
                        type: "product",
                        name: item.product.name,
                        url: item.product.url,
                        price: item.product.offer_price,
                        cartQuantity: item.quantity,
                        discount: item.retail_discount,
                        tax: item.isCatalogue?.retail_GST,
                        subtotal: subtotal,
                        stitchingcharges: Math.round(findstitchingcharge - item.product.offer_price),
                        stitching: stitchingDataMap,
                    };
                }

                return {
                    orderId: order.id,
                    productId: item.product_id,
                    catlogueId: item.catalogue_id,
                    quantity: item.quantity,
                    customersnotes: billingform.customersnotes,
                    productname: item.isCatalogue
                        ? item.catalogue.name
                        : item.product.name,
                    type: item.isCatalogue ? "catalogue" : "single",
                    productsnapshots: JSON.stringify(snapshot),
                };
            }),
        });

        const billingData = await prisma.billing.create({
            data: {
                orderId: order.id,
                email: billingform.email,
                fullName: billingform.fullName,
                country: billingform.country,
                state: billingform.state,
                city: billingform.city,
                zipCode: billingform.zipCode,
                address1: billingform.address1,
                address2: billingform.address2,
                companyname: billingform.companyname,
                GstNumber: billingform.GstNumber,
                mobile: billingform.mobile,
                whatsapp: billingform.whatsapp,
            },
        });

        const shippingData = await prisma.shipping.create({
            data: {
                orderId: order.id,
                fullName: shippingdata.fullName,
                country: shippingdata.country,
                state: shippingdata.state,
                city: shippingdata.city,
                zipCode: shippingdata.zipCode,
                address1: shippingdata.address1,
                address2: shippingdata.address2,
                mobile: shippingdata.mobile,
                status: "PENDING",
            },
        });



        const convertAmount = ordertotal / currency?.rate;
        let bankAccountId = null;
        let paymentData;
        if (paymentMethod === "razorpay") {
            const razorpayOrder = await rozarpay.orders.create({
                amount: Math.round(convertAmount * 100),
                currency: currency?.code,
                receipt: `order_${order.orderId}`,
                payment_capture: 1,
            });

            paymentData = {
                orderId: order.id,
                paymentMethod,
                status: "PROCESSING",
                bankAccountId: bankAccountId,
                transactionId: razorpayOrder.id
            };
        }

        if (paymentMethod === "bank") {
            const bankrecordCreate = await prisma.bankAccount.create({
                data: bankdata,
                select: {
                    id: true
                }
            })

            bankAccountId = bankrecordCreate?.id
            paymentData = {
                orderId: order.id,
                paymentMethod,
                status: "PROCESSING",
                bankAccountId: bankAccountId
            };
        }
        const payment = await prisma.payment.create({ data: paymentData });

        const response = {
            orderId: order.orderId,
            razorpayOrderId: paymentData.transactionId,
            currency: currency,
            amount: Math.round(convertAmount * 100),
        };

        return res.status(200).json({
            message: "Order generated successfully",
            data: response,
            isSuccess: true,
        });
    } catch (error) {
        console.log(error)
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};


const verifyOrder = async (req, res, next) => {
    try {
        const {
            orderId,
            transactionId,
            paymentMethod,
            status,
            razorpayOrderId,
            paymentId,
            signature,
        } = req.body;

        const order = await prisma.order.findUnique({ where: { orderId: orderId }, select: { id: true } });
        if (!order)
            return res
                .status(404)
                .json({ isSuccess: false, message: "Order not found" });

        if (paymentMethod === "razorpay") {
            const expectedSignature = crypto
                .createHmac("sha256", process.env.ROZARPAY_KEY_SECRET)
                .update(`${razorpayOrderId}|${paymentId}`)
                .digest("hex");

            if (expectedSignature !== signature) {
                return res
                    .status(400)
                    .json({ isSuccess: false, message: "Invalid payment signature" });
            }
        }



        if (status === "SUCCESS") {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: "PROCESSING" },
            });

            await prisma.payment.update({
                where: { orderId: order.id },
                data: { transactionId, status: "SUCCESS" },
            });

            return res
                .status(200)
                .json({ isSuccess: true, message: "Order placed successfully" });
        } else {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Payment failed" });

        }

        //     await reduceProductQuantity(orderId);

        //     return res
        //         .status(200)
        //         .json({ isSuccess: true, message: "Order placed successfully" });
        // } else {
        //     await prisma.order.update({
        //         where: { orderId: orderId },
        //         data: { status: "FAILED" },
        //     });
        //     return res
        //         .status(400)
        //         .json({ isSuccess: false, message: "Payment failed" });
        // }
    } catch (error) {
        console.log(error)
        next(new Error("Something went wrong!"));
    }
};

export const checkStock = async (orderId) => {
    try {

        const findorderId = await prisma.order.findUnique({ where: { orderId: orderId }, select: { id: true } })
        const orderItems = await prisma.orderItem.findMany({ where: { orderId: findorderId?.id } });
        for (let item of orderItems) {
            if (item.productId) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product || product.quantity < item.quantity) {
                    return {
                        isSuccess: false,
                        message: `${product?.name || "Product"} is out of stock`,
                    };
                }
            }
            if (item.catlogueId) {
                const catalogue = await prisma.catalogue.findUnique({
                    where: { id: item.catlogueId },
                });
                if (!catalogue || catalogue.quantity < item.quantity) {
                    return {
                        isSuccess: false,
                        message: `${catalogue?.name || "Catalogue"} is out of stock`,
                    };
                }
            }
        }
        return { isSuccess: true };
    } catch (error) {
        console.log("errrr", error)
        return { isSuccess: false, message: "Stock check failed" };
    }
};


export const reduceProductQuantity = async (orderId) => {
    try {
        const findorderId = await prisma.order.findUnique({ where: { orderId: orderId }, select: { id: true } })
        const orderItems = await prisma.orderItem.findMany({ where: { orderId: findorderId?.id } });
        for (let item of orderItems) {
            if (item.productId) {
                const result = await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } },
                    select: {
                        id: true,
                        catalogue_id: true,
                        quantity: true,
                        average_price: true,
                    },
                });
                if (result.quantity == 0) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: {
                            outofStock: true,
                        },
                    });
                }

                if (result.catalogue_id && result.quantity == 0) {
                    const findacatalogue = await prisma.catalogue.findUnique({
                        where: { id: result.catalogue_id },
                        select: {
                            id: true,
                            price: true,
                        },
                    });

                    const updatecataloguePrice =
                        findacatalogue.price - result.average_price;

                    await prisma.catalogue.update({
                        where: { id: result.catalogue_id },
                        data: {
                            no_of_product: { decrement: 1 },
                            price: updatecataloguePrice,
                        },
                    });
                }
            }
            if (item.catlogueId) {
                const result = await prisma.catalogue.update({
                    where: { id: item.catlogueId },
                    data: { quantity: { decrement: item.quantity } },
                    select: { id: true },
                });

                if (result.id) {
                    await prisma.product.updateMany({
                        where: {
                            catalogue_id: result.id,
                            quantity: { gt: 0 },
                        },
                        data: { quantity: { decrement: item.quantity } },
                    });

                    await prisma.product.updateMany({
                        where: {
                            catalogue_id: result.id,
                            quantity: { equals: 0 },
                        },
                        data: {
                            outofStock: true,
                        },
                    });

                    const catalogue = await prisma.catalogue.findUnique({
                        where: { id: result.id },
                        select: { offer_price: true },
                    });

                    const checkstockoproduct = await prisma.product.findMany({
                        where: {
                            catalogue_id: result.id,
                            outofStock: false,
                        },
                    });

                    await prisma.catalogue.update({
                        where: { id: result.id },
                        data: {
                            no_of_product: checkstockoproduct.length,
                        },
                    });

                    if (checkstockoproduct.length > 0) {
                        const newAveragePrice =
                            catalogue.offer_price / checkstockoproduct.length;

                        await prisma.catalogue.update({
                            where: { id: result.id },
                            data: {
                                average_price: newAveragePrice,
                            },
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error reducing product quantity:", error);
    }
};

const orderFailed = async (req, res) => {
    const { orderId, status, paymentMethod } = req.body;

    try {
        await prisma.order.update({
            where: { orderId: orderId },
            data: { status: status },
        });

        await prisma.payment.update({
            where: { orderId: orderId },
            data: { status: status },
        });

        return res.json({
            success: true,
            message: "Payment status updated to CANCELLED!",
        });
    } catch (error) {
        console.error("Error updating payment status:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to update payment status" });
    }
};

export default OrderPlace;
export { verifyOrder, orderFailed };
