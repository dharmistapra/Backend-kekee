import prisma from "../../db/config.js";
import { updateStatus } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";
const paginationusers = async (req, res, next) => {
    try {
        const { perPage, pageNo, search } = req.body;
        const page = +pageNo || 1;
        const take = +perPage || 10;
        const skip = (page - 1) * take;
        const filter = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ]
        const searchFilter = createSearchFilter(search, filter);

        const count = await prisma.users.count({ where: searchFilter || undefined });
        if (count === 0)
            return res
                .status(200)
                .json({ isSuccess: true, message: "users not found!", data: [] });

        const result = await prisma.users.findMany({
            where: searchFilter || undefined,
            skip,
            take,
        });

        return res.status(200).json({
            isSuccess: true,
            message: "users get successfully.",
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
const updateUsersStatus = async (req, res, next) => {
    try {
        let id = req.params.id.trim();
        const result = await updateStatus("users", id);
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
        console.log('users-status', err)
        let err = new Error("Something went wrong, please try again!");
        next(err);
    }
};

export { paginationusers, updateUsersStatus }