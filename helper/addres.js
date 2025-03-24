import prisma from "../db/config.js";
// ****************** this functuion is taking billingId as a parameter and checking if billingId is not present then it will create a new billing address and return the billingId ******************

const createBilling = async (billingdata, user_id) => {
    console.log(user_id);
    const billingId = billingdata?.id ? billingdata.id : null;
    if (!billingId) {
        const { customersnotes, ...otherdata } = billingdata;
        const billingData = await prisma.customerAddress.create({
            data: {

                user: { connect: { id: user_id } },
                fullName: otherdata.fullName,
                country: otherdata.country,
                state: otherdata.state,
                city: otherdata.city,
                zipCode: otherdata.zipCode,
                address1: otherdata.address1,
                address2: otherdata.address2,

                mobile: otherdata.mobile,
                // status: "PENDING",
                email: otherdata.email,
                whatsapp: otherdata.whatsapp,
                companyname: otherdata.companyname,
                GstNumber: otherdata.GstNumber,
                customersnotes: customersnotes || '',
                defaultBilling: true,
                defaultShipping: true,
            },
        });
        return billingData.id;
    }
    return billingId;
};

// ****************** this functuion is taking shippingId as a parameter and checking if shippingId is not present then it will create a new shipping address and return the shippingId ******************
const createShipping = async (isSame, billingform, shippingdata, type) => {
    if (!billingform?.id) {
        const shippingInfo = isSame ? billingform : shippingdata;
        if (type === "selected") return shippingInfo.id;


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