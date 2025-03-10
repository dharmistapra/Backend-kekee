import prisma from "../../db/config.js"

const Adddress = async (req, res, next) => {
    try {
        const { email, fullName, country,
            state, city, zipCode,
            address1, address2, companyname,
            GstNumber, mobile, whatsapp, user_id } = req.body


        const finduser = await prisma.users.findUnique({
            where: {
                id: user_id
            }
        })

        if (!finduser) {
            return res.status(400).json({ isSuccess: false, message: "User not found", data: null });
        }

        const data = await prisma.billing.create({
            data: {
                fullName,
                email,
                city,
                country,
                state,
                zipCode,
                address1,
                address2,
                companyname,
                GstNumber,
                mobile,
                whatsapp,
                isSame: true,

            }
        })

        return res.status(200).json({ isSuccess: true, message: "Data inserted successfylly", });

    } catch (error) {
        next(new Error("Something went wrong, Please try again!"))
    }
}