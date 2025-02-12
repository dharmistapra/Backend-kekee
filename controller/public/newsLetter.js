import prisma from "../../db/config.js";
import createSearchFilter from "../../helper/searchFilter.js";

const postNewsLetter = async (req, res, next) => {
  try {
    const { email } = req.body;

    const isEmailExists = await prisma.newsLetter.findUnique({
      where: { email: email },
    });
    if (isEmailExists)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Email already exists!" });

    const newsLatter = await prisma.newsLetter.create({
      data: { email: email },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Email stored successfully.",
      data: newsLatter,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getNewsLetter = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [
      { email: { contains: search, mode: "insensitive" } },
    ]
    const searchFilter = createSearchFilter(search, filter);


    const getNewsLetter = await prisma.newsLetter.findMany({
      where: searchFilter || undefined,
      select: { id: true, email: true, createdAt: true },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "News letters get successfully.",
      data: getNewsLetter,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteNewsLetter = async (req, res, next) => {
  try {
    const id = req.params.id;

    const uniquedata = await prisma.newsLetter.findUnique({
      where: { id: id },
    });

    if (!uniquedata)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Email not found!" });

    const newsLetter = await prisma.newsLetter.delete({ where: { id: id } });

    return res
      .status(200)
      .json({ isSuccess: true, message: "Newsletter deleted successfully." });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { postNewsLetter, getNewsLetter, deleteNewsLetter };
