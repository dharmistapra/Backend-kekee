import prisma from "../../db/config.js";
import { deleteData, updatePosition, updateStatus } from "../../helper/common.js";
const postSize = async (req, res, next) => {
    try {
        const { value } = req.body;


        const [uniqueCode, count] = await prisma.$transaction([
            prisma.size.findUnique({
                where: { value },
            }),
            prisma.size.count(),
        ]);
        if (uniqueCode) {
            return res.status(409).json({
                isSuccess: false,
                message: "value already exists!",
            });
        }
        const result = await prisma.size.create({
            data: {
                value,
                position: count + 1
            },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "size created successfully.",
            data: result,
        });
    } catch (err) {
        const error = new Error("Internal Server Error!");
        next(error);
    }
};

const updateSize = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Invalid ID format!" });
        }
        const { value } = req.body;

        const existinglabels = await prisma.size.findUnique({
            where: { id: id },
        });
        if (!existinglabels)
            return res
                .status(404)
                .json({ isSuccess: false, message: "size not found!", data: [] });

        const result = await prisma.size.update({
            where: { id: id },
            data: { value },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "Size update successfully.",
            data: result,
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

const deleteSize = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res
                .status(400)
                .json({ isSuccess: false, message: "Invalid ID format!" });
        }
        const result = await deleteData("size", id);
        if (result.status === false)
            return res
                .status(400)
                .json({ isSuccess: result.status, message: result.message });


        const updatedposition = await prisma.size.updateMany({
            where: {
                position: {
                    gte: result.position,
                },
            },
            data: {
                position: {
                    decrement: 1,
                },
            },
        });



        return res
            .status(200)
            .json({ isSuccess: true, message: "size deleted successfully." });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

const sizeStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await updateStatus("size", id);
        if (result.status === false)
            return res
                .status(400)
                .json({ isSuccess: false, message: result.message });

        return res.status(200).json({
            isSuccess: true,
            message: result.message,
            data: result.data,
        });
    } catch (err) {
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

const getAllSizes = async (req, res, next) => {
    try {
        const result = await prisma.size.findMany({
            where: { isActive: true },
            select: {
                id: true,
                value: true,
            },
        });
        return res.status(200).json({
            isSuccess: true,
            message: "size get successfully.",
            data: result,
        });
    } catch (err) {
        console.log(err)
        const error = new Error("Something went wrong please try again!");
        next(error);
    }
};

const paginationSize = async (req, res, next) => {
    try {
        const { perPage, pageNo } = req.body;
        const page = +pageNo || 1;
        const take = +perPage || 10;
        const skip = (page - 1) * take;

        const count = await prisma.size.count();

        const result = await prisma.size.findMany({
            select: {
                id: true,
                position: true,
                value: true,
            },

            skip,
            take,
            orderBy: { position: "asc" },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "CMS pages get successfully.",
            data: result,
            totalCount: count,
            currentPage: page,
            pagesize: take,
        });

    } catch (error) {
        console.log(error)
        const err = new Error("Something went wrong please try again!");
        next(err);
    }
}

const sortingSizes = async (req, res, next) => {
    try {
        const { data } = req.body;
        const model = "cmsPage";
        const document = await updatePosition(model, data);
        if (document.status === false)
            return res
                .status(404)
                .json({ isSuccess: false, message: document.message });

        return res.status(200).json({
            isSuccess: true,
            message: "size positions updated successfully.",
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

export {
    postSize,
    updateSize,
    deleteSize,
    sizeStatus,
    getAllSizes,
    paginationSize,
    sortingSizes
}