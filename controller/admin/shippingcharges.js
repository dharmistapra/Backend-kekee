import prisma from "../../db/config.js";
import { deleteData } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";

const postShippingcharges = async (req, res, next) => {
    try {
        const { country, from, to, amount, type, pcs } = req.body;
        let data = {};

        if (type === "weight") {
            data = { country, from, to, amount, type: "weight", };
        } else if (type === "pcs") {
            data = { country, pcs, amount, type: "pcs", };
        }
        const createdShippingCharge = await prisma.shippingCharges.create({
            data,
        });
        return res.status(200).json({
            isSuccess: true,
            message: "Shipping charges created successfully.",
            data: createdShippingCharge,
        });

    } catch (error) {
        console.error("Error creating shipping charge:", error);
        return res.status(500).json({
            isSuccess: false,
            message: "Something went wrong, please try again!",
        });
    }
};

const updateShippingcharges = async (req, res, next) => {
    try {
        const { id } = req.params
        const { country, from, to, amount, type, pcs } = req.body;
        let data = {};

        if (type === "weight") {
            data = { country, from, to, amount, type: "weight", };
        } else if (type === "pcs") {
            data = { country, pcs, amount, type: "pcs", };
        }
        const createdShippingCharge = await prisma.shippingCharges.update({
            where: {
                id: id
            },
            data,
        });
        return res.status(200).json({
            isSuccess: true,
            message: "Shipping charges updated successfully.",
            data: createdShippingCharge,
        });

    } catch (error) {
        console.error("Error creating shipping charge:", error);
        return res.status(500).json({
            isSuccess: false,
            message: "Something went wrong, please try again!",
        });
    }
};

const paginationShippingcharges = async (req, res, next) => {
    try {
        const { perPage, pageNo, search } = req.body;
        const page = +pageNo || 1;
        const take = +perPage || 10;
        const skip = (page - 1) * take;
        const filter = [
            { country: { contains: search, mode: "insensitive" } },
        ]
        const searchFilter = createSearchFilter(search, filter);
        const count = await prisma.shippingCharges.count({ where: searchFilter || undefined });


        if (count === 0)
            return res
                .status(200)
                .json({ isSuccess: true, message: "shipping charges not found!", data: [] });

        const result = await prisma.shippingCharges.findMany({
            where: searchFilter || undefined,
            skip,
            take,
        });

        return res.status(200).json({
            isSuccess: true,
            message: "shipping get successfully.",
            data: result,
            totalCount: count,
            currentPage: page,
            pagesize: take,
        });
    } catch (error) {
        console.log("error", error)
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};


const deleteShippingcharges = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await deleteData("shippingCharges", id);
        if (result.status === false)
            return res
                .status(400)
                .json({ isSuccess: result.status, message: result.message });

        return res
            .status(200)
            .json({ isSuccess: result.status, message: result.message });
    } catch (error) {
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};



export { postShippingcharges, paginationShippingcharges, updateShippingcharges, deleteShippingcharges };
