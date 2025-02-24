import prisma from "../../db/config.js";
import { findCatalogueStitchingprice, findproductpriceOnSize, findproductpriceonStitching, getAllStitchingData } from "../../helper/cartItemHelper.js";
import { calculateShippingCost } from "../admin/shippingcharges.js";
import { rozarpay } from "../../config/paymentConfig.js";
import crypto from "crypto";
import "dotenv/config";
const OrderPlace = async (req, res, next) => {
    try {
        const { user_id, items, billingform, shippingdata, paymentMethod, shippingPrice, orderTotal, currency } = req.body;


        const finduser = await prisma.cart.findUnique({ where: { user_id: user_id } });
        if (!finduser) return res.status(400).json({ isSuccess: false, message: "User not found", data: null });
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

        if (cartItems?.length === 0) return res.status(400).json({ isSuccess: false, message: "items not Found", data: null });

        let subtotal = 0, tax = 0, totalweight = 0;
        let stitchingDataMap = [];
        for (let item of cartItems) {
            const { quantity, stitching, size, isCatalogue, catalogue, product_id } = item;
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
                    totalweight += Number(item.product?.weight) * Number(quantity);
                    stitchingDataMap = await getAllStitchingData(
                        parsedStitching,
                        parsedStitching
                    );
                }
            }
            subtotal += item.Subtotal;
            tax += item.Tax;

        }

        if (totalweight === 0) {
            return res.status(200).json({ isSuccess: false, message: "Total weight is 0", data: null });
        }

        const shippingconst = await calculateShippingCost(totalweight, shippingdata?.country);
        let ordertotal = (subtotal + tax + shippingconst.shippingCost);
        console.log("shippingconst", shippingconst)

        const order = await prisma.order.create({
            data: {
                userId: user_id,
                subtotal: subtotal,
                Tax: tax,
                shippingcharge: shippingconst.shippingCost,
                totalAmount: ordertotal,
                status: 'PENDING',
            },
        });


        await prisma.orderItem.createMany({
            data: cartItems.map(item => ({
                orderId: order.id,
                productId: item.product_id,
                catlogueId: item.catalogue_id,
                quantity: item.quantity,
                customersnotes: billingform.customersnotes,
            })),
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
                status: 'PENDING',
            },
        });

        let paymentData = {
            orderId: order.id,
            paymentMethod,
            status: 'PENDING',
        };


        const convertAmount = ordertotal / currency?.rate

        if (paymentMethod === 'RAZORPAY') {
            const razorpayOrder = await rozarpay.orders.create({
                amount: Math.round(convertAmount * 100),
                currency: currency?.code,
                receipt: `order_${order.id}`,
                payment_capture: 1
            });

            paymentData.transactionId = razorpayOrder.id;
        }



        const payment = await prisma.payment.create({ data: paymentData });

        await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentId: payment.id,
                billingId: billingData.id,
                shippingId: shippingData.id,
            },
        });

        const response = {
            orderId: order.id,
            razorpayOrderId: paymentData.transactionId,
            currency: currency,
            amount: Math.round(convertAmount * 100),

        }

        return res.status(201).json({
            message: 'Order Id generated successfully',
            data: response,
            isSuccess: true

        });
    } catch (error) {
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
}








const verifyOrder = async (req, res, next) => {
    try {
        const { orderId, transactionId, paymentMethod, status, razorpayOrderId, paymentId, signature } = req.body;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ isSuccess: false, message: "Order not found" });

        if (paymentMethod === "RAZORPAY") {
            const expectedSignature = crypto
                .createHmac("sha256", process.env.ROZARPAY_KEY_SECRET)
                .update(`${razorpayOrderId}|${paymentId}`)
                .digest("hex");

            if (expectedSignature !== signature) {
                return res.status(400).json({ isSuccess: false, message: "Invalid payment signature" });
            }
        }


        const stockCheck = await checkStock(orderId);
        if (!stockCheck.isSuccess) {
            return res.status(400).json({ isSuccess: false, message: stockCheck.message });
        }

        if (status === "SUCCESS") {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "CONFIRMED" },
            });

            await prisma.payment.update({
                where: { orderId: orderId },
                data: { transactionId, status: "SUCCESS" },
            });

            await reduceProductQuantity(orderId);

            return res.status(200).json({ isSuccess: true, message: "Order placed successfully" });
        } else {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "FAILED" },
            });
            return res.status(400).json({ isSuccess: false, message: "Payment failed" });
        }
    } catch (error) {
        next(new Error("Something went wrong!"));
    }
};



const checkStock = async (orderId) => {
    try {
        const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
        for (let item of orderItems) {
            if (item.productId) {
                const product = await prisma.product.findUnique({ where: { id: item.productId } });
                if (!product || product.quantity < item.quantity) {
                    return { isSuccess: false, message: `${product?.name || "Product"} is out of stock` };
                }
            }
            if (item.catlogueId) {
                const catalogue = await prisma.catalogue.findUnique({ where: { id: item.catlogueId } });
                if (!catalogue || catalogue.quantity < item.quantity) {
                    return { isSuccess: false, message: `${catalogue?.name || "Catalogue"} is out of stock` };
                }
            }
        }
        return { isSuccess: true };
    } catch (error) {
        return { isSuccess: false, message: "Stock check failed" };
    }
};



const reduceProductQuantity = async (orderId) => {
    try {
        const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
        for (let item of orderItems) {
            if (item.productId) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } },
                });
            }
            if (item.catlogueId) {
                const result = await prisma.catalogue.update({
                    where: { id: item.catlogueId },
                    data: { quantity: { decrement: item.quantity } },
                    select: {
                        id: true
                    }
                });

                if (result) {
                    await prisma.product.updateMany({
                        where: {
                            catalogue_id: result.id
                        },
                        data: { quantity: { decrement: item.quantity } },
                    })
                }
            }
        }
    } catch (error) {
        console.error("Error reducing product quantity:", error);
    }
};

export default OrderPlace;
export { verifyOrder };