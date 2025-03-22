import prisma from "../db/config.js";
// ****************** this functuion is taking billingId as a parameter and checking if billingId is not present then it will create a new billing address and return the billingId ******************

const createBilling = async (billingId, billingform, user_id) => {

    if (!billingId) {
        const { customersnotes ,...billingdata } = billingform;
        const billingData = await prisma.billing.create({
            data: {
                ...billingdata,
                userId: user_id,
            },
        });
        return billingData.id;
    }
    return billingId;
};

// ****************** this functuion is taking shippingId as a parameter and checking if shippingId is not present then it will create a new shipping address and return the shippingId ******************
const createShipping = async (shippingId, isSame, billingform, shippingdata) => {
    if (!shippingId) {
        const shippingInfo = isSame ? billingform : shippingdata;
        const shippingData = await prisma.shipping.create({
            data: {
                fullName: shippingInfo.fullName,
                country: shippingInfo.country,
                state: shippingInfo.state,
                city: shippingInfo.city,
                zipCode: shippingInfo.zipCode,
                address1: shippingInfo.address1,
                address2: shippingInfo.address2,
                mobile: shippingInfo.mobile,
                status: "PENDING",
            },
        });
        return shippingData.id;
    }
    return shippingId;
};


export { createBilling, createShipping };