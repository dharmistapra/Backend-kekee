import prisma from "../../../db/config.js";
const postgroupstitching = async (req, res, next) => {
  try {
    const { name, category_id, optionfield } = req.body;
    const findCategory = await prisma.categoryMaster.findFirst({
      where: { id: category_id },
    });

    if (!findCategory) {
      return res.status(400).json({
        isSuccess: false,
        message: "Category not found.",
      });
    }

    const createdStitchingOptions = [];
    for (const item of optionfield) {
      const createdOption = await prisma.stitchingOption.create({
        data: {
          name: item.name,
          catalogue_price: item.catalogue_price,
          price: item.price,
          type: item.type,
          dispatch_time: item.dispatch_time,
          isCustom: item.isCustom,
          isDefault: item.isDefault,
        },
        select: {
          id: true,
        },
      });
      createdStitchingOptions.push(createdOption);
    }

    console.log("createdStitchingOptions", createdStitchingOptions);

    if (createdStitchingOptions.length > 0) {
      const createStitchingGroup = await prisma.stitchingGroup.create({
        data: { name, category_id },
      });

      // const createdStitchingOptions = await prisma.stitchingOption.findMany({
      //     where: {
      //         name: { in: optionfield.map((item) => item.name) },
      //     },
      //     select: {
      //         id: true,
      //     },
      // });

      const stitchingGroupOptionPromises = createdStitchingOptions.map(
        (stitchingOption) => {
          return prisma.stitchingGroupOption.create({
            data: {
              stitchingGroup_id: createStitchingGroup.id,
              stitchingOption_id: stitchingOption.id,
            },
          });
        }
      );

      await Promise.all(stitchingGroupOptionPromises);
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching  created successfully.",
    });
  } catch (error) {
    console.error("Error:", error);
    const err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const getAllgroupstitching = async (req, res, next) => {
  try {
    const result = await prisma.stitchingGroupOption.findMany({
      include: {
        stitchingGroup: true,
        stitchingOption: true,
      },
    });

    const groupedData = {};
    result.forEach((item) => {
      const groupId = item.stitchingGroup.id;
      if (!groupedData[groupId]) {
        groupedData[groupId] = {
          ...item.stitchingGroup,
          stitchingOptions: [],
        };
      }
      groupedData[groupId].stitchingOptions.push(item.stitchingOption);
    });
    const finalData = Object.values(groupedData);

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching option get successfully.",
      data: finalData,
    });
  } catch (err) {
    const error = new Error("Something went wrong please try again!");
    next(error);
  }
};

const paginationgroupstitching = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.query;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.stitchingGroup.count();
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "stitching found!", data: [] });

    const newdata = await prisma.stitchingGroup.findMany({
      select: {
        id: true,
        name: true,
        category_id: true,
        category: {
          select: {
            name: true,
          },
        },
        stitchingGroupOption: {
          select: {
            stitchingOption: {
              select: {
                id: true,
                name: true,
                catalogue_price: true,
                price: true,
                type: true,
                dispatch_time: true,
                isCustom: true,
                isDefault: true,
              },
            },
          },
        },
        _count: {
          select: {
            stitchingGroupOption: true,
          },
        },
      },
      skip,
      take,
      orderBy: { updatedAt: "desc" },
    });

    const formattedData = newdata.map((item) => ({
      ...item,
      stitchingGroupOption: item.stitchingGroupOption.map(
        (option) => option.stitchingOption
      ),
    }));

    return res.status(200).json({
      isSuccess: true,
      message: "stitching option get successfully.",
      data: formattedData,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (err) {
    console.log("errr", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const putgroupstitching = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category_id, optionfield } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const findCategory = await prisma.categoryMaster.findUnique({
      where: { id: category_id },
    });

    if (!findCategory) {
      return res.status(400).json({
        isSuccess: false,
        message: "Category not found.",
      });
    }

    const findStitchingGroup = await prisma.stitchingGroup.findUnique({
      where: { id },
    });

    if (!findStitchingGroup) {
      return res.status(404).json({
        isSuccess: false,
        message: "Stitching not found.",
      });
    }

    const updatedStitchingGroup = await prisma.stitchingGroup.update({
      where: { id },
      data: { name, category_id },
    });

    const stitchingOptionPromises = optionfield.map(async (item) => {
      if (!item.id) {
        return prisma.stitchingOption.create({
          data: {
            name: item.name,
            catalogue_price: item.catalogue_price,
            price: item.price,
            type: item.type,
            dispatch_time: item.dispatch_time,
            isCustom: item.isCustom,
            isDefault: item.isDefault,
          },
        });
      } else {
        const existingOption = await prisma.stitchingOption.findUnique({
          where: { id: item.id },
        });

        if (existingOption) {
          return prisma.stitchingOption.update({
            where: { id: existingOption.id },
            data: {
              name: item.name,
              catalogue_price: item.catalogue_price,
              price: item.price,
              type: item.type,
              dispatch_time: item.dispatch_time,
              isCustom: item.isCustom,
              isDefault: item.isDefault,
            },
          });
        } else {
          return prisma.stitchingOption.create({
            data: {
              name: item.name,
              catalogue_price: item.catalogue_price,
              price: item.price,
              type: item.type,
              dispatch_time: item.dispatch_time,
              isCustom: item.isCustom,
              isDefault: item.isDefault,
            },
          });
        }
      }
    });

    const stitchingOptions = await Promise.all(stitchingOptionPromises);

    const stitchingGroupOptionPromises = stitchingOptions.map(
      async (stitchingOption) => {
        const existingGroupOption =
          await prisma.stitchingGroupOption.findUnique({
            where: {
              stitchingGroup_id_stitchingOption_id: {
                stitchingGroup_id: updatedStitchingGroup.id,
                stitchingOption_id: stitchingOption.id,
              },
            },
          });

        if (!existingGroupOption) {
          return prisma.stitchingGroupOption.create({
            data: {
              stitchingGroup_id: updatedStitchingGroup.id,
              stitchingOption_id: stitchingOption.id,
            },
          });
        }

        return null;
      }
    );
    await Promise.all(stitchingGroupOptionPromises);

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching group updated successfully.",
    });
  } catch (error) {
    console.error("Error:", error);
    const err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deletegroupstitching = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return { status: false, message: "Invalid ID format!" };
    }

    const finddata = await prisma.stitchingGroup.findUnique({
      where: {
        id: id,
      },
    });

    if (!finddata) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Stitching Group not found!" });
    }

    const result = await prisma.stitchingGroup.delete({
      where: {
        id: id,
      },
      select: {
        stitchingGroupOption: {
          select: {
            stitchingOption_id: true,
          },
        },
      },
    });

    const stitchingOptionIds = result.stitchingGroupOption.map(
      (option) => option.stitchingOption_id
    );
    if (stitchingOptionIds.length > 0) {
      await prisma.stitchingOption.deleteMany({
        where: {
          id: {
            in: stitchingOptionIds,
          },
        },
      });
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching Group deleted successfully.",
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export {
  postgroupstitching,
  putgroupstitching,
  getAllgroupstitching,
  paginationgroupstitching,
  deletegroupstitching,
};
