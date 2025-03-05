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

const getCategoryCollection = async (req, res, next) => {
  try {
    const result = await prisma.categoryMaster.findMany({
      where: { parent_id: null, isActive: true, showInHome: true },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        url: true,
        CatalogueCategory: {
          where: { catalogue: { isActive: true, deletedAt: null } },
          select: {
            id: true,
            catalogue_id: true,
            category_id: true,
          },
        },
      },
      orderBy: { position: "asc" },
    });

    const transformedData = await Promise.all(
      result.map(async (item) => {
        const catalogueCollection = await Promise.all(
          item.CatalogueCategory.map(async (val) => {
            const latestCatalogues = await prisma.catalogue.findMany({
              where: {
                id: val.catalogue_id,
                isActive: true,
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                cat_code: true,
                no_of_product: true,
                url: true,
                average_price: true,
                offer_price: true,
                coverImage: true,
                attributeValues: {
                  where: { attribute: { type: "Label" } },
                  select: {
                    attributeValue: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                Product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    showInSingle: true,
                  },
                },
              },
              take: 8,
              orderBy: { updatedAt: "desc" },
            });

            return latestCatalogues.map((catalogue) => {
              let labels = [];
              catalogue.attributeValues.map((attribute) =>
                labels.push(attribute.attributeValue.value)
              );
              catalogue.labels = labels;
              delete catalogue.attributeValues;
              const hasSingle = catalogue.Product.some(
                (product) => product.showInSingle
              );
              delete catalogue.Product;
              return {
                ...catalogue,
                type: hasSingle ? "Full Set + Single" : "Full Set",
              };
            });
          })
        );

        const catalogueData = catalogueCollection
          .flat()
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        delete item.CatalogueCategory;
        return { ...item, catalogueCollection: catalogueData };
      })
    );

    return res.status(200).json({
      isSuccess: true,
      message: "categories get successfully.",
      data: transformedData,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { getCategory, getCategories, getCategoryCollection };
