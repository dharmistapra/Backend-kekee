import prisma from "../../db/config.js";

const cmsContent = async (req, res, next) => {
    try {
        const { pageName, content } = req.body;
        const getlatestPosition = await prisma.cmsContent.count({
            where: { pageName: pageName },
        })


        const result = await prisma.cmsContent.create({
            data: {
                pageName: pageName,
                content: content,
                position: getlatestPosition + 1,
            },
        });
        return res.status(200).json({
            isSuccess: true,
            message: "CMS content created successfully.",
            data: result,
        });

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}



const paginationcmsContent = async (req, res, next) => {
    try {
        const { perPage, pageNo, search } = req.query;
        const page = Number(pageNo) || 1;
        const take = Number(perPage) || 10;
        const skip = (page - 1) * take;

        const searchFilter = search
            ? {
                OR: [
                    { PageName: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};

        const [count, result] = await prisma.$transaction([
            prisma.cmsContent.count({ where: searchFilter }),
            prisma.cmsContent.findMany({
                where: searchFilter,
                select: {
                    id: true,
                    pageName: true,
                    content: true,
                    isActive: true,
                    position: true,
                },
                orderBy: { position: "asc" },
                skip,
                take,
            }),
        ]);

        return res.status(200).json({
            isSuccess: true,
            message: count ? "Currencies fetched successfully." : "Currency not found!",
            data: result,
            totalCount: count,
            currentPage: page,
            pageSize: take,
        });
    } catch (error) {
        console.error("Error fetching currencies:", error);
        next(new Error("Something went wrong, please try again!"));
    }
};
export { cmsContent, paginationcmsContent }