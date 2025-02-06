

// // Group Stitching All Stitching Ina Handle In Single Form Instead Of Measuremne
// import prisma from "../../../db/config.js";
// import { deleteData, updateStatus } from "../../../helper/common.js";
// // const stitchingOptionStatus = async (req, res, next) => {
// //   try {
// //     const id = req.params.id;
// //     const result = await updateStatus("stitchingOption", id);
// //     if (result.status === false)
// //       return res
// //         .status(400)
// //         .json({ isSuccess: false, message: result.message });

// //     return res.status(200).json({
// //       isSuccess: true,
// //       message: result.message,
// //       data: result.data,
// //     });
// //   } catch (err) {

// //     const error = new Error("Something went wrong, please try again!");
// //     next(error);
// //   }
// // };


// // const postStitchingMeasurement = async (req, res, next) => {
// //   try {
// //     const { name, type, stitching_id, measurementdata } = req.body;
// //     const dynamicFields = [];

// //     if (measurementdata && measurementdata.length > 0) {
// //       measurementdata?.forEach((item, index) => {
// //         const imageFile = req.files && req.files[index] ? req.files[index] : null;
// //         const imagePath = imageFile ? imageFile.path : null;

// //         dynamicFields.push({
// //           key: item.key,
// //           value: item.value,
// //           image: imagePath,
// //         });

// //       });

// //     }
// //     const conditionalcreatedata = {
// //       name,
// //       type,
// //       stitching_id,
// //       measurementdata: type === "Dropdown" ? JSON.stringify(dynamicFields) : null,
// //     }


// //     const result = await prisma.stitchingValue.create({
// //       data: conditionalcreatedata,
// //       select: {
// //         name: true,
// //       }
// //     })

// //     return res.status(200).json({
// //       message: "Stitching measurement processed successfully!",
// //       isSuccess: true,
// //       data: result,
// //     });

// //   } catch (error) {
// //     console.log("eee", error)
// //     const err = new Error("Something went wrong, plese try again!");
// //     next(err);
// //   }
// // }


// // STITCHING HANDLING NEW FORMAT  //
// const postStitchingOption = async (req, res, next) => {
//   try {
//     const { name, category_id, optionfield } = req.body;
//     const findCategory = await prisma.categoryMaster.findFirst({
//       where: { id: category_id },
//     });


//     if (!findCategory) {
//       return res.status(400).json({
//         isSuccess: false,
//         message: "Category not found.",
//       });
//     }
//     const result = await prisma.stitchingOption.createMany({
//       data: optionfield.map((item) => {
//         return {
//           name: item.name,
//           price: item.price,
//           type: item.type,
//           dispatch_time: item.dispatch_time,
//         };
//       }),
//     });

//     if (result.count > 0) {
//       const createStitchingGroup = await prisma.stitchingGroup.create({
//         data: { name, category_id },
//       });

//       const createdStitchingOptions = await prisma.stitchingOption.findMany({
//         where: {
//           name: { in: optionfield.map((item) => item.name) },
//         },
//         select: {
//           id: true,
//         },
//       });



//       const stitchingGroupOptionPromises = createdStitchingOptions.map((stitchingOption) => {
//         return prisma.stitchingGroupOption.create({
//           data: {
//             stitchingGroup_id: createStitchingGroup.id,
//             stitchingOption_id: stitchingOption.id,
//           },
//         });
//       });

//       await Promise.all(stitchingGroupOptionPromises);
//     }

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Stitching  created successfully.",
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     const err = new Error("Something went wrong, please try again!");
//     next(err);
//   }
// };

// const getAllStitchingOption = async (req, res, next) => {
//   try {
//     const result = await prisma.stitchingGroupOption.findMany({
//       include: {
//         stitchingGroup: true,
//         stitchingOption: true
//       }
//     });

//     const groupedData = {};
//     result.forEach(item => {
//       const groupId = item.stitchingGroup.id;
//       if (!groupedData[groupId]) {
//         groupedData[groupId] = {
//           ...item.stitchingGroup,
//           stitchingOptions: [],
//         };
//       }
//       groupedData[groupId].stitchingOptions.push(item.stitchingOption);
//     });
//     const finalData = Object.values(groupedData);


//     return res.status(200).json({
//       isSuccess: true,
//       message: "Stitching option get successfully.",
//       data: finalData,
//     });
//   } catch (err) {
//     const error = new Error("Something went wrong please try again!");
//     next(error);
//   }
// };

// const paginationStitchingOption = async (req, res, next) => {
//   try {
//     const { perPage, pageNo } = req.body;
//     const page = +pageNo || 1;
//     const take = +perPage || 10;
//     const skip = (page - 1) * take;

//     const count = await prisma.stitchingGroup.count();
//     if (count === 0)
//       return res
//         .status(200)
//         .json({ isSuccess: true, message: "stitching found!", data: [] });

//     const newdata = await prisma.stitchingGroup.findMany({
//       select: {
//         id: true,
//         name: true,
//         category_id: true,
//         stitchingGroupOption: {
//           select: {
//             stitchingOption: {
//               select: {
//                 id: true,
//                 name: true,
//                 price: true,
//                 type: true,
//                 dispatch_time: true,
//               },
//             },
//           },
//         },
//         _count: {
//           select: {
//             stitchingGroupOption: true,
//           },
//         },
//       },
//       skip,
//       take,
//       orderBy: { updatedAt: "desc" },
//     });

//     const formattedData = newdata.map(item => ({
//       ...item,
//       stitchingGroupOption: item.stitchingGroupOption.map(option => option.stitchingOption)
//     }));


//     return res.status(200).json({
//       isSuccess: true,
//       message: "stitching option get successfully.",
//       data: formattedData,
//       totalCount: count,
//       currentPage: page,
//       pagesize: take,
//     });
//   } catch (err) {

//     console.log("errr", err)
//     let error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };


// const putStitchingOption = async (req, res, next) => {
//   try {

//     const { id } = req.params;
//     const { name, category_id, optionfield } = req.body;

//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const findCategory = await prisma.categoryMaster.findUnique({
//       where: { id: category_id },
//     });

//     if (!findCategory) {
//       return res.status(400).json({
//         isSuccess: false,
//         message: "Category not found.",
//       });
//     }

//     const findStitchingGroup = await prisma.stitchingGroup.findUnique({
//       where: { id },
//     });

//     if (!findStitchingGroup) {
//       return res.status(404).json({
//         isSuccess: false,
//         message: "Stitching not found.",
//       });
//     }

//     const updatedStitchingGroup = await prisma.stitchingGroup.update({
//       where: { id },
//       data: { name, category_id },
//     });

//     const stitchingOptionPromises = optionfield.map(async (item) => {
//       if (!item.id) {
//         return prisma.stitchingOption.create({
//           data: {
//             name: item.name,
//             price: item.price,
//             type: item.type,
//             dispatch_time: item.dispatch_time,
//           },
//         });
//       } else {
//         const existingOption = await prisma.stitchingOption.findUnique({
//           where: { id: item.id },
//         });

//         if (existingOption) {
//           return prisma.stitchingOption.update({
//             where: { id: existingOption.id },
//             data: {
//               price: item.price,
//               type: item.type,
//               dispatch_time: item.dispatch_time,
//             },
//           });
//         } else {
//           return prisma.stitchingOption.create({
//             data: {
//               name: item.name,
//               price: item.price,
//               type: item.type,
//               dispatch_time: item.dispatch_time,
//             },
//           });
//         }
//       }
//     });

//     const stitchingOptions = await Promise.all(stitchingOptionPromises);

//     const stitchingGroupOptionPromises = stitchingOptions.map(async (stitchingOption) => {
//       const existingGroupOption = await prisma.stitchingGroupOption.findUnique({
//         where: {
//           stitchingGroup_id_stitchingOption_id: {
//             stitchingGroup_id: updatedStitchingGroup.id,
//             stitchingOption_id: stitchingOption.id,
//           },
//         },
//       });

//       if (!existingGroupOption) {
//         return prisma.stitchingGroupOption.create({
//           data: {
//             stitchingGroup_id: updatedStitchingGroup.id,
//             stitchingOption_id: stitchingOption.id,
//           },
//         });
//       }

//       return null;
//     });
//     await Promise.all(stitchingGroupOptionPromises);

//     return res.status(200).json({
//       isSuccess: true,
//       message: "Stitching group updated successfully.",
//     });

//   } catch (error) {
//     console.error("Error:", error);
//     const err = new Error("Something went wrong, please try again!");
//     next(err);
//   }
// };

// const deletetStitchingOption = async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }
//     const result = await deleteData("stitchingOption", id);
//     if (result.status === false)
//       return res
//         .status(400)
//         .json({ isSuccess: result.status, message: result.message });



//     return res
//       .status(200)
//       .json({ isSuccess: true, message: "Stitching option deleted successfully." });
//   } catch (err) {
//     console.log(err);
//     const error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };


// const deleteStitchingGroup = async (req, res, next) => {
//   try {
//     const id = req.params.id;

//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return { status: false, message: "Invalid ID format!" };
//     }

//     const finddata = await prisma.stitchingGroup.findUnique({
//       where: {
//         id: id
//       }
//     })

//     if (!finddata) {
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Stitching Group not found!" });
//     }


//     const result = await prisma.stitchingGroup.delete({
//       where: {
//         id: id,
//       },
//       select: {
//         stitchingGroupOption: {
//           select: {
//             stitchingOption_id: true
//           }
//         }
//       }
//     });

//     const stitchingOptionIds = result.stitchingGroupOption.map(
//       (option) => option.stitchingOption_id
//     );
//     if (stitchingOptionIds.length > 0) {
//       await prisma.stitchingOption.deleteMany({
//         where: {
//           id: {
//             in: stitchingOptionIds,
//           },
//         },
//       });
//     }


//     return res
//       .status(200)
//       .json({ isSuccess: true, message: "Stitching Group deleted successfully." });
//   } catch (error) {
//     let err = new Error("Something went wrong, please try again!");
//     next(err);
//   }
// };

// const findgroupStitching = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const finddata = await prisma.stitchingGroupOption.findMany({
//       where: {
//         stitchingGroup_id: id
//       }
//     })

//     if (!finddata) {
//       return res
//         .status(404)
//         .json({ isSuccess: false, message: "Stitching Group not found!" });
//     }

//     // const result = await prisma.stitchingGroupOption.findMany({
//     //   where: {
//     //     stitchingGroup_id: id
//     //   },
//     //   select: {
//     //     stitchingOption: {
//     //       select: {
//     //         id: true,
//     //         name: true,
//     //         type: true,
//     //         isActive: true,
//     //         price: true,
//     //         dispatch_time: true,
//     //         _count: {
//     //           select: {

//     //             // stitchingValues: {
//     //             //   where: {
//     //             //     stitchingOption: {
//     //             //       type: "Redio"
//     //             //     }
//     //             //   }

//     //             // }
//     //           }
//     //         }
//     //       },
//     //     },
//     //   },

//     // })

//     const result = await prisma.stitchingGroupOption.findMany({
//       where: {
//         stitchingGroup_id: id
//       },
//       select: {
//         stitchingOption: {
//           select: {
//             id: true,
//             name: true,
//             type: true,
//             isActive: true,
//             price: true,
//             dispatch_time: true,
//             _count: {
//               select: {
//                 stitchingValues: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const stitchingOptions = result.map(item => {
//       const stitchingOption = item.stitchingOption;
//       if (stitchingOption.type !== 'Redio') {
//         delete stitchingOption._count;
//       }

//       return stitchingOption;
//     });

//     return res
//       .status(200)
//       .json({ isSuccess: true, message: "Stitching Group get successfully.", data: stitchingOptions });
//   } catch (err) {
//     let error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// }

// const postSingleStitchingOption = async (req, res, next) => {
//   try {
//     const { name, type, price, dispatch_time,
//       stitchingGroup_id } = req.body
//     const result = await prisma.stitchingOption.create({
//       data: {
//         name,
//         price,
//         dispatch_time,
//         type: type
//       }
//     })

//     if (result) {
//       await prisma.stitchingGroupOption.create({
//         data: {
//           stitchingGroup_id,
//           stitchingOption_id: result.id
//         }
//       })
//     }
//     return res.status(200).json({
//       isSuccess: true,
//       message: "stitching option created successfully.",
//       data: result,
//     });
//   } catch (error) {
//     const err = new Error("Something went wrong, plese try again!");
//     next(err);
//   }
// }

// const putSingleStitchingOption = async (req, res, next) => {
//   try {
//     const { id } = req.params
//     const { name, type, price, dispatch_time, stitchingGroup_id } = req.body


//     if (!/^[a-fA-F0-9]{24}$/.test(id)) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Invalid ID format!" });
//     }

//     const result = await prisma.stitchingOption.update({
//       where: {
//         id: id
//       },
//       data: {
//         name,
//         price,
//         dispatch_time,
//         type: type
//       }
//     })

//     return res.status(200).json({
//       isSuccess: true,
//       message: "stitching option updated successfully.",
//       data: result,
//     });
//   } catch (error) {
//     const err = new Error("Something went wrong, plese try again!");
//     next(err);
//   }
// }


// export {
//   postStitchingOption,
//   // postStitchingMeasurement,
//   putStitchingOption,
//   getAllStitchingOption,
//   paginationStitchingOption,
//   deletetStitchingOption,
//   // stitchingOptionStatus,
//   deleteStitchingGroup,
//   findgroupStitching,
//   postSingleStitchingOption,
//   putSingleStitchingOption

// }