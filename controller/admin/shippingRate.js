import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

const postShippingRate = async (req, res, next) => {
    try {
        const { maxWeight, minWeight, name, price, selectedOption, type, zone_id, minprice, maxprice } = req.body;
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

export { postShippingRate }
