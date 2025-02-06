import prisma from "../../DB/config.js";

const getCollection = async (req, res, next) => {
  try {
    const collection = await prisma.collection.findMany({
      where: {
        isActive: true,
        showInHome: true,
      },
      select: {
        id: true,
        position: true,
        name: true,
        title: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        showInHome: true,
        CatalogueCollection: {
          where: { catalogue_id: { not: null } },
          include: {
            catalogue: {
              where: { isActive: true, deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });
    // const transformedData = collection.map((item) => {
    //   const catalogueCollection = item.CatalogueCollection.map((val) => {
    //     const hasSingle = val.catalogue.Product.some(
    //       (product) => product.showInSingle
    //     );
    //     delete val.catalogue.Product;
    //     return {
    //       ...val.catalogue,
    //       type: hasSingle ? "Full Set + Single" : "Full Set",
    //     };
    //   });
    //   delete item.CatalogueCollection;
    //   return { ...item, catalogueCollection };
    // });

    const transformedData = await Promise.all(
      collection.map(async (item) => {
        const catalogueCollection = await Promise.all(
          item.CatalogueCollection.map(async (val) => {
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
                price: true,
                catalogue_discount: true,
                average_price: true,
                GST: true,
                offer_price: true,
                weight: true,
                meta_title: true,
                meta_keyword: true,
                meta_description: true,
                coverImage: true,
                tag: true,
                deletedAt: true,
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
              take: 5,
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

        delete item.CatalogueCollection;
        return { ...item, catalogueCollection: catalogueData };
      })
    );

    return res.status(200).json({
      isSuccess: true,
      message: "Collections get successfully.",
      data: transformedData,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, Please try again!");
    next(error);
  }
};

export { getCollection };
