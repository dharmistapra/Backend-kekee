import prisma from "../../db/config.js"

const postshipAddress = async (req, res, next) => {
    try {
        const { email, fullName, country, state, city, zipCode, address1, address2, companyname, GstNumber, mobile, whatsapp, user_id, id, isDefault, defaultBilling, defaultShipping } = req.body;
        const finduser = await prisma.users.findUnique({ where: { id: user_id } });
        if (!finduser) return res.status(400).json({ isSuccess: false, message: "User not found", data: null });


        let data;
        if (id) {
            const existingAddress = await prisma.customerAddress.findUnique({ where: { id } });
            if (!existingAddress) return res.status(404).json({ isSuccess: false, message: "Billing address not found", data: null });

            data = await prisma.customerAddress.update({
                where: { id },
                data: {
                    fullName,
                    email,
                    city,
                    country, state, zipCode, address1, address2, companyname, GstNumber, mobile, whatsapp,
                    defaultBilling: defaultBilling,
                    defaultShipping: defaultShipping,
                    isDefault: isDefault
                },
            });
            return res.status(200).json({ isSuccess: true, message: "Data updated successfully", data });
        } else {
            data = await prisma.customerAddress.create({
                data: {
                    fullName, userId: user_id, email, city, country, state, zipCode, address1, address2, companyname, GstNumber, mobile, whatsapp, defaultBilling: defaultBilling,
                    defaultShipping: defaultShipping,
                    isDefault: isDefault
                },
            });

            return res.status(201).json({ isSuccess: true, message: "Data inserted successfully", data });
        }
    } catch (error) {
        console.log(error);
        next(new Error("Something went wrong, Please try again!"));
    }
};



const getshipAddress = async (req, res, next) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const data = await prisma.customerAddress.findMany({
            where: {
                userId: id
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                city: true,
                country: true,
                state: true,
                zipCode: true,
                address1: true,
                address2: true,
                companyname: true,
                GstNumber: true,
                mobile: true,
                whatsapp: true,
                defaultBilling: true,
                defaultShipping: true,
            }
        })


        if (data && data?.length > 0) {
            return res.status(200).json({ isSuccess: true, message: "Data get successfylly", data });
        } else {
            return res.status(200).json({ isSuccess: false, message: "Address data not found", data: [] });
        }
    } catch (error) {
        console.log(error)
        next(new Error("Something went wrong, Please try again!"))
    }
}



const deleteshipAddress = async (req, res, next) => {
    try {
        const { id } = req.params
        if (!id) {
            return res.status(400).json({ isSuccess: false, message: "Address id required", });
        }

        const result = await prisma.customerAddress.delete({
            where: { id: id }
        })

        return res.status(200).json({ isSuccess: true, message: "Data Delete Successfully", });

    } catch (error) {
        next(new Error("Something went wrong, Please try again!"))
    }
}
export { postshipAddress, getshipAddress, deleteshipAddress }