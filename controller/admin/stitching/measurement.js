import prisma from "../../../db/config.js";
import { deleteData, updateStatus } from "../../../helper/common.js";

const postOptionMeasurement = async (req, res, next) => {
    try {
        const { name, type, range, values, option_id } = req.body;

        // if (measurementdata && measurementdata.length > 0) {
        //     measurementdata?.forEach((item, index) => {
        //         const imageFile = req.files && req.files[index] ? req.files[index] : null;
        //         const imagePath = imageFile ? imageFile.path : null;

        //         dynamicFields.push({
        //             key: item.key,
        //             value: item.value,
        //             image: imagePath,
        //         });

        //     });

        // }
        // const conditionalcreatedata = {
        //     name,
        //     type,
        //     stitching_id,
        //     measurementdata: type === "Dropdown" ? JSON.stringify(dynamicFields) : null,
        // }


        const result = await prisma.stitchingValue.create({
            data: {
                stitchingOptionId: option_id,
                name,
                type,
                range,
                values,
            },
            select: {
                name: true,
            }
        })

        return res.status(200).json({
            message: "Stitching measurement processed successfully!",
            isSuccess: true,
            data: result,
        });

    } catch (error) {
        console.log("eee", error)
        const err = new Error("Something went wrong, plese try again!");
        next(err);
    }
}

const getOptionMeasurement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await prisma.stitchingValue.findMany({
            where: {
                stitchingOptionId: id,
            }
        });
        return res.status(200).json({
            isSuccess: true,
            message: "Stitching measurement get successfully.",
            data: result,
        });
    } catch (err) {
        console.log("errr", err)
        next(new Error("Something went wrong, please try again!", { status: 500 }));
    }
};

const putOptionMeasurement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, type, range, values, option_id } = req.body;
        const result = await prisma.stitchingValue.update({
            where: {
                id: id
            },
            data: {
                stitchingOptionId: option_id,
                name,
                type,
                range,
                values,
            },
            select: {
                name: true,
            }
        })

        return res.status(200).json({
            message: "Stitching measurement update successfully!",
            isSuccess: true,
            data: result,
        });

    } catch (error) {
        const err = new Error("Something went wrong, plese try again!");
        next(err);
    }
}

const deleteOptionMeasurement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await prisma.stitchingValue.delete({
            where: {
                id: id
            }
        });

        return res.status(200).json({
            message: "Stitching measurement delete successfully!",
            isSuccess: true,
            data: result,
        });

    } catch (error) {
        const err = new Error("Something went wrong, plese try again!");
        next(err);
    }
}

const changeOptionMeasurementStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await updateStatus("stitchingValue", id);
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

export {
    postOptionMeasurement,
    getOptionMeasurement,
    putOptionMeasurement,
    deleteOptionMeasurement,
    changeOptionMeasurementStatus
}
