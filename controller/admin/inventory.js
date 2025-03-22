import prisma from "../../db/config.js";

const getAllSingleProductInventory = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.body;
    const page = Number(pageNo) || 1;
    const take = Number(perPage) || 10;
    const skip = (page - 1) * take;
    const filter = {
      showInSingle: true,
      OR: [{ catalogue_id: null }, { catalogue: { deletedAt: null } }],
    };

    const [result, count] = await Promise.all([
      prisma.product.findMany({
        where: filter,
        select: {
          name: true,
          quantity: true,
          optionType: true,
          offer_price: true,
          image: true,
          sku: true,
        },
        skip,
        take,
      }),
      prisma.product.count({ where: filter }),
    ]);

    return res.status(200).json({
      isSuccess: true,
      message: "Product retrieved successfully",
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (error) {
    console.log(error);
    next(new Error("Something went wrong, please try again!"));
  }
};

export { getAllSingleProductInventory };
