import prisma from "../../db/config.js";
import { findCatalogueStitchingprice, findproductpriceOnSize, findproductpriceonStitching, getAllStitchingData } from "../../helper/cartItemHelper.js";

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

        let subtotal = 0, tax = 0;
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
                    stitchingDataMap = await getAllStitchingData(
                        parsedStitching,
                        parsedStitching
                    );
                }
            }
            subtotal += item.Subtotal;
            tax += item.Tax;
        }

        let ordertotal = subtotal + tax
        console.log("subtotal", ordertotal);

    } catch (error) {
        console.log("error", error);
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
}


export default OrderPlace;