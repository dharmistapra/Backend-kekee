import prisma from "../../db/config.js";
import { updateStatus } from "../../helper/common.js";

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
                    { pageName: { contains: search, mode: "insensitive" } },
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
const updatecmsContent = async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            isSuccess: false,
            message: "ID is required.",
        });
    }

    const { pageName, content, position } = req.body;

    try {
        const existingContent = await prisma.cmsContent.findFirst({
            where: {
                pageName: pageName,
                position: position,
            },
        });

        if (existingContent) {
            await prisma.cmsContent.updateMany({
                where: {
                    pageName: pageName,
                    position: {
                        gte: position,
                    },
                },
                data: {
                    position: {
                        increment: 1,
                    },
                },
            });
        }
        const result = await prisma.cmsContent.update({
            where: { id: id },
            data: {
                pageName: pageName,
                content: content,
                position: position,
            },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "CMS content updated successfully.",
            data: result,
        });
    } catch (err) {
        console.error(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};
const deletecmsContent = async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            isSuccess: false,
            message: "ID is required.",
        });
    }

    try {
        const result = await prisma.cmsContent.delete({
            where: { id: id },
        });

        prisma.cmsContent.updateMany({
            where: {
                pageName: result.pageName,
                position: {
                    gt: result.position,
                },
            },
            data: {
                position: {
                    decrement: 1,
                },
            },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "CMS content deleted successfully.",
            data: result,
        });
    } catch (err) {
        console.error(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};
const updateCmsContentStatus = async (req, res, next) => {
    try {
        let id = req.params.id.trim();
        const result = await updateStatus("cmsContent", id);
        if (result.status === false)
            return res
                .status(400)
                .json({ isSuccess: false, message: result.message });

        return res.status(200).json({
            isSuccess: true,
            message: result.message,
            data: result.data,
        });
    } catch (error) {
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};

export { cmsContent, paginationcmsContent, updatecmsContent, deletecmsContent, updateCmsContentStatus }