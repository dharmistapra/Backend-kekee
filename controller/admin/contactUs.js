import prisma from "../../db/config.js";

const postContactUs = async (req, res, next) => {
  try {
    const { name, email, mobile_number, subject, message } = req.body;

    const uniqueData = await prisma.contactUs.findFirst({
      where: { OR: [{ email: email }, { mobile_number: mobile_number }] },
    });

    if (uniqueData) {
      return res.status(409).json({
        isSuccess: false,
        message: "Email or Mobile number already exists!",
      });
    }
    const result = await prisma.contactUs.create({
      data: {
        name: name,
        email: email,
        mobile_number: mobile_number,
        subject: subject,
        message: message,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Contact Us created successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Internal Server Error!");
    next(error);
  }
};

const getAllContactUs = async (req, res, next) => {
  try {
    const { pageNo, perPage, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            isNaN(search) ? {} : { mobile_number: parseInt(search) },
            { email: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const result = await prisma.contactUs.findMany({
      where: searchFilter,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Contact Us fetched successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Internal Server Error!");
    next(error);
  }
};

const deleteContactUs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await prisma.contactUs.findUnique({
      where: { id: id },
    });

    if (!data) {
      return res.status(200).json({
        isSuccess: false,
        message: "Contact Us not found!",
      });
    }
    const result = await prisma.contactUs.delete({
      where: { id: id },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Contact Us deleted successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Internal Server Error!");
    next(error);
  }
};

export { postContactUs, getAllContactUs, deleteContactUs };
