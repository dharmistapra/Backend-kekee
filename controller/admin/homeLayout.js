import prisma from "../../db/config.js";
import { updateStatus } from "../../helper/common.js";

const postHomeLayout = async (req, res, next) => {
    try {
        const { title, type, html_content } = req.body;
        const getlatestPosition = await prisma.homeLayout.count()


        const result = await prisma.homeLayout.create({
            data: {
                title,
                type,
                html_content,
                position: getlatestPosition + 1,
            },
        });
        return res.status(200).json({
            isSuccess: true,
            message: "Layout created successfully.",
            data: result,
        });

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const getHomeLayout = async (req, res, next) => {
    try {
        const result = await prisma.homeLayout.findMany({
            select: {
                id: true,
                title: true,
                type: true,
                html_content: true,
                isActive: true,
                position: true
            },
            orderBy: { position: "asc" }
        })
        return res.status(200).json({
            isSuccess: true,
            message: "Layout fetched successfully.",
            data: result
        })

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const putHomeLayout = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, type, html_content } = req.body;
        const exist = await prisma.homeLayout.findUnique({ where: { id: id } })
        if (!exist) res.status(404).json({ isSuccess: false, message: "Layout not found.", })
        const result = await prisma.homeLayout.update({
            where: { id: id },
            data: {
                title,
                type,
                html_content
            }
        })
        return res.status(200).json({
            isSuccess: true,
            message: "Layout updated successfully.",
            data: result
        })

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const paginationHomeLayout = async (req, res, next) => {
    try {
        const { perPage, pageNo, search } = req.query;
        const page = Number(pageNo) || 1;
        const take = Number(perPage) || 10;
        const skip = (page - 1) * take;

        const searchFilter = search
            ? {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};

        const [count, result] = await prisma.$transaction([
            prisma.homeLayout.count({ where: searchFilter }),
            prisma.homeLayout.findMany({
                where: searchFilter,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    html_content: true,
                    isActive: true,
                    position: true
                },
                orderBy: { id: "asc" },
                skip,
                take,
            }),
        ])


        return res.status(200).json({
            isSuccess: true,
            message: count ? "HomeLayout fetched successfully." : "Currency not found!",
            data: result,
            totalCount: count,
            currentPage: page,
            pageSize: take,
        });


    } catch (error) {
        const err = new Error("Something went wrong !");
        next(err)
    }
}

const publicHomeLayout = async (req, res, next) => {
    try {
        const result = await prisma.homeLayout.findMany({
            select: {
                title: true,
                type: true,
                html_content: true,
                isActive: true,
                position: true
            },
            orderBy: { position: "asc" }
        })
        return res.status(200).json({
            isSuccess: true,
            message: "Layout fetched successfully.",
            data: result
        })
    } catch (error) {
        const err = new Error("Something went wrnong!");
        next(err)
    }
}

export { postHomeLayout, getHomeLayout, putHomeLayout, paginationHomeLayout, publicHomeLayout }