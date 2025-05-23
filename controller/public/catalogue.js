import prisma from "../../db/config.js";
import { tokenExists } from "../../helper/common.js";

const getCatalogue = async (req, res, next) => {
  try {
    const { perPage, pageNo, url, user_id, price, name } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const isTokenExists = await tokenExists(req);

    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });

    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;
    if (!url)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please url provided!" });

    let wishList = [];
    if (user_id) {
      if (!/^[a-fA-F0-9]{24}$/.test(user_id)) {
        return res
          .status(400)
          .json({ isSuccess: false, message: "Invalid User ID format!" });
      }

      const wishLists = await prisma.wishList.findMany({
        where: { user_id: user_id, catalogue_id: { not: null } },
        select: {
          id: true,
          catalogue_id: true,
        },
      });
      if (wishLists.length > 0) {
        wishLists.map((value) => wishList.push(value));
      }
    }

    const fetchCategory = await prisma.categoryMaster.findFirst({
      where: { url: url },
      select: { id: true },
    });
    if (!fetchCategory)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Category not found!" });
    const { id } = fetchCategory;
    let filter = {
      CatalogueCategory: { some: { category_id: id } },
      isActive: true,
      deletedAt: null,
    };
    let orderBy = { updatedAt: "desc" };
    if (price) {
      price === "high"
        ? (orderBy["offer_price"] = "asc")
        : (orderBy["offer_price"] = "desc");
      delete orderBy["updatedAt"];
    }
    if (!price && name) {
      name === "AtoZ" ? (orderBy["name"] = "asc") : (orderBy["name"] = "desc");
      delete orderBy["updatedAt"];
    }
    const count = await prisma.catalogue.count({
      where: filter,
    });
    const catalogueData = await prisma.catalogue.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        cat_code: true,
        url: true,
        quantity: true,
        no_of_product: true,
        ...(shouldHidePrice === false && {
          price: true,
          catalogue_discount: true,
          average_price: true,
          offer_price: true,
        }),
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
      orderBy: orderBy,
    });

    const transformedData = catalogueData.map((item) => {
      item.CatalogueSize = item.CatalogueSize.map((value) => value.size.value);
      const hasSingle = item.Product.some((product) => product.showInSingle);
      const outOfStock = item.quantity === 0;
      // item.wishList = false;
      // item.wishList_id = null;
      // if (user_id && wishList.length > 0)
      (item.wishList = wishList.some((wish) => wish.catalogue_id === item.id)),
        (item.wishList_id =
          wishList.find((wish) => wish.catalogue_id === item.id)?.id || null),
        // wishList.map((value) => {
        //   if (value.catalogue_id === item.id) {
        //     item.wishList = true;
        //     item.wishList_id = value.id;
        //   }
        // });
        delete item.Product;
      delete item.CatalogueCategory;
      return {
        ...item,
        type: hasSingle ? "Full Set + Single" : "Full Set",
        outOfStock: outOfStock,
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
    const isTokenExists = await tokenExists(req);
    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });

    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;
    const product = await prisma.catalogue.findUnique({
      where: { url: url },
      select: {
        id: true,
        name: true,
        cat_code: true,
        no_of_product: true,
        url: true,
        quantity: true,
        ...(shouldHidePrice === false && {
          price: true,
          catalogue_discount: true,
          average_price: true,
          offer_price: true,
        }),
        optionType: true,
        weight: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        description: true,
        tag: true,
        isActive: true,
        CatalogueCategory: {
          where: { category: { parent_id: null } },
          select: {
            category: {
              select: {
                id: true,
                // StitchingGroup: {
                //   select: {
                //     id: true,
                //     name: true,
                //     stitchingGroupOption: {
                //       select: {
                //         stitchingOption: {
                //           select: {
                //             id: true,
                //             name: true,
                //             catalogue_price: true,
                //             price: true,
                //             type: true,
                //             dispatch_time: true,
                //             isActive: true,
                //             isCustom: true,
                //             isDefault: true,
                //             stitchingValues: {
                //               select: {
                //                 id: true,
                //                 type: true,
                //                 name: true,
                //                 range: true,
                //                 values: true,
                //               },
                //               where: {
                //                 isActive: true,
                //               },
                //             },
                //           },
                //         },
                //       },
                //       where: {
                //         stitchingOption: {
                //           isActive: true,
                //         },
                //       },
                //     },
                //   },
                // },
              },
            },
          },
        },
        attributeValues: {
          where: { attribute: { type: { not: "Label" } } },
          select: {
            attribute: true,
            attributeValue: true,
          },
        },
        CatalogueSize: {
          where: { size: { isActive: true } },
          select: {
            size: {
              select: {
                id: true,
                position: true,
                value: true,
              },
            },
            price: true,
            quantity: true,
          },
        },
        Product: {
          select: {
            // id: true,
            // name: true,
            // catalogue_id: true,
            sku: true,
            url: true,
            // quantity: true,
            ...(shouldHidePrice === false && { average_price: true }),
            image: true,
            // description: true,
            // isActive: true,
            showInSingle: true,
            // readyToShip: true,
            // attributeValues: {
            //   where: { attribute: { type: "Label" } },
            //   select: {
            //     attribute: true,
            //     attributeValue: true,
            //   },
            // },
          },
        },
      },
    });

    if (product?.Product) {
      product.Product = product.Product.map(p => ({
        ...p,
        image: p.image?.[0] || null,
      }));
    }


    if (product?.attributeValues?.length > 0) {
      const processedAttributes = product.attributeValues.reduce(
        (acc, item) => {
          const { attribute, attributeValue } = item;
          if (!acc[attribute.id]) {
            acc[attribute.id] = {
              name: attribute.name,
              key: attribute.key,
              values: [],
            };
          }
          if (attributeValue && attributeValue.attr_id === attribute.id) {
            acc[attribute.id].values.push(attributeValue.value);
          }
          return acc;
        },
        {}
      );

      product.attributeValues = Object.values(processedAttributes);
    }

    if (product.optionType === "Size" && product.CatalogueSize.length > 0) {
      product.Size = product.CatalogueSize.map((val) => ({
        id: val.size.id,
        value: val.size.value,
        position: val.size.position,
        price: val.price,
        quantity: val.quantity,
      }));
    }

    if (product.Product.length > 0) {
      for (let value of product.Product) {
        if (value?.attributeValues?.length > 0) {
          let labels = [];

          value.attributeValues.reduce((acc, item) => {
            const { attribute, attributeValue } = item;
            labels.push({
              label: attributeValue.name,
              colour: attributeValue.colour,
            });
            return acc;
          }, {});
          value.labels = labels;
        }
        delete value.attributeValues;
      }
    }
    delete product?.CatalogueSize;
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



const getCatalogueStitching = async (req, res, next) => {
  try {
    const url = req.params.url;
    const product = await prisma.catalogue.findUnique({
      where: { url: url },
      select: {
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
                            isDefault: true,
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
      },
    });


    const stitchingOption = product?.CatalogueCategory?.map((item) => {
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

    if (stitchingOption && stitchingOption.length > 0) {
      return res.status(200).json({
        isSuccess: true,
        message: "Catalogue stitching get successfully.",
        data: stitchingOption,
      });
    } else {
      return res.status(500).json({
        isSuccess: true,
        message: "Catalogue stitching not found.",
        data: [],
      });
    }

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
        CatalogueCategory: { some: { category: { isActive: true } } },
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
            description: search_condition,
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
          description: true,
          CatalogueCategory: {
            where: { category: { isActive: true } },
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  url: true,
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
        item.outOfStock = item.quantity === 0;
        item.categoryUrl = item?.CatalogueCategory[0]?.category.url;
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
        categories: { some: { category: { isActive: true } } },
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
            description: search_condition,
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

      result = await prisma.product.findMany({
        where: condition,
        select: {
          id: true,
          name: true,
          sku: true,
          url: true,
          quantity: true,
          retail_price: true,
          retail_GST: true,
          retail_discount: true,
          offer_price: true,
          image: true,
          mediumImage: true,
          description: true,
          tag: true,
          isActive: true,
          attributeValues: {
            select: {
              attributeValue: { select: { id: true, name: true, value: true } },
            },
          },
          categories: {
            where: { category: { isActive: true } },
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  url: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      });

      transformedData = result.map((item) => {
        item.outOfStock = item.quantity === 0;
        item.categoryUrl = item?.categories[0]?.category?.url;
        delete item.categories;
        return item;
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

// const relatedProduct = async (req, res, next) => {
//   try {
//     const isTokenExists = await tokenExists(req);
//     const isWebSettings = await prisma.webSettings.findFirst({
//       select: { showPrice: true },
//     });
//     const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;
//     const {slug} = req.params.slug;
//     const isCategoryExists = await prisma.categoryMaster.findUnique({
//       where: { id: id },
//     });

//     // console.log("isCategoryExists0",isCategoryExists)

//     if (!isCategoryExists)
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Category not found!" });

//     const result = await prisma.product.findMany({
//       where: {
//         categories: { some: { category_id: id } },
//         catalogue: { deletedAt: null },
//         isActive: true,
//         isDraft: false,
//       },
//       select: {
//         id: true,
//         name: true,
//         catalogue_id: true,
//         sku: true,
//         url: true,
//         mediumImage: true,
//         quantity: true,
//         ...(shouldHidePrice === false && {
//           retail_price: true,
//           retail_GST: true,
//           retail_discount: true,
//           offer_price: true,
//         }),
//         image: true,
//         categories: {
//           select: {
//             category: {
//               select: {
//                 url: true
//               }
//             }
//           }
//         }
//       },
//       orderBy: { updatedAt: "desc" },
//       take: 10,
//     });

//     const shuffledProducts = result
//       .sort(() => Math.random() - 0.5)
//       .slice(0, 10);
//     return res.status(200).json({
//       isSuccess: true,
//       message: "products get successfully",
//       data: shuffledProducts,
//     });
//   } catch (err) {
//     const error = new Error("Something went wrong, Please try again!");
//     next(error);
//   }
// };



const relatedProduct = async (req, res, next) => {
  try {
    const isTokenExists = await tokenExists(req);
    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });
    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;

    const { slug } = req.params;

    const currentProduct = await prisma.product.findUnique({
      where: { url: slug },
      include: { categories: true },
    });

    if (!currentProduct) {
      return res.status(404).json({
        isSuccess: false,
        message: "Product not found!",
      });
    }

    const categoryIds = currentProduct.categories.map((c) => c.category_id);
    const relatedProducts = await prisma.product.findMany({
      where: {
        id: { not: currentProduct.id },
        showInSingle: true,
        categories: {
          some: {
            category_id: { in: categoryIds },
          },
        },
        catalogue: { deletedAt: null },
        isActive: true,
        isDraft: false,
      },
      select: {
        id: true,
        name: true,
        catalogue_id: true,
        showInSingle: true,
        sku: true,
        url: true,
        mediumImage: true,
        quantity: true,
        ...(shouldHidePrice === false && {
          retail_price: true,
          retail_GST: true,
          retail_discount: true,
          offer_price: true,
        }),
        image: true,
        categories: {
          select: {
            category: {
              select: {
                url: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Related products fetched successfully",
      data: relatedProducts,
    });
  } catch (err) {
    console.error("Error in relatedProduct:", err);
    return res
      .status(500)
      .json({ isSuccess: false, message: "Something went wrong!" });
  }
};



const BASE_URL = "https://api.lajo.in/"
// const BASE_URL = "https://fb00-116-72-43-254.ngrok-free.app"
const shareProduct = async (req, res, next) => {
  try {
    const code = req.params.id;
    if (!code) {
      return res.status(400).json({
        isSuccess: false,
        message: "Please provide product id!",
      });
    }

    const isCatalogueExists = await prisma.catalogue.findFirst({
      where: { cat_code: code },
    });

    if (isCatalogueExists) {
      return res.status(200).json({
        isSuccess: true,
        message: "Catalogue get successfully.",
        data: `
            <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="${isCatalogueExists.name}" />
            <meta property="og:description" content="${isCatalogueExists.description}" />
            <meta property="og:image" content="${isCatalogueExists.image}" />
            <meta property="og:url" content="${url}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            <script>
              window.location.replace("${isCatalogueExists.id}");
            </script>
          </body>
        </html>
          `,
      });
    }

    const isProductExists = await prisma.product.findFirst({
      where: { sku: code },
    });

    let imageUrl = isProductExists.image[0];
    if (imageUrl.startsWith("upload")) {
      imageUrl = `${BASE_URL}/${imageUrl}`;
    }

    if (isProductExists) {
      return res
        .status(200)
        .setHeader("Content-Type", "text/html")
        .send(
          `<!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="${`${isProductExists.name}`}" />
            <meta property="og:description" content="${isProductExists.description}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:url" content="${isProductExists.id}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            <script>
              window.location.replace("${code}");
            </script>
          </body>
        </html>`
        );
    }

    return res.status(404).json({
      isSuccess: false,
      message: "Catalogue or Product not found!",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, Please try again!");
    next(error);
  }
};










const relatedCatalogue = async (req, res, next) => {
  try {
    const isTokenExists = await tokenExists(req);
    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });
    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;

    const { url } = req.params;
    console.log("slug", url)

    const currentCatalogue = await prisma.catalogue.findUnique({
      where: { url: url },
      include: { CatalogueCategory: true }
    });


    if (!currentCatalogue) {
      return res.status(404).json({
        isSuccess: false,
        message: "Catalogue not found!",
      });
    }

    const categoryIds = currentCatalogue.CatalogueCategory.map((c) => c.category_id);

    const relateCatalogue = await prisma.catalogue.findMany({
      where: {
        id: { not: currentCatalogue.id },
        CatalogueCategory: {
          some: {
            category_id: { in: categoryIds },
          },
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        no_of_product: true,
        cat_code: true,
        coverImage: true,
        url: true,
        name: true,
        ...(shouldHidePrice === false && {
          catalogue_discount: true,
          average_price: true,
          offer_price: true,
        }),
        CatalogueCategory: {
          where: { category: { isActive: true } },
          select: {
            category: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Related products fetched successfully",
      data: relateCatalogue,
    });
  } catch (err) {
    console.error("Error in relatedProduct:", err);
    return res
      .status(500)
      .json({ isSuccess: false, message: "Something went wrong!" });
  }
};
export {
  getCatalogue,
  getCatalogueProduct,
  searchCatalogueAndProduct,
  getCatalogueStitching,
  relatedProduct,
  shareProduct,
  relatedCatalogue,
};
