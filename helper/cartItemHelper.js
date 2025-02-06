import prisma from "../db/config.js";
const isvalidstitching = async (uniqueID, modelName) => {
  // YE FUNCTION HUM USE KAR RAHE HAI DATA FIND KARNE KE LIYE  THROUGH ID
  const models = {
    stitchingGroup: prisma.stitchingGroup.findUnique,
    stitchingOption: prisma.stitchingOption.findUnique,
    stitchingValue: prisma.stitchingValue.findUnique,
    size: prisma.size.findUnique,
  };
  const modelQuery = models[modelName];
  try {
    const record = await modelQuery({ where: { id: uniqueID } });
    return record !== null;
  } catch (error) {
    return false;
  }
};

const validateStitching = async (stitching) => {
  // THIS FUNCTION ARE USED TO VALIDATE A STITCHING
  if (!Array.isArray(stitching) || stitching.length === 0) {
    return { isValid: false, message: "Stitching data is invalid or empty." };
  }
  const validationResults = await Promise.all(
    stitching.map(async (item, index) => {
      if (
        !item?.group_id ||
        !(await isvalidstitching(item.group_id, "stitchingGroup"))
      ) {
        return {
          isValid: false,
          message: `Stitching item at index ${index} has an invalid or missing group_id.`,
        };
      }

      if (item.options && item.options.length > 0) {
        const option = item.options.find((opt) => opt?.id);
        if (
          !option ||
          !(await isvalidstitching(option.id, "stitchingOption"))
        ) {
          return {
            isValid: false,
            message: `Options for stitching item at index ${index} are invalid or missing.`,
          };
        }

        if (option.measurment_id && option.measurment_id.length > 0) {
          const measurement = option.measurment_id.find((m) => m?.id);
          if (
            !measurement ||
            !(await isvalidstitching(measurement.id, "stitchingValue"))
          ) {
            return {
              isValid: false,
              message: `Measurement ID for stitching item at index ${index} is invalid or missing.`,
            };
          }
        }
      }

      return null;
    })
  );

  for (const result of validationResults) {
    if (result && !result.isValid) {
      return { isValid: false, message: result.message };
    }
  }

  return { isValid: true, message: "Validation passed." };
};

// const findproductpriceOnSize = async (product_id, size_id, quantity = 1) => {
//   // THIS FUNCTION HELP WHEN WE APPLY ON SIZE ON THE PRIDUCT  THEN SUBTOTAL PRICE AND TAX CALULTED  ON THE PRODUCT QUANTITY

//   if (!product_id) {
//     return { subtotal: 0, tax: 0 };
//   }

//   const product = await prisma.product.findUnique({
//     where: { id: product_id },
//     include: { sizes: true, categories: true },
//   });

//   if (!product) {
//     return { subtotal: 0, tax: 0 };
//   }

//   const parseSizes = JSON.parse(size_id)
//   if (product?.sizes && parseSizes) {
//     let finddata = product?.sizes?.find((item) => String(item?.size_id) === String(parseSizes[0]?.id));
//     if (finddata) {
//       console.log("finddata", finddata)
//       const subtotalPerItem = product?.offer_price + finddata?.price;
//       const subtotal = subtotalPerItem * quantity;
//       const taxRate = product.retail_GST || 0;
//       const taxPerItem = (subtotalPerItem * taxRate) / 100;
//       const tax = taxPerItem * quantity;
//       return { subtotal, tax };
//     }
//   }
//   return { subtotal: 0, tax: 0 };
// };

const findproductpriceOnSize = async (product_id, size_id, quantity = 1) => {
  const product = await prisma.product.findUnique({
    where: { id: product_id },
    include: { sizes: true, categories: true },
  });

  if (!product) {
    return { subtotal: 0, tax: 0 };
  }

  let parseSizes = JSON.parse(size_id);

  if (product?.sizes && parseSizes?.length > 0) {
    let finddata = product?.sizes?.find(
      (item) => String(item?.size_id) === String(parseSizes[0]?.id)
    );
    if (finddata) {
      if (finddata?.quantity < quantity) {
        return {
          subtotal: 0,
          tax: 0,
          message: "At this time stock is un available",
        };
      }

      const subtotalPerItem = product?.offer_price + finddata?.price;
      const subtotal = subtotalPerItem * quantity;
      const taxRate = product.retail_GST || 0;
      const taxPerItem = (subtotalPerItem * taxRate) / 100;
      const tax = taxPerItem * quantity;

      return { subtotal, tax };
    }
  }

  return { subtotal: 0, tax: 0 };
};

const findproductpriceonStitching = async (product_id, stitching, quantity) => {
  if (!product_id) {
    return { subtotal: 0, tax: 0 };
  }

  const product = await prisma.product.findUnique({
    where: { id: product_id },
    include: { sizes: true, categories: true },
  });
  if (product && stitching) {
    const extranct_Option_Id = stitching
      ?.map((item) => {
        return item?.options?.map((optionItem) => {
          return optionItem.id;
        });
      })
      .flat();

    if (product?.quantity < quantity) {
      return {
        subtotal: 0,
        tax: 0,
        message: "At this time stock is un available",
      };
    }

    const subtotalPerItem = await findStitchingOptionPrices(extranct_Option_Id);
    const subtotal = product?.offer_price + subtotalPerItem;
    const taxRate = product.retail_GST || 0;
    const taxPerItem = (subtotal * taxRate) / 100;
    const tax = taxPerItem * quantity;
    return { subtotal, tax };
  }
  return { subtotal: 0, tax: 0 };
};

const findStitchingOptionPrices = async (productIds) => {
  const stitchingOptions = await prisma.stitchingOption.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      price: true,
    },
  });
  let subtotalprice = 0;
  const calculatesubtotal = stitchingOptions?.map((item) => {
    subtotalprice += item?.price;
  });

  return subtotalprice;
};

// const getAllStitchingData = async (stitching, usermeasuremnetdata) => {
//   try {

//     if (!Array.isArray(stitching) || stitching.length === 0) return [];
//     // const optionIds = stitching.flatMap(item => item?.options.flatMap(option => option.measurment_id?.map(measure => measure.id) || []));

//     const groupIds = [];
//     const optionIds = [];
//     const measurementData = [];

//     usermeasuremnetdata.forEach(group => {
//       groupIds.push(group.group_id);
//       group.options.forEach(option => {
//         optionIds.push(option.id);
//         if (option?.measurment_id && option?.measurment_id?.length > 0) {
//           measurementData.push(...option.measurment_id.map(measurement => ({
//             measurementId: measurement.id,
//             value: measurement.value
//           })));
//         }
//       });
//     });

//     const findstitchinggrioup = await prisma.stitchingGroupOption.findMany({
//       where: {
//         AND: [
//           { stitchingGroup_id: { in: groupIds }, },
//           { stitchingOption_id: { in: optionIds } }
//         ]
//       },
//       select: {
//         stitchingGroup: {
//           select: {
//             id: true,
//             name: true
//           }
//         },
//         stitchingOption: {
//           select: {
//             id: true,
//             name: true,
//             price: true,
//             dispatch_time: true,
//             stitchingValues: {
//               where: {
//                 id: { in: measurementData?.length > 0 && measurementData?.map(item => item?.measurementId) }
//               },
//             }
//           }
//         }
//       }
//     })

//     console.log("findstitchinggrioup", JSON.stringify(findstitchinggrioup, null, 2));

//     // const findSttichingMeasuremnt = await prisma.stitchingValue.findMany({
//     //   where: {
//     //     id: { in: optionIds }
//     //   },
//     //   select: {
//     //     id: true,
//     //     name: true,
//     //     values: true,
//     //     stitchingOption: {
//     //       select: {
//     //         id: true,
//     //         name: true,
//     //         price: true,
//     //         dispatch_time: true,
//     //         StitchingGroupOption: {
//     //           select: {
//     //             stitchingGroup_id: true,
//     //             stitchingOption_id: true,
//     //             stitchingGroup: {
//     //               select: {
//     //                 id: true,
//     //                 name: true
//     //               }
//     //             }
//     //           }
//     //         },
//     //       }
//     //     },

//     //   }
//     // })

//     return findstitchinggrioup;
//   } catch (error) {
//     console.error(error);
//     throw new Error("Something went wrong, please try again!");
//   }
// };

const getAllStitchingData = async (stitching, usermeasuremnetdata) => {
  try {
    if (!Array.isArray(stitching) || stitching.length === 0) return [];

    // Step 1: Extract group IDs, option IDs, and measurement data
    const groupIds = [];
    const optionIds = [];
    const measurementData = [];

    usermeasuremnetdata.forEach((group) => {
      groupIds.push(group.group_id);
      group.options.forEach((option) => {
        optionIds.push(option.id);
        if (option?.measurment_id && option?.measurment_id?.length > 0) {
          measurementData.push(
            ...option.measurment_id.map((measurement) => ({
              measurementId: measurement.id,
              value: measurement.value,
            }))
          );
        }
      });
    });

    // Step 2: Fetch stitching group options with stitching values
    const findstitchinggrioup = await prisma.stitchingGroupOption.findMany({
      where: {
        AND: [
          { stitchingGroup_id: { in: groupIds } },
          { stitchingOption_id: { in: optionIds } },
        ],
      },
      select: {
        stitchingGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        stitchingOption: {
          select: {
            id: true,
            name: true,
            price: true,
            dispatch_time: true,
            stitchingValues: {
              where: {
                id: {
                  in:
                    measurementData.length > 0
                      ? measurementData.map((item) => item.measurementId)
                      : [],
                },
              },
              select: {
                id: true,
                name: true,
                values: true,
              },
            },
          },
        },
      },
    });

    const result = findstitchinggrioup.reduce((acc, groupOption) => {
      let group = acc.find(
        (item) => item.stitchingGroup.id === groupOption.stitchingGroup.id
      );

      if (!group) {
        group = {
          stitchingGroup: groupOption.stitchingGroup,
          option: [],
        };
        acc.push(group);
      }

      const stitchingOption = {
        name: groupOption.stitchingOption.name,
        price: groupOption.stitchingOption.price,
        dispatch_time: groupOption.stitchingOption.dispatch_time,
        stitchingValues: [],
      };

      groupOption.stitchingOption.stitchingValues.forEach((stitchingValue) => {
        const measurement = measurementData.find(
          (measure) => measure.measurementId === stitchingValue.id
        );

        stitchingOption.stitchingValues.push({
          id: stitchingValue.id,
          name: stitchingValue.name,
          values: stitchingValue.values,
          value: measurement ? measurement.value : null,
        });
      });

      group.option.push(stitchingOption);

      return acc;
    }, []);

    return result;
  } catch (error) {
    console.error(error);
    throw new Error("Something went wrong, please try again!");
  }
};

const extractMeasurementData = (data) => {
  return data.flatMap((group) =>
    group.options.flatMap((option) =>
      option.measurment_id
        ?.map((measurement) => {
          if (measurement && measurement.id && measurement.value) {
            return {
              id: measurement.id,
              value: measurement.value,
            };
          }
          return null;
        })
        .filter((measurement) => measurement !== null)
    )
  );
};


const updateStitchingValues = (stitchingData, allStitchingData) => {
  const updatedData = allStitchingData?.reduce((acc, item) => {
    console.log("stitchingData", stitchingData);
    const userMeasurement =
      stitchingData &&
      stitchingData?.length > 0 &&
      stitchingData?.find((size) => size.id === item.id);
    if (userMeasurement) {
      item.value = userMeasurement.value;
    }
    const stitchingOption = item?.stitchingOption;
    if (stitchingOption?.StitchingGroupOption?.[0]?.stitchingGroup?.id) {
      let stitchingGroup = acc.find(
        (group) =>
          group.stitchingGroup.id ===
          stitchingOption.StitchingGroupOption[0].stitchingGroup.id
      );

      if (!stitchingGroup) {
        stitchingGroup = {
          stitchingGroup: {
            id: stitchingOption.StitchingGroupOption[0].stitchingGroup.id,
            name: stitchingOption.StitchingGroupOption[0].stitchingGroup.name,
          },
          option: [],
        };
        acc.push(stitchingGroup);
      }

      let stitchingGroupOption = stitchingGroup.option.find(
        (option) => option.name === stitchingOption.name
      );

      if (!stitchingGroupOption) {
        stitchingGroupOption = {
          name: stitchingOption.name,
          price: stitchingOption.price,
          dispatch_time: stitchingOption.dispatch_time,
          stitchingValues: [],
        };
        stitchingGroup.option.push(stitchingGroupOption);
      }

      stitchingGroupOption.stitchingValues.push({
        id: item.id,
        name: item.name,
        values: item.values,
        value: item.value,
      });
    } else {
      console.error(
        "Missing or invalid stitchingOption or StitchingGroupOption in item:",
        item
      );
    }

    return acc;
  }, []);

  return updatedData;
};







const findCatalogueStitchingprice = async (catalogue_id, stitching, quantity, checkproductquantity) => {
  if (!catalogue_id) {
    return { subtotal: 0, tax: 0 };
  }

  const catalogue = await prisma.catalogue.findUnique({
    where: { id: catalogue_id },
    include: {
      CatalogueCategory: true,
      CatalogueSize: true
    }
  });
  if (catalogue && stitching) {
    const extranct_Option_Id = stitching
      ?.map((item) => {
        return item?.options?.map((optionItem) => {
          return optionItem.id;
        });
      })
      .flat();


    const outOfStockCount = checkproductquantity?.filter(data => data.outOfStock === true).length;
    console.log("outOfStockCount", outOfStockCount)

    const subtotalPerItem = await findStitchingOptionPrices(extranct_Option_Id);
    const subtotal = (catalogue?.offer_price + subtotalPerItem) - (outOfStockCount * catalogue.average_price)

    const taxRate = catalogue.GST || 0;
    const taxPerItem = (subtotal * taxRate) / 100;
    const tax = taxPerItem * quantity;
    return { subtotal, tax };
  }
  return { subtotal: 0, tax: 0 };
};



const findCatalogueprice = async (catalogue_id, size_id, quantity = 1, checkproductquantity) => {
  const catalogue = await prisma.catalogue.findUnique({
    where: { id: catalogue_id },
    include: {
      CatalogueCategory: true,
      CatalogueSize: true
    }
  });

  if (!catalogue) {
    return { subtotal: 0, tax: 0 };
  }

  let parseSizes = JSON.parse(size_id);

  if (catalogue?.sizes && parseSizes?.length > 0) {
    let finddata = catalogue?.sizes?.find(
      (item) => String(item?.size_id) === String(parseSizes[0]?.id)
    );
    if (finddata) {
      if (finddata?.quantity < quantity) {
        return {
          subtotal: 0,
          tax: 0,
          message: "At this time stock is un available",
        };
      }

      const subtotalPerItem = product?.offer_price + finddata?.price;
      const subtotal = subtotalPerItem * quantity;
      const taxRate = product.retail_GST || 0;
      const taxPerItem = (subtotalPerItem * taxRate) / 100;
      const tax = taxPerItem * quantity;

      return { subtotal, tax };
    }
  }

  return { subtotal: 0, tax: 0 };
};
export {
  isvalidstitching,
  validateStitching,
  findproductpriceOnSize,
  findproductpriceonStitching,
  findStitchingOptionPrices,
  getAllStitchingData,
  extractMeasurementData,
  updateStitchingValues,
  findCatalogueStitchingprice
};
