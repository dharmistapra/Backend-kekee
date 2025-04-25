import prisma from "../../db/config.js";
const getCmsContentPublic = async (req, res, next) => {
    try {
        const { pageName } = req.query;
        if (!pageName) {
            return res.status(400).json({
                isSuccess: false,
                message: "Page name is required",
            });
        }
        const result = await prisma.cmsContent.findMany({
            where: { pageName: pageName, isActive: true },
            select: {
                content: true,
                position: true,
            },
            orderBy: { position: "asc" },
        });
        return res.status(200).json({
            isSuccess: true,
            message: "CMS content fetched successfully.",
            data: result,
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

export { getCmsContentPublic };