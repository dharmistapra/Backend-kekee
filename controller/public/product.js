import prisma from "../../db/config.js";

const getProductpublic = async (req, res, next) => {
  try {
    // const { perPage, pageNo, url } = req.body;
    // const { filter, minPrice, maxPrice } = req.query;
    // const page = +pageNo || 1;
    // const take = +perPage || 10;
    // const skip = (page - 1) * take;
    // const fetchCategory = await prisma.menu.findFirst({
    //   where: { url: url },
    //   select: { category_id: true },
    // });

    // const { category_id } = fetchCategory;
    // let filters;
    // if (filter) {
    //   const filterSegment = filter.split(",");
    //   filters = filterSegment;
    // }

    // const priceCondition = {};
    // if (minPrice) priceCondition.gte = +minPrice;
    // if (maxPrice) priceCondition.lte = +maxPrice;

    // const count = await prisma.productCategory.count({
    //   where: {
    //     category_id: category_id,
    //     product: {
    //       ...((minPrice || maxPrice) && { offer_price: priceCondition }),
    //       isActive: true,
    //       showInSingle: true,
    //       isDraft: false,
    //       ...(filter && {
    //         attributeValues: {
    //           some: {
    //             OR: filters.map((value) => ({ attributeValue: { value } })),
    //           },
    //         },
    //       }),
    //     },
    //   },
    // });
    // const productData = await prisma.productCategory.findMany({
    //   where: {
    //     category_id: category_id,
    //     product: {
    //       isActive: true,
    //       showInSingle: true,
    //       ...((minPrice || maxPrice) && { offer_price: priceCondition }),
    //       ...(filter && {
    //         attributeValues: {
    //           some: {
    //             OR: filters.map((value) => ({ attributeValue: { value } })), // Match any filter value
    //           },
    //         },
    //       }),
    //     },
    //   },

    //   include: {
    //     category: {
    //       select: {
    //         id: true,
    //         name: true,
    //       },
    //     },
    //     product: {
    //       include: {
    //         attributeValues: {
    //           select: { id: true, attributeValue: true },
    //         },
    //       },
    //     },
    //   },
    //   skip,
    //   take,
    //   orderBy: { updatedAt: "asc" },
    // });

    const { perPage, pageNo, url, user_id, price, name } = req.body;
    const { minPrice, maxPrice, ...dynamicFilters } = req.query;

    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    let wishList = [];
    if (user_id) {
      if (!/^[a-fA-F0-9]{24}$/.test(user_id)) {
        return res
          .status(400)
          .json({ isSuccess: false, message: "Invalid User ID format!" });
      }

      const wishLists = await prisma.wishList.findMany({
        where: { user_id: user_id, product_id: { not: null } },
        select: {
          id: true,
          product_id: true,
        },
      });
      if (wishLists.length > 0) {
        wishLists.map((value) => wishList.push(value));
      }
    }

    // Fetch the category based on the URL
    const fetchCategory = await prisma.categoryMaster.findFirst({
      where: { url: url },
      select: { id: true },
    });

    if (!fetchCategory) {
      return res.status(404).json({
        isSuccess: false,
        message: "Category not found.",
      });
    }

    const { id } = fetchCategory;

    let orderBy = { updatedAt: "desc" };
    if (price) {
      price === "high"
        ? (orderBy["product"] = { offer_price: "asc" })
        : (orderBy["product"] = { offer_price: "desc" });
      delete orderBy["updatedAt"];
    }
    if (!price && name) {
      name === "AtoZ"
        ? (orderBy["product"] = { name: "asc" })
        : (orderBy["product"] = { name: "desc" });
      delete orderBy["updatedAt"];
    }
    // Build dynamic filter conditions for attributes
    let filterConditions = [];
    for (const [key, value] of Object.entries(dynamicFilters)) {
      const values = value.split(","); // Support multiple values for a single attribute
      filterConditions.push(
        ...values.map((val) => ({
          attributeValues: {
            some: {
              attributeValue: {
                attribute: { name: key }, // Match the attribute name dynamically
                value: val,
              },
            },
          },
        }))
      );
    }

    // Build the price condition
    const priceCondition = {};
    if (minPrice) priceCondition.gte = +minPrice;
    if (maxPrice) priceCondition.lte = +maxPrice;

    // Count total products matching the conditions
    const count = await prisma.productCategory.count({
      where: {
        category_id: id,
        product: {
          isActive: true,
          showInSingle: true,
          ...((minPrice || maxPrice) && { offer_price: priceCondition }),
          ...(filterConditions.length > 0 && { OR: filterConditions }),
        },
      },
    });

    // Fetch paginated products
    const productData = await prisma.productCategory.findMany({
      where: {
        category_id: id,
        product: {
          isActive: true,
          showInSingle: true,
          ...((minPrice || maxPrice) && { offer_price: priceCondition }),
          ...(filterConditions.length > 0 && { OR: filterConditions }),
        },
      },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
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
            tag: true,
            isActive: true,
            readyToShip: true,
            meta_title: true,
            meta_keyword: true,
            meta_description: true,
            attributeValues: {
              select: { id: true, attributeValue: true },
            },
          },
        },
      },
      skip,
      take,
      orderBy: orderBy,
    });

    const product = productData.map((value) => {
      value.product.wishList = wishList.some(
        (wish) => wish.product_id === value.product.id
      );
      value.product.wishList_id =
        wishList.find((wish) => wish.product_id === value.product.id)?.id ||
        null;
      // if (user_id && wishList.length > 0)
      //   value.product.wishList = wishList.includes(value.product.id);

      value.product.outOfStock = value.product.quantity === 0;
      return value;
    });

    // Return response
    return res.status(200).json({
      isSuccess: true,
      message: "Products fetched successfully.",
      data: product,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data: productData,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const getProductDetails = async (req, res, next) => {
  try {
    const { url } = req.params;
    const data = await prisma.product.findUnique({
      where: {
        url: url,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        showInSingle: true,
        catalogue_id: true,
        url: true,
        quantity: true,
        weight: true,
        average_price: true,
        retail_price: true,
        retail_discount: true,
        offer_price: true,
        image: true,
        description: true,
        tag: true,
        readyToShip: true,
        stitching: true,
        categories: {
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
        attributeValues: {
          select: {
            attribute: true,
            attributeValue: true,
          },
        },
        colours: {
          include: {
            colour: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        labels: {
          select: {
            id: true,
            label: {
              select: {
                id: true,
                name: true,
              },
            },
            expiryTime: true,
          },
        },
        sizes: {
          where: { size: { isActive: true } },
          include: {
            size: {
              select: {
                id: true,
                value: true,
                position: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!data)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });

    if (data?.attributeValues?.length) {
      const processedAttributes = data.attributeValues.reduce((acc, item) => {
        const { attribute, attributeValue } = item;
        if (attribute.type === "ExpiryTime") return acc;
        if (attribute.type === "Label") {
          data.label = attributeValue.value;
          return acc;
        }

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
      }, {});

      data.attributeValues = Object.values(processedAttributes);
    }
    if (data?.colours && data?.colours?.length > 0) {
      data.colours = data.colours.map((item) => item.colour);
    }
    if (data?.labels && data?.labels?.length > 0) {
      data.labels = data.labels.map((item) => {
        item.label["expiryTime"] = item.expiryTime;
        return { label: item.label };
      });
    }
    if (data && data.stitching) {
      data.stitchingOption = data.categories
        ?.map((item) => {
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
        })
        .flat();
    }

    console.log("data.categories", data.categories);
    if (data && data.categories) {
      data.categories = data.categories.map((item) => item.category.id);
    }

    // if (data && data.stitching) {
    //   data.stitchingGroupsWithOptions = data.categories?.map((item) => {
    //     const stitchingGroup = item.category?.StitchingGroup;

    //     if (Array.isArray(stitchingGroup) && stitchingGroup.length > 0) {
    //       return stitchingGroup.map(group => ({
    //         stitchingGroup: group,
    //         // stitchingOptions: group.stitchingGroupOption.map(option => option.stitchingOption),
    //       }));
    //     }
    //     return [];
    //   }).flat();
    // }

    if (data && data.sizes) {
      data.sizes = data.sizes
        ?.map((item) => {
          item.size.price = item.price;
          item.size.quantity = item.quantity;
          return item.size;
        })
        .flat();
    }
    console.log("dataata => ", data.stitchingOption);
    // delete data.categories;

    return res.status(200).json({
      isSuccess: true,
      message: "Product get successfully.",
      data: data,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const filterAttribute = async (req, res, next) => {
  try {
    const url = req.params.url;

    if (!url)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please url provide!" });

    const fetchCategory = await prisma.menu.findFirst({
      where: { url: url },
      select: { category_id: true },
    });

    if (!fetchCategory)
      return res
        .status(404)
        .json({ isSuccess: false, message: "menu not found!" });
    const { category_id } = fetchCategory;
    // const attributes = await prisma.attributeMaster.findMany({
    //   where: { isActive: true, showInFilter: true },
    //   select: {
    //     id: true,
    //     name: true,
    //     key: true,
    //     inputType: true,
    //     type: true,
    //     CategoryAttribute: true,
    //     ProductAttributeValue: true,
    //   },
    // });

    const productData = await prisma.product.findMany({
      where: {
        categories: {
          some: { category_id: category_id },
        },
        isActive: true,
        showInSingle: true,
      },
      include: {
        attributeValues: {
          select: {
            attributeValue: {
              where: {
                isActive: true,
                attribute: { isActive: true, showInFilter: true },
              },
              select: {
                id: true,
                name: true,
                value: true,
                colour: true,
                isActive: true,
                attribute: {
                  select: {
                    id: true,
                    name: true,
                    key: true,
                  },
                },
              },
            },
          },
        },
        colours: {
          where: { colour: { isActive: true } },
          include: {
            colour: {
              select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    let colours = [];
    let attributes = [];
    let price = [];

    productData.forEach((product) => {
      product.colours.forEach((colourItem) => {
        if (!colours.some((c) => c.id === colourItem.colour.id)) {
          colours.push(colourItem.colour);
        }
      });

      if (Array.isArray(product.attributeValues)) {
        product.attributeValues.forEach((attributeWrapper) => {
          const attributeValue = attributeWrapper?.attributeValue;
          if (attributeValue?.attribute) {
            // Check if the attribute already exists in the attributes array
            let existingAttribute = attributes.find(
              (attr) => attr.attribute.id === attributeValue.attribute.id
            );

            if (existingAttribute) {
              // Add the new value to the existing attribute
              let existingAttributeValue = existingAttribute.value.find(
                (attr) => attr.id === attributeValue.id
              );
              if (!existingAttributeValue) {
                existingAttribute.value.push({
                  id: attributeValue.id,
                  name: attributeValue.name,
                  value: attributeValue.value,
                  colour: attributeValue.colour,
                });
              }
            } else {
              // Create a new attribute entry
              attributes.push({
                attribute: attributeValue.attribute,
                value: [
                  {
                    id: attributeValue.id,
                    name: attributeValue.name,
                    value: attributeValue.value,
                    colour: attributeValue.colour,
                  },
                ],
              });
            }
          }
        });
      }

      price.push(product.offer_price);
    });

    let priceRange = {
      minPrice: Math.min(...price),
      maxPrice: Math.max(...price),
    };
    const data = {
      attributes,
      colours,
      priceRange,
    };

    return res.status(200).json({
      isSuccess: true,
      message: "Attributes get successfully",
      data: data,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { getProductpublic, getProductDetails, filterAttribute };
