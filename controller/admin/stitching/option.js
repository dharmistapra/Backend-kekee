import prisma from "../../../DB/config.js";
import { deleteData, updateStatus } from "../../../helper/common.js";

const postOptionByGroupingId = async (req, res, next) => {
  try {
    const {
      name,
      type,
      catalogue_price,
      price,
      dispatch_time,
      stitchingGroup_id,
      isCustom,
    } = req.body;
    const result = await prisma.stitchingOption.create({
      data: {
        name,
        catalogue_price,
        price,
        dispatch_time,
        type: type,
        isCustom,
      },
    });

    if (result) {
      await prisma.stitchingGroupOption.create({
        data: {
          stitchingGroup_id,
          stitchingOption_id: result.id,
        },
      });
    }
    return res.status(200).json({
      isSuccess: true,
      message: "stitching option created successfully.",
      data: result,
    });
  } catch (error) {
    const err = new Error("Something went wrong, plese try again!");
    next(err);
  }
};

const putOptionByGroupingId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      catalogue_price,
      price,
      dispatch_time,
      stitchingGroup_id,
      isCustom,
    } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const result = await prisma.stitchingOption.update({
      where: {
        id: id,
      },
      data: {
        name,
        catalogue_price,
        price,
        dispatch_time,
        type: type,
        isCustom,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "stitching option updated successfully.",
      data: result,
    });
  } catch (error) {
    const err = new Error("Something went wrong, plese try again!");
    next(err);
  }
};

const getOptionByGroupingId = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const finddata = await prisma.stitchingGroupOption.findMany({
      where: {
        stitchingGroup_id: id,
      },
    });

    if (!finddata) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Stitching Group not found!" });
    }

    // const result = await prisma.stitchingGroupOption.findMany({
    //   where: {
    //     stitchingGroup_id: id
    //   },
    //   select: {
    //     stitchingOption: {
    //       select: {
    //         id: true,
    //         name: true,
    //         type: true,
    //         isActive: true,
    //         price: true,
    //         dispatch_time: true,
    //         _count: {
    //           select: {

    //             // stitchingValues: {
    //             //   where: {
    //             //     stitchingOption: {
    //             //       type: "Redio"
    //             //     }
    //             //   }

    //             // }
    //           }
    //         }
    //       },
    //     },
    //   },

    // })

    const result = await prisma.stitchingGroupOption.findMany({
      where: {
        stitchingGroup_id: id,
      },
      select: {
        stitchingOption: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            isCustom: true,
            catalogue_price: true,
            price: true,
            dispatch_time: true,
            _count: {
              select: {
                stitchingValues: true,
              },
            },
          },
        },
      },
    });

    const stitchingOptions = result.map((item) => {
      const stitchingOption = item.stitchingOption;
      if (stitchingOption.type !== "Redio") {
        delete stitchingOption._count;
      }

      return stitchingOption;
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching Group get successfully.",
      data: stitchingOptions,
    });
  } catch (err) {
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
const deleteOptionByGroupingId = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const result = await deleteData("stitchingOption", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching option deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const optionStatusChange = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await updateStatus("stitchingOption", id);
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
  postOptionByGroupingId,
  putOptionByGroupingId,
  getOptionByGroupingId,
  deleteOptionByGroupingId,
  optionStatusChange,
};
