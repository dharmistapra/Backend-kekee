import prisma from "../../db/config.js";

const getShippingMethod = async (req, res, next) => {
  try {
    const result = await prisma.shippingMethod.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, description: true },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping method get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { getShippingMethod };
