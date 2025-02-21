import prisma from "../../db/config.js";
import { findCatalogueStitchingprice, findproductpriceOnSize, findproductpriceonStitching, getAllStitchingData } from "../../helper/cartItemHelper.js";
import { calculateShippingCost } from "../admin/shippingcharges.js";
import { rozarpay } from "../../config/paymentConfig.js";
const OrderPlace = async (req, res, next) => {
    try {
        const { user_id, items, billingform, shippingdata, paymentMethod, shippingPrice, orderTotal } = req.body;
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
                    console.log("totalweightPPPPPPPPPPPP============>", totalweight)
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

                    console.log("totalweight============>", totalweight)
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

        const order = await prisma.order.create({
            data: {
                user_id: user_id,
                subtotal,
                Tax: tax,
                shippingCharge: shippingconst.shippingCost,
                totalAmount: ordertotal,
                totalAmount: ordertotal,
                status: 'PENDING',
            },
        });


        await prisma.orderItem.createMany({
            data: items.map(item => ({
                orderId: order.id,
                productId: item.productId,
                catalogueId: item.catalogueId,
                quantity: item.quantity,
                customersnotes: billingform.customersnotes,
            })),
        });


        const billingData = await prisma.billing.create({
            data: { orderId: order.id, ...billing },
        });


        const shippingData = await prisma.shipping.create({
            data: { orderId: order.id, ...shipping, shippingChargeId: shippingCharge },
        });


        const payment = await prisma.payment.create({ data: paymentData });

        await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentId: payment.id,
                billingId: billingData.id,
                shippingId: shippingData.id,
            },
        });


        res.status(201).json({
            message: 'Order placed successfully',
            orderId: order.id,
            razorpayOrderId: paymentData.transactionId,
        });


        let paymentData = {
            orderId: order.id,
            paymentMethod,
            status: 'PENDING',
        };



        if (paymentMethod === 'razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: finalAmount,
                currency: "INR",
                receipt: `order_${order.id}`,
                payment_capture: 1
            });

            paymentData.transactionId = razorpayOrder.id;
        }

    } catch (error) {
        console.log("error", error);
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
}


export default OrderPlace;