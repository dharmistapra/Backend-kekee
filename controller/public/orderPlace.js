import prisma from "../../db/config.js";
import {
    calculateCartItemTotal,
} from "../../helper/cartItemHelper.js";
import { calculateShippingCost } from "../admin/shippingcharges.js";
import { rozarpay } from "../../config/paymentConfig.js";
import crypto from "crypto";
import "dotenv/config";
const OrderPlace = async (req, res, next) => {
    try {
        const { user_id, billingform, shippingdata, paymentMethod, currency, bankdata, defaultAddressId } = req.body;
        const finduser = await prisma.cart.findUnique({ where: { user_id: user_id } });
        if (!finduser) res.status(400).json({ isSuccess: false, message: "User not found", data: null });

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

        const { DataModified2, totalSubtotal, totalTax, totalWeight } = calculateCartItemTotal(cartItems);
        if (DataModified2?.length == 0 || totalSubtotal === 0) {
            return res.status(400).json({ isSuccess: false, message: "Data Not Found", data: null });
        }
        const shippingconst = await calculateShippingCost(totalWeight, shippingdata?.country);
        let ordertotal = totalSubtotal + totalTax + shippingconst.shippingCost;
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const orderId = `ORD-${date}-${time}`;


        const order = await prisma.order.create({
            data: {
                userId: user_id,
                orderId: orderId,
                subtotal: totalSubtotal,
                Tax: totalTax,
                discount: 0,
                shippingcharge: shippingconst.shippingCost,
                totalAmount: ordertotal,
                status: "PENDING",
            },
        });


        await prisma.orderItem.createMany({
            data: DataModified2?.map((item) => {
                let availableProducts = [];
                if (item?.isCatalogue) {
                    availableProducts = item?.products?.filter(prod => prod.quantity >= item.quantity) || [];
                }


                const stitchingTotal = item?.stitching?.reduce((sum, stitch) => sum + (stitch.option.price || 0), 0) || 0;
                const stitchingPrice = (availableProducts?.length > 0 ? availableProducts.length : 1) * stitchingTotal;

                const snapshots = {
                    quantity: item.quantity,
                    stitching: item.stitching || [],
                    stitchingPrice,
                    products: availableProducts,
                    price: item?.price,
                    subtotal: item?.subtotal,
                    tax: item?.tax,
                    size: item?.size || {},
                }
                return {
                    orderId: order.id,
                    productId: item?.product_id,
                    catlogueId: item?.catalogue_id,
                    quantity: item.quantity,
                    productsnapshots: JSON.stringify(snapshots)
                };
            }) ?? []
        });





        if (defaultAddressId) {
            await prisma.billing.update({
                where: {
                    id: defaultAddressId
                },
                data: {
                    orderId: order.id
                }
            })
        } else {
            const billingData = await prisma.billing.create({
                data: {
                    orderId: order.id,
                    email: billingform.email,
                    fullName: billingform.fullName,
                    country: billingform.country,
                    state: billingform.state,
                    city: billingform.city,
                    userId: user_id,
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

        }

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
            const bankrecordCreate = await prisma.bankAccount.create({ data: bankdata, select: { id: true } })
            bankAccountId = bankrecordCreate?.id
            paymentData = { orderId: order.id, paymentMethod, status: "PROCESSING", bankAccountId: bankAccountId };
        }
        const payment = await prisma.payment.create({ data: paymentData });

        const response = {
            orderId: order.orderId,
            razorpayOrderId: paymentData.transactionId,
            currency: currency,
            amount: Math.round(convertAmount * 100),
        };


        const orderItems=await prisma.cartItem.deleteMany({where:{cart_id:finduser.id}})
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
    } catch (error) {
        console.log(error)
        next(new Error("Something went wrong!"));
    }
};

export const checkStock = async (orderId) => {
    try {
        const findorderId = await prisma.order.findUnique({ where: { orderId }, select: { id: true } });
        if (!findorderId) return { isSuccess: false, message: "Order not found" };

        const orderItems = await prisma.orderItem.findMany({
            where: { orderId: findorderId.id },
            select: { productId: true, catlogueId: true, quantity: true, productsnapshots: true }
        });

        for (let item of orderItems) {
            const extractSize = JSON.parse(item?.productsnapshots)?.size;

            if (item.productId) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, quantity: true }
                });

                if (!product || product.quantity < item.quantity) {
                    return { isSuccess: false, message: `${product?.name || "Product"} is out of stock` };
                }


                if (product.optionType === "Size" && extractSize) {
                    const productSize = await prisma.productSize.findUnique({
                        where: {
                            product_id_size_id: {
                                product_id: product?.id,
                                size_id: JSON.parse(extractSize)?.id
                            }
                        },
                        select: { quantity: true }
                    });

                    if (!productSize || productSize.quantity < item.quantity) {
                        return { isSuccess: false, message: `${product.name} size ${JSON.parse(extractSize)?.value} is out of stock` };
                    }
                }


            }

            if (item.catlogueId) {
                const catalogue = await prisma.catalogue.findUnique({
                    where: { id: item.catlogueId },
                    select: { id: true, name: true, optionType: true, quantity: true }
                });


                if (!catalogue || catalogue.quantity < item.quantity) {
                    return { isSuccess: false, message: `${catalogue?.name || "Catalogue"} is out of stock` };
                }

                if (catalogue.optionType === "Size" && extractSize) {
                    console.log(catalogue.id)
                    const catalogueSize = await prisma.catalogueSize.findUnique({
                        where: {
                            catalogue_id_size_id: {
                                catalogue_id: catalogue.id,
                                size_id: JSON.parse(extractSize)?.id
                            }
                        },
                        select: { quantity: true }
                    });


                    if (!catalogueSize || catalogueSize.quantity < item.quantity) {
                        return { isSuccess: false, message: `${catalogue.name} size ${JSON.parse(extractSize)?.value} is out of stock` };
                    }
                }
            }
        }

        return { isSuccess: true };
    } catch (error) {
        console.error("Stock check error:", error);
        return { isSuccess: false, message: "Stock check failed" };
    }
};

// 1

// export const reduceProductQuantity = async (orderId) => {
//     try {
//         const findorderId = await prisma.order.findUnique({ where: { orderId: orderId }, select: { id: true } })
//         const orderItems = await prisma.orderItem.findMany({ where: { orderId: findorderId?.id } });
//         for (let item of orderItems) {
//             if (item.productId) {
//                 const result = await prisma.product.update({
//                     where: { id: item.productId },
//                     data: { quantity: { decrement: item.quantity } },
//                     select: {
//                         id: true,
//                         catalogue_id: true,
//                         quantity: true,
//                         average_price: true,
//                     },
//                 });
//                 if (result.quantity == 0) {
//                     await prisma.product.update({
//                         where: { id: item.productId },
//                         data: {
//                             outofStock: true,
//                         },
//                     });
//                 }

//                 if (result.catalogue_id && result.quantity == 0) {
//                     const findacatalogue = await prisma.catalogue.findUnique({
//                         where: { id: result.catalogue_id },
//                         select: {
//                             id: true,
//                             price: true,
//                         },
//                     });

//                     const updatecataloguePrice =
//                         findacatalogue.price - result.average_price;

//                     await prisma.catalogue.update({
//                         where: { id: result.catalogue_id },
//                         data: {
//                             no_of_product: { decrement: 1 },
//                             price: updatecataloguePrice,
//                         },
//                     });
//                 }
//             }
//             if (item.catlogueId) {
//                 const result = await prisma.catalogue.update({
//                     where: { id: item.catlogueId },
//                     data: { quantity: { decrement: item.quantity } },
//                     select: { id: true },
//                 });

//                 if (result.id) {
//                     await prisma.product.updateMany({
//                         where: {
//                             catalogue_id: result.id,
//                             quantity: { gt: 0 },
//                         },
//                         data: { quantity: { decrement: item.quantity } },
//                     });

//                     await prisma.product.updateMany({
//                         where: {
//                             catalogue_id: result.id,
//                             quantity: { equals: 0 },
//                         },
//                         data: {
//                             outofStock: true,
//                         },
//                     });

//                     const catalogue = await prisma.catalogue.findUnique({
//                         where: { id: result.id },
//                         select: { offer_price: true },
//                     });

//                     const checkstockoproduct = await prisma.product.findMany({
//                         where: {
//                             catalogue_id: result.id,
//                             outofStock: false,
//                         },
//                     });

//                     await prisma.catalogue.update({
//                         where: { id: result.id },
//                         data: {
//                             no_of_product: checkstockoproduct.length,
//                         },
//                     });

//                     if (checkstockoproduct.length > 0) {
//                         const newAveragePrice =
//                             catalogue.offer_price / checkstockoproduct.length;

//                         await prisma.catalogue.update({
//                             where: { id: result.id },
//                             data: {
//                                 average_price: newAveragePrice,
//                             },
//                         });
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("Error reducing product quantity:", error);

//     }
// };



// 2
// export const reduceProductQuantity = async (orderId) => {
//     try {
//         const findorderId = await prisma.order.findUnique({
//             where: { orderId },
//             select: { id: true }
//         });

//         if (!findorderId) {
//             return { isSuccess: false, message: "Order not found" };
//         }

//         const orderItems = await prisma.orderItem.findMany({
//             where: { orderId: findorderId.id },
//             select: { productId: true, catlogueId: true, quantity: true, productsnapshots: true }
//         });

//         for (let item of orderItems) {
//             try {
//                 const extractSize = JSON.parse(item?.productsnapshots)?.size;

//                 if (item.productId) {
//                     const result = await prisma.product.update({
//                         where: { id: item.productId },
//                         data: { quantity: { decrement: item.quantity } },
//                         select: { id: true, catalogue_id: true, quantity: true, average_price: true, optionType: true }
//                     });

//                     if (result.quantity === 0) {
//                         await prisma.product.update({
//                             where: { id: item.productId },
//                             data: { outofStock: true }
//                         })
//                     }

//                     if (result.optionType === "Size" && extractSize) {
//                         const productSize = await prisma.productSize.updateMany({
//                             where: {
//                                 product_id: result?.id
//                             },
//                             data: { quantity: { decrement: item.quantity } },
//                         });

//                     }

//                     if (result.catalogue_id && result.quantity === 0) {
//                         const findCatalogue = await prisma.catalogue.findUnique({
//                             where: { id: result.catalogue_id },
//                             select: { id: true, price: true }
//                         });

//                         if (findCatalogue) {
//                             const updateCataloguePrice = findCatalogue.price - result.average_price;

//                             await prisma.catalogue.update({
//                                 where: { id: result.catalogue_id },
//                                 data: {
//                                     no_of_product: { decrement: 1 },
//                                     price: updateCataloguePrice
//                                 }
//                             });
//                         }
//                     }



//                 }

//                 if (item.catlogueId) {
//                     if (extractSize) {
//                         const sizeId = JSON.parse(extractSize)?.id;

//                         const sizeResult = await prisma.catalogueSize.update({
//                             where: {
//                                 catalogue_id_size_id: {
//                                     catalogue_id: item.catlogueId,
//                                     size_id: sizeId
//                                 }
//                             },
//                             data: { quantity: { decrement: item.quantity } },
//                             select: { quantity: true }
//                         });

//                         if (sizeResult.quantity === 0) {
//                             console.log(`Size ${JSON.parse(extractSize)?.value} is out of stock`);
//                         }
//                     }

//                     const result = await prisma.catalogue.update({
//                         where: { id: item.catlogueId },
//                         data: { quantity: { decrement: item.quantity } },
//                         select: { id: true }
//                     });

//                     if (result.id) {
//                         await prisma.product.updateMany({
//                             where: { catalogue_id: result.id, quantity: { gt: 0 } },
//                             data: { quantity: { decrement: item.quantity } }
//                         });

//                         await prisma.product.updateMany({
//                             where: { catalogue_id: result.id, quantity: { equals: 0 } },
//                             data: { outofStock: true }
//                         });

//                         const catalogue = await prisma.catalogue.findUnique({
//                             where: { id: result.id },
//                             select: { offer_price: true }
//                         });

//                         const checkStockProducts = await prisma.product.findMany({
//                             where: { catalogue_id: result.id, outofStock: false }
//                         });

//                         await prisma.catalogue.update({
//                             where: { id: result.id },
//                             data: { no_of_product: checkStockProducts.length }
//                         });

//                         if (checkStockProducts.length > 0 && catalogue) {
//                             const newAveragePrice = catalogue.offer_price / checkStockProducts.length;
//                             await prisma.catalogue.update({
//                                 where: { id: result.id },
//                                 data: { average_price: newAveragePrice }
//                             });
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error("Error processing order item:", error);
//                 return { isSuccess: false, message: "Error processing order items" };
//             }
//         }

//         return { isSuccess: true, message: "Product quantities updated successfully" };
//     } catch (error) {
//         console.error("Error reducing product quantity:", error);
//         return { isSuccess: false, message: "Internal server error" };
//     }
// };


export const reduceProductQuantity = async (orderId) => {
    try {
        const order = await prisma.order.findUnique({
            where: { orderId },
            select: { id: true }
        });

        if (!order) {
            return { isSuccess: false, message: "Order not found" };
        }
        const orderItems = await prisma.orderItem.findMany({
            where: { orderId: order.id },
            select: { productId: true, catlogueId: true, quantity: true, productsnapshots: true }
        });
        for (let item of orderItems) {
            const { productId, catlogueId, quantity, productsnapshots } = item;

            try {
                const extractSize = productsnapshots ? JSON.parse(productsnapshots).size : null;
                if (productId) {
                    const product = await prisma.product.update({
                        where: { id: productId },
                        data: { quantity: { decrement: quantity } },
                        select: { id: true, catalogue_id: true, quantity: true, average_price: true, optionType: true }
                    });

                    if (product.quantity === 0) {
                        await prisma.product.update({
                            where: { id: productId },
                            data: { outofStock: true }
                        });
                    }
                    if (product.optionType === "Size" && extractSize) {
                        const sizeId = JSON.parse(extractSize)?.id;
                        await prisma.productSize.update({
                            where: {
                                product_id_size_id: {
                                    product_id: product.id,
                                    size_id: sizeId
                                }
                            },
                            data: { quantity: { decrement: quantity } }
                        });
                    }

                    if (product.catalogue_id && product.quantity === 0) {
                        const catalogue = await prisma.catalogue.findUnique({
                            where: { id: product.catalogue_id },
                            select: { id: true, price: true }
                        });

                        if (catalogue) {
                            const updatedPrice = catalogue.price - product.average_price;
                            await prisma.catalogue.update({
                                where: { id: product.catalogue_id },
                                data: {
                                    no_of_product: { decrement: 1 },
                                    price: updatedPrice
                                }
                            });
                        }
                    }
                }

                if (catlogueId) {
                    if (extractSize) {
                        const sizeId = JSON.parse(extractSize)?.id;
                        const sizeResult = await prisma.catalogueSize.update({
                            where: {
                                catalogue_id_size_id: { catalogue_id: catlogueId, size_id: sizeId }
                            },
                            data: { quantity: { decrement: quantity } },
                            select: { quantity: true }
                        });

                        if (sizeResult.quantity === 0) {
                            console.log(`Size ${JSON.parse(extractSize)?.value} is out of stock`);
                        }
                    }

                    const catalogue = await prisma.catalogue.update({
                        where: { id: catlogueId },
                        data: { quantity: { decrement: quantity } },
                        select: { id: true }
                    });

                    if (catalogue) {
                        await prisma.product.updateMany({
                            where: { catalogue_id: catalogue.id, quantity: { gt: 0 } },
                            data: { quantity: { decrement: quantity } }
                        });

                        await prisma.product.updateMany({
                            where: { catalogue_id: catalogue.id, quantity: 0 },
                            data: { outofStock: true }
                        });

                        const catalogueDetails = await prisma.catalogue.findUnique({
                            where: { id: catalogue.id },
                            select: { offer_price: true }
                        });

                        const availableProducts = await prisma.product.findMany({
                            where: { catalogue_id: catalogue.id, outofStock: false }
                        });

                        await prisma.catalogue.update({
                            where: { id: catalogue.id },
                            data: { no_of_product: availableProducts.length }
                        });

                        if (availableProducts.length > 0 && catalogueDetails) {
                            const newAveragePrice = catalogueDetails.offer_price / availableProducts.length;
                            await prisma.catalogue.update({
                                where: { id: catalogue.id },
                                data: { average_price: newAveragePrice }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing order item:", error);
                return { isSuccess: false, message: "Error processing order items" };
            }
        }

        return { isSuccess: true, message: "Product quantities updated successfully" };
    } catch (error) {
        console.error("Error reducing product quantity:", error);
        return { isSuccess: false, message: "Internal server error" };
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
