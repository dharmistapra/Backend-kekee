import prisma from "../../db/config.js";

const getCategory = async (req, res, next) => {
  try {
    const result = await prisma.categoryMaster.findMany({
      where: { OR: [{ parent_id: null }], isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        image: true,
        children: {
          select: {
            id: true,
            name: true,
            title: true,
            url: true,
          },
        },
      },
    });

    const groupByTitle = result.map((category) => {
      const groupedChildren = category.children.reduce((acc, child) => {
        if (!acc[child.title]) {
          acc[child.title] = [];
        }
        acc[child.title].push(child);
        return acc;
      }, {});

      return {
        ...category,
        children: Object.entries(groupedChildren).map(([title, items]) => ({
          title,
          children: items,
        })),
      };
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories get successfully.",
      data: groupByTitle,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await prisma.categoryMaster.findMany({
      where: { parent_id: null, isActive: true, image: { not: "" } },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        image: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Categories get successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { getCategory, getCategories };
