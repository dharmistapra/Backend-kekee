import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postShippingRate = async (req, res, next) => {
    try {
        const { maxWeight, minWeight, name, price, selectedOption, type, zone_id, minprice, maxprice, description } = req.body;
        const result = await prisma.shippingZoneAddRate.create({
            data: {
                name,
                price,
                type,
                selectedOption,
                minWeight,
                maxWeight,
                zone_id,
                minprice,
                description,
                maxprice,
            },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "Shipping rate created successfully.",
            data: result,
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};


const puttShippingRate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { maxWeight, minWeight, name, price, selectedOption, type, zone_id, minprice, maxprice, description } = req.body;
        const result = await prisma.shippingZoneAddRate.update({
            where: {
                id: id,
            },
            data: {
                name,
                price,
                type,
                selectedOption,
                minWeight,
                maxWeight,
                zone_id,
                minprice,
                description,
                maxprice,
            },
        });

        return res.status(200).json({
            isSuccess: true,
            message: "Shipping rate update successfully.",
            data: result,
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};


const deleteShippingRate = async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!/^[a-fA-F0-9]{24}$/.test(id))
            return res
                .status(400)
                .json({ isSuccess: false, message: "Invalid ID format!" });

        const { status, message, data } = await deleteData("shippingZoneAddRate", id);
        if (!status)
            return res.status(404).json({ isSuccess: status, message: message });

        return res.status(200).json({
            isSuccess: status,
            message: message,
            data: data,
        });
    } catch (err) {
        const error = new Error("Something went wrong,please try again!");
        next(error);
    }
};

export { postShippingRate, puttShippingRate, deleteShippingRate }
