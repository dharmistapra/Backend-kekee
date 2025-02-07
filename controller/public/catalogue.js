import prisma from "../../db/config.js";

const getCatalogue = async (req, res, next) => {
  try {
    const { perPage, pageNo, url } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    if (!url)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please url provided!" });

    const fetchCategory = await prisma.menu.findFirst({
      where: { url: url },
      select: { category_id: true },
    });
    if (!fetchCategory)
      return res
        .status(404)
        .json({ isSuccess: false, message: "menu not found!" });
    const { category_id } = fetchCategory;
    const count = await prisma.catalogue.count({
      where: {
        CatalogueCategory: { some: { category_id: category_id } },
        isActive: true,
        deletedAt: null,
      },
    });
    const catalogueData = await prisma.catalogue.findMany({
      where: {
        CatalogueCategory: { some: { category_id: category_id } },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        cat_code: true,
        url: true,
        quantity: true,
        no_of_product: true,
        price: true,
        catalogue_discount: true,
        average_price: true,
        offer_price: true,
        weight: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        coverImage: true,
        CatalogueCategory: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        CatalogueSize: {
          select: {
            size: {
              select: {
                value: true,
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
      skip,
      take,
      orderBy: { updatedAt: "desc" },
    });

    const transformedData = catalogueData.map((item) => {
      item.CatalogueSize = item.CatalogueSize.map((value) => value.size.value);
      const hasSingle = item.Product.some((product) => product.showInSingle);
      delete item.Product;
      delete item.CatalogueCategory;
      return {
        ...item,
        type: hasSingle ? "Full Set + Single" : "Full Set",
      };
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue get successfully.",
      data: transformedData,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getCatalogueProduct = async (req, res, next) => {
  try {
    const url = req.params.url;

    const product = await prisma.catalogue.findUnique({
      where: { url: url },
      select: {
        id: true,
        name: true,
        cat_code: true,
        no_of_product: true,
        url: true,
        quantity: true,
        price: true,
        catalogue_discount: true,
        average_price: true,
        offer_price: true,
        stitching: true,
        size: true,
        weight: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        // coverImage: true,
        description: true,
        tag: true,
        isActive: true,
        CatalogueCategory: {
          where: { category: { parent_id: null } },
          select: {
            category: {
              select: {
                id: true,
                StitchingGroup: {
                  select: {
                    id: true,
                    name: true,
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
                            isActive: true,
                            isCustom: true,
                            stitchingValues: {
                              select: {
                                id: true,
                                type: true,
                                name: true,
                                range: true,
                                values: true,
                              },
                              where: {
                                isActive: true,
                              },
                            },
                          },
                        },
                      },
                      where: {
                        stitchingOption: {
                          isActive: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Product: {
          select: {
            id: true,
            name: true,
            catalogue_id: true,
            sku: true,
            url: true,
            quantity: true,
            average_price: true,
            image: true,
            description: true,
            isActive: true,
            showInSingle: true,
            readyToShip: true,
            // labels: {
            //   select: {
            //     id: true,
            //     label: {
            //       select: {
            //         id: true,
            //         name: true,
            //       },
            //     },
            //     expiryTime: true,
            //   },
            // },
          },
        },
      },
    });

    if (product && product.stitching) {
      product.stitchingOption = product.CatalogueCategory?.map((item) => {
        const stitchingGroup = item.category?.StitchingGroup;

        if (Array.isArray(stitchingGroup) && stitchingGroup.length > 0) {
          return stitchingGroup.flatMap((group) => ({
            id: group.id,
            name: group.name,
            stitchingOption: group.stitchingGroupOption
              .map((option) => ({
                ...option.stitchingOption,
              }))
              .flat(),
          }));
        }

        return [];
      }).flat();
    }
    delete product?.CatalogueCategory;

    return res.status(200).json({
      isSuccess: true,
      message: "Catalogue products get successfully.",
      data: product,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const searchCatalogueAndProduct = async (req, res, next) => {
  try {
    let isSingleSearch = req.query?.isSingleSearch || "false";
    const search = req.query?.search?.toLowerCase();
    const { perPage, pageNo } = req.body;

    let page = +pageNo || 1;
    let take = +perPage || 10;
    let skip = (page - 1) * take;

    let result;
    let count;
    let transformedData;
    if (isSingleSearch === "false") {
      let condition = {
        isActive: true,
        deletedAt: null,
      };
      if (search) {
        const search_condition = {
          contains: search,
          mode: "insensitive",
        };

        condition["OR"] = [
          {
            name: search_condition,
          },
          {
            cat_code: search_condition,
          },
          {
            url: search_condition,
          },
          {
            attributeValues: {
              some: {
                attributeValue: {
                  OR: [
                    { value: search_condition },
                    { name: search_condition },
                    { colour: search_condition },
                  ],
                },
              },
            },
          },
        ];
      }

      count = await prisma.catalogue.count({ where: condition });
      // if (count === 0)
      //   return res
      //     .status(200)
      //     .json({ isSuccess: true, message: "Catalogue not found!", data: [] });

      result = await prisma.catalogue.findMany({
        where: condition,
        select: {
          id: true,
          name: true,
          cat_code: true,
          url: true,
          quantity: true,
          no_of_product: true,
          price: true,
          catalogue_discount: true,
          average_price: true,
          offer_price: true,
          weight: true,
          meta_title: true,
          meta_keyword: true,
          meta_description: true,
          coverImage: true,
          CatalogueCategory: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          CatalogueSize: {
            select: {
              size: {
                select: {
                  value: true,
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
          attributeValues: {
            select: {
              id: true,
              attributeValue: { select: { id: true, name: true, value: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      });

      transformedData = result.map((item) => {
        item.CatalogueSize = item.CatalogueSize.map(
          (value) => value.size.value
        );
        const hasSingle = item.Product.some((product) => product.showInSingle);
        delete item.Product;
        delete item.CatalogueCategory;
        return {
          ...item,
          type: hasSingle ? "Full Set + Single" : "Full Set",
        };
      });
    } else {
      let condition = {
        isDraft: false,
        isActive: true,
        showInSingle: true,
        catalogue: { deletedAt: null },
      };
      if (search) {
        const search_condition = {
          contains: search,
          mode: "insensitive",
        };

        condition["OR"] = [
          {
            name: search_condition,
          },
          {
            sku: search_condition,
          },
          {
            url: search_condition,
          },
          {
            attributeValues: {
              some: {
                attributeValue: {
                  OR: [
                    { value: search_condition },
                    { name: search_condition },
                    { colour: search_condition },
                  ],
                },
              },
            },
          },
        ];
      }

      count = await prisma.product.count({ where: condition });
      // if (count === 0)
      //   return res
      //     .status(200)
      //     .json({ isSuccess: true, message: "Catalogue not found!", data: [] });

      transformedData = await prisma.product.findMany({
        where: condition,
        select: {
          id: true,
          name: true,
          sku: true,
          url: true,
          retail_price: true,
          retail_GST: true,
          retail_discount: true,
          offer_price: true,
          image: true,
          tag: true,
          stitching: true,
          isActive: true,
          attributeValues: {
            select: {
              attributeValue: { select: { id: true, name: true, value: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      });
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Products get successfully.",
      data: transformedData,
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

const relatedProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isCategoryExists = await prisma.categoryMaster.findUnique({
      where: { id: id },
    });

    if (!isCategoryExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Category not found!" });

    const result = await prisma.product.findMany({
      where: {
        categories: { some: { category_id: id } },
        catalogue: { deletedAt: null },
        isActive: true,
        isDraft: false,
      },
      select: {
        id: true,
        name: true,
        catalogue_id: true,
        sku: true,
        url: true,
        quantity: true,
        retail_price: true,
        retail_GST: true,
        retail_discount: true,
        offer_price: true,
        image: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const shuffledProducts = result
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    return res.status(200).json({
      isSuccess: true,
      message: "products get successfully",
      data: shuffledProducts,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, Please try again!");
    next(error);
  }
};
export {
  getCatalogue,
  getCatalogueProduct,
  searchCatalogueAndProduct,
  relatedProduct,
};
