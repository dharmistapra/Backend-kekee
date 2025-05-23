import prisma from "../../db/config.js";
const gettestimonial = async (req, res, next) => {
    try {
        const take = 10;
        const data = await prisma.testimonial.findMany({
            orderBy: {
                position: "asc",
            },
            take,
        })

        return res.status(200).json({
            isSuccess: true,
            message: "testimonal get successfully.",
            data,
        });

    } catch (error) {
        const err = new Error("Something went wrong, Please try again!");
        next(err);
    }
}

export { gettestimonial }