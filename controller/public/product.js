import prisma from "../../db/config.js";
import { tokenExists } from "../../helper/common.js";

const getProductpublic = async (req, res, next) => {
  try {
    const { perPage, pageNo, url, user_id, filter } = req.body;
    const { minPrice, maxPrice, ...dynamicFilters } = req.query;

    const isTokenExists = await tokenExists(req);
    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });
    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;
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
    if (filter) {
      if (filter === "price-ascending") {
        orderBy["product"] = { offer_price: "asc" };
      } else if (filter === "price-descending") {
        orderBy["product"] = { offer_price: "desc" };
      } else if (filter === "name-ascending") {
        orderBy["product"] = { name: "asc" };
      } else if (filter === "name-descending") {
        orderBy["product"] = { name: "desc" };
      }
      delete orderBy["updatedAt"];
    }
    let filterConditions = [];
    for (const [key, value] of Object.entries(dynamicFilters)) {
      const values = value.split(",");
      filterConditions.push(
        ...values.map((val) => ({
          attributeValues: {
            some: {
              attributeValue: {
                attribute: { key: key },
                value: val,
              },
            },
          },
        }))
      );
    }
    const priceCondition = {};
    if (minPrice) priceCondition.gte = +minPrice;
    if (maxPrice) priceCondition.lte = +maxPrice;
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
            thumbImage: true,
            mediumImage: true,
            tag: true,
            isActive: true,
            readyToShip: true,
            meta_title: true,
            meta_keyword: true,
            meta_description: true,
            attributeValues: {
              select: { id: true, attribute: true, attributeValue: true },
            },
          },
        },
      },
      skip,
      take,
      orderBy: orderBy,
    });

    const product = productData.map((value) => {
      if (value?.product?.attributeValues?.length > 0) {
        let labels = [];
        let colours = [];
        const processedAttributes = value.product.attributeValues.reduce(
          (acc, item) => {
            const { attribute, attributeValue } = item;
            if (attribute.type === "ExpiryTime") return acc;
            if (attribute.type === "Label") {
              labels.push({
                label: attributeValue.name,
                colour: attributeValue.colour,
              });
              return acc;
            }
            if (attribute.type === "Colour") {
              colours.push(attributeValue.value);
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
          },
          {}
        );
        value.product.labels = labels;
        value.product.colours = colours;
        value.product.attributeValues = Object.values(processedAttributes);
      }
      value.product.wishList = wishList.some(
        (wish) => wish.product_id === value.product.id
      );
      value.product.wishList_id =
        wishList.find((wish) => wish.product_id === value.product.id)?.id ||
        null;
      value.product.outOfStock = value.product.quantity === 0;

      if (shouldHidePrice) {
        delete value.product.retail_price;
        delete value.product.retail_GST;
        delete value.product.retail_discount;
        delete value.product.offer_price;
      }
      return value;
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Products fetched successfully.",
      data: product,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });

    // return res.status(200).json({
    //   isSuccess: true,
    //   message: "Product get successfully.",
    //   data: productData,
    //   totalCount: count,
    //   currentPage: page,
    //   pagesize: take,
    // });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const getProductDetails = async (req, res, next) => {
  try {
    const { url } = req.params;
    const isTokenExists = await tokenExists(req);
    const isWebSettings = await prisma.webSettings.findFirst({
      select: { showPrice: true },
    });
    const shouldHidePrice = !isTokenExists && isWebSettings.showPrice === false;
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
        catalogue: {
          select: { id: true, name: true, url: true },
        },
        url: true,
        quantity: true,
        weight: true,
        ...(shouldHidePrice === false && {
          average_price: true,
          retail_price: true,
          retail_discount: true,
          offer_price: true,
        }),
        description: true,
        tag: true,
        readyToShip: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        optionType: true,
        categories: {
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
          select: {
            attribute: true,
            attributeValue: true,
          },
        },
        // colours: {
        //   include: {
        //     colour: {
        //       select: {
        //         code: true,
        //         name: true,
        //       },
        //     },
        //   },
        // },
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
        sizes: {
          where: { size: { isActive: true } },
          include: {
            size: {
              select: {
                id: true,
                value: true,
                position: true,
              },
            },
          },
        },
        RelatedProduct: {
          where: {
            related: { catalogue: { deletedAt: null }, isActive: true },
          },
          select: {
            related: {
              select: {
                id: true,
                sku: true,
                url: true,
                image: true,
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

    data.catalogueUrl = data.catalogue?.url || null;
    if (data?.attributeValues?.length > 0) {
      // let labels = [];
      // let colours = [];
      // const processedAttributes = data.attributeValues.reduce((acc, item) => {
      //   const { attribute, attributeValue } = item;
      //   if (attribute.type === "ExpiryTime") return acc;
      //   if (attribute.type === "Label") {
      //     labels.push({
      //       label: attributeValue.name,
      //       colour: attributeValue.colour,
      //     });
      //     return acc;
      //   }

      //   if (attribute.type === "Colour") {
      //     acc[attribute.id].values.push({
      //       color: attributeValue.colour || null,
      //       value: attributeValue.name,
      //     });
      //   } else {
      //     acc[attribute.id].values.push(attributeValue.name);
      //   }

      //   if (!acc[attribute.id]) {
      //     acc[attribute.id] = {
      //       name: attribute.name,
      //       key: attribute.key,
      //       values: [],
      //     };
      //   }
      //   if (attributeValue && attributeValue.attr_id === attribute.id) {
      //     acc[attribute.id].values.push(attributeValue.name);
      //   }
      //   return acc;
      // }, {});

      let labelsList = [];
      const processedAttributes = data?.attributeValues.reduce((acc, { attribute, attributeValue }) => {
        if (!attribute || !attributeValue) return acc;
        if (attribute.type === "Label") {
          labelsList.push({
            label: attributeValue.name,
            colour: attributeValue.colour,
          });
          return acc;
        }
        if (attribute.type === "ExpiryTime") return acc;
        if (!acc[attribute.id]) {
          acc[attribute.id] = {
            name: attribute.name,
            key: attribute.key,
            values: [],
          };
        }
        if (attribute.type === "Colour") {
          acc[attribute.id].values.push({
            color: attributeValue.colour || null,
            value: attributeValue.name,
          });
        } else {
          acc[attribute.id].values.push(attributeValue.name);
        }

        return acc;
      }, {});
      data.labels = labelsList;
      data.attributeValues = Object.values(processedAttributes);
    }

    // if (data && data.optionType === "Stitching") {
    //   data.stitchingOption = data.categories
    //     ?.map((item) => {
    //       const stitchingGroup = item.category?.StitchingGroup;

    //       if (Array.isArray(stitchingGroup) && stitchingGroup.length > 0) {
    //         return stitchingGroup.flatMap((group) => ({
    //           id: group.id,
    //           name: group.name,
    //           stitchingOption: group.stitchingGroupOption
    //             .map((option) => ({
    //               ...option.stitchingOption,
    //             }))
    //             .flat(),
    //         }));
    //       }

    //       return [];
    //     })
    //     .flat();
    // }

    if (data && data.categories) {
      data.categories = data.categories.map((item) => item.category.id);
    }

    if (data && data.sizes) {
      data.sizes = data.sizes
        ?.map((item) => {
          item.size.price = item.price;
          item.size.quantity = item.quantity;
          return item.size;
        })
        .flat();
    }
    if (data && data.RelatedProduct) {
      data.RelatedProduct = data.RelatedProduct?.map((item) => {
        return item.related;
      }).flat();
    }

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

const getProductImages = async (req, res, next) => {
  try {
    const { url } = req.params;
    const data = await prisma.product.findUnique({
      where: {
        url: url,
        isActive: true,
      },
      select: {
        image: true,
        thumbImage: true,
      },
    });

    if (!data)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Product not found!" });
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



const getProductStitching = async (req, res, next) => {
  try {
    const { url } = req.params;

    const product = await prisma.product.findUnique({
      where: { url, isActive: true },
      select: {
        categories: {
          select: {
            category: {
              select: {
                StitchingGroup: {
                  select: {
                    id: true,
                    name: true,
                    stitchingGroupOption: {
                      where: {
                        stitchingOption: { isActive: true },
                      },
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
                              where: { isActive: true },
                              select: {
                                id: true,
                                type: true,
                                name: true,
                                range: true,
                                values: true,
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
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        isSuccess: false,
        message: "Product not found!",
      });
    }

    const stitchingOption = product.categories
      ?.flatMap((item) => item.category?.StitchingGroup || [])
      .map((group) => ({
        id: group.id,
        name: group.name,
        stitchingOption: group.stitchingGroupOption
          .map((opt) => opt.stitchingOption)
          .flat(),
      }));

    return res.status(200).json({
      isSuccess: true,
      message: "Stitching options fetched successfully.",
      data: stitchingOption,
    });
  } catch (error) {
    console.error(error);
    next(new Error("Something went wrong, please try again!"));
  }
};












// const getProductDetails = async (req, res, next) => {
//   try {
//     const { url } = req.params;

//     const isTokenExists = await tokenExists(req);

//     const isWebSettings = await prisma.webSettings.findFirst({
//       select: { showPrice: true },
//     });

//     const shouldHidePrice = !isTokenExists && isWebSettings?.showPrice === false;

//     const product = await prisma.product.findFirst({
//       where: {
//         url,
//         isActive: true,
//       },
//       select: {
//         id: true,
//         name: true,
//         sku: true,
//         showInSingle: true,
//         catalogue_id: true,
//         url: true,
//         quantity: true,
//         weight: true,
//         description: true,
//         tag: true,
//         readyToShip: true,
//         meta_title: true,
//         meta_keyword: true,
//         meta_description: true,
//         optionType: true,
//         image: true,
//         thumbImage: true,
//         ...(shouldHidePrice === false && {
//           average_price: true,
//           retail_price: true,
//           retail_discount: true,
//           offer_price: true,
//         }),
//         catalogue: {
//           select: { id: true, name: true, url: true },
//         },
//       },
//     });

//     if (!product) {
//       return res.status(404).json({
//         isSuccess: false,
//         message: "Product not found!",
//       });
//     }

//     const [attributeValues, categories, colours, labels, sizes, relatedProducts] =
//       await Promise.all([
//         prisma.productAttributeValue.findMany({
//           where: { product_id: product.id },
//           select: {
//             attribute: true,
//             attributeValue: true,
//           },
//         }),

//         prisma.productCategory.findMany({
//           where: { product_id: product.id },
//           select: {
//             category: {
//               select: {
//                 id: true,
//                 StitchingGroup: {
//                   select: {
//                     id: true,
//                     name: true,
//                     stitchingGroupOption: {
//                       where: {
//                         stitchingOption: { isActive: true },
//                       },
//                       select: {
//                         stitchingOption: {
//                           select: {
//                             id: true,
//                             name: true,
//                             catalogue_price: true,
//                             price: true,
//                             type: true,
//                             dispatch_time: true,
//                             isActive: true,
//                             isCustom: true,
//                             isDefault: true,
//                             stitchingValues: {
//                               where: { isActive: true },
//                               select: {
//                                 id: true,
//                                 type: true,
//                                 name: true,
//                                 range: true,
//                                 values: true,
//                               },
//                             },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         }),


//         prisma.productLabel.findMany({
//           where: { product_id: product.id },
//           select: {
//             id: true,
//             label: {
//               select: {
//                 id: true,
//                 name: true,
//               },
//             },
//             expiryTime: true,
//           },
//         }),

//         prisma.productSize.findMany({
//           where: {
//             product_id: product.id,
//             size: { isActive: true },
//           },
//           include: {
//             size: {
//               select: {
//                 id: true,
//                 value: true,
//                 position: true,
//               },
//             },
//           },
//         }),

//         prisma.relatedProduct.findMany({
//           where: {
//             product_id: product.id,
//             related: {
//               isActive: true,
//               catalogue: { deletedAt: null },
//             },
//           },
//           select: {
//             related: {
//               select: {
//                 id: true,
//                 sku: true,
//                 url: true,
//                 image: true,
//               },
//             },
//           },
//         }),
//       ]);


//     product.catalogueUrl = product.catalogue?.url || null;

//     let labelsList = [];
//     const processedAttributes = attributeValues.reduce((acc, { attribute, attributeValue }) => {
//       if (!attribute || !attributeValue) return acc;
//       if (attribute.type === "Label") {
//         labelsList.push({
//           label: attributeValue.name,
//           colour: attributeValue.colour,
//         });
//         return acc;
//       }
//       if (attribute.type === "ExpiryTime") return acc;
//       if (!acc[attribute.id]) {
//         acc[attribute.id] = {
//           name: attribute.name,
//           key: attribute.key,
//           values: [],
//         };
//       }
//       if (attribute.type === "Colour") {
//         acc[attribute.id].values.push({
//           color: attributeValue.colour || null,
//           value: attributeValue.name,
//         });
//       } else {
//         acc[attribute.id].values.push(attributeValue.name);
//       }

//       return acc;
//     }, {});


//     product.labels = labelsList;
//     product.attributeValues = Object.values(processedAttributes);



//     product.sizes = sizes?.map((item) => ({
//       ...item.size,
//       price: item.price,
//       quantity: item.quantity,
//     }));

//     product.RelatedProduct = relatedProducts?.map((item) => item.related);

//     product.categories = categories?.map((item) => item.category.id);

//     if (product.optionType === "Stitching") {
//       product.stitchingOption = categories
//         .map((catItem) => {
//           const groups = catItem.category?.StitchingGroup || [];
//           return groups.flatMap((group) => ({
//             id: group.id,
//             name: group.name,
//             stitchingOption: group.stitchingGroupOption
//               .flatMap((opt) => opt.stitchingOption),
//           }));
//         })
//         .flat();
//     }

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Product get successfully.",
//       data: product,
//     });
//   } catch (error) {
//     console.error(error);
//     next(new Error("Something went wrong, please try again!"));
//   }
// };


const filterAttribute = async (req, res, next) => {
  try {
    const url = req.params.url;

    if (!url)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please url provide!" });

    const fetchCategory = await prisma.categoryMaster.findFirst({
      where: { url: url },
      select: { id: true },
    });

    if (!fetchCategory)
      return res
        .status(404)
        .json({ isSuccess: false, message: "category not found!" });
    const { id } = fetchCategory;
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
          some: { category_id: id },
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

export { getProductpublic, getProductDetails, filterAttribute, getProductImages, getProductStitching };
