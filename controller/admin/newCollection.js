import prisma from "../../db/config.js";
import { convertFilePathSlashes, deleteFile, updateStatus } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";

const uploadImages = async (req, res, next) => {
  try {
    const { title, sub_title, slug, Manual, position } = req.body;

    let path = "";
    if (req.file) {
      path = await convertFilePathSlashes(req.file.path);
    }

    const collectioncreate = await prisma.collectionAll.create({
      data: {
        title: title,
        sub_title: sub_title,
        redirect_url: slug ? slug : '',
        coverimage: path,
        position: Number(position),
        Manual: Manual == "Yes" ? true : false
      }
    })

    return res.status(200).json({
      isSuccess: true,
      message: "collection created successfully.",
    });
  } catch (error) {
    console.log("eeee", error)
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};



const paginationAllCollection = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [
      { title: { contains: search, mode: "insensitive" } },
      { sub_title: { contains: search, mode: "insensitive" } },
      { redirect_url: { contains: search, mode: "insensitive" } },
    ]

    const searchFilter = createSearchFilter(search, filter);

    const count = await prisma.collectionAll.count({
      where: searchFilter || undefined
    });
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "collection not found!", data: [] });
    const result = await prisma.collectionAll.findMany({
      where: searchFilter || undefined,
      include: {
        CatalogueCollection: {
          select: {
            product_id: true,
            catalogue_id: true,
          }
        }
      },
      skip,
      take,
    });


    const processedResult = result.map((collection) => {
      const productCount = collection.CatalogueCollection.filter((item) => item.product_id !== null).length;
      const catalogueCount = collection.CatalogueCollection.filter((item) => item.catalogue_id !== null).length;
      const { CatalogueCollection, ...rest } = collection;

      return {
        ...rest,
        productCount,
        catalogueCount,
      };
    });



    return res.status(200).json({
      isSuccess: true,
      message: "Currencies get successfully.",
      data: processedResult,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.log(error)
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};



const searchCollection = async (req, res, next) => {
  try {
    const { search } = req.body;
    if (!search || search.trim() === "") {
      return res.status(400).json({
        isSuccess: false,
        message: "Search term is required!",
      });
    }
    const filter = [
      { title: { contains: search, mode: "insensitive" } },
      { sub_title: { contains: search, mode: "insensitive" } },
      { redirect_url: { contains: search, mode: "insensitive" } },
    ];

    const searchFilter = createSearchFilter(search, filter);

    const count = await prisma.collectionAll.count({
      where: searchFilter,
    });

    if (count === 0) {
      return res.status(200).json({
        isSuccess: true,
        message: "No collections found for the given search term!",
        data: [],
      });
    }

    const results = await prisma.collectionAll.findMany({
      where: searchFilter,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Collections retrieved successfully.",
      data: results,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (error) {
    console.error(error);
    next(new Error("An error occurred while searching collections."));
  }
};



const getAllNewCollection = async (req, res, next) => {
  try {
    const result = await prisma.collectionAll.findMany({
      where: {
        Manual: true,
      },
      select: {
        sub_title: true,
        id: true,
      }
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Currencies get successfully.",
      data: result,
    });
  } catch (error) {
    console.log(error)
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};



const collectionToProduct = async (req, res, next) => {
  try {
    const dataArray = req.body;
    for (const data of dataArray) {
      const { type, productId, catalogueId, collections } = data;

      if (type === "product") {
        for (const item of collections || []) {
          const existingRecord = await prisma.catalogueCollection.findFirst({
            where: {
              product_id: productId,
              collection_id: item,
            },
          });

          if (existingRecord) {
            await prisma.catalogueCollection.update({
              where: { id: existingRecord.id },
              data: {
                product_id: productId,
              },
            });
          } else {
            await prisma.catalogueCollection.create({
              data: {
                product_id: productId,
                collection_id: item,
              },
            });
          }
        }
      } else if (type === "catalogue") {
        for (const item of collections || []) {
          const existingRecord = await prisma.catalogueCollection.findFirst({
            where: {
              catalogue_id: catalogueId,
              collection_id: item,
            },
          });

          if (existingRecord) {
            await prisma.catalogueCollection.update({
              where: { id: existingRecord.id },
              data: {
                catalogue_id: catalogueId,
              },
            });
          } else {
            await prisma.catalogueCollection.create({
              data: {
                catalogue_id: catalogueId,
                collection_id: item,
              },
            });
          }
        }
      }
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Product assign to collection successful",
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};




const updateAllcollection = async (req, res, next) => {
  try {

    const { id } = req.params
    const { title, sub_title, slug, Manual, position } = req.body;
    let path = "";
    if (req.file) {
      path = await convertFilePathSlashes(req.file.path);
    }

    const findcollection = await prisma.collectionAll.findUnique({ where: { id: id } })

    if (findcollection) {
      if (!path && Manual === "Yes") {
        await deleteFile(findcollection?.coverimage);
      }
      if (findcollection?.Manual) {
        const collectionproduct = await prisma.catalogueCollection.deleteMany({
          where: {
            collection_id: id
          }
        })
      }
    }

    const collectioncreate = await prisma.collectionAll.update({
      where: {
        id: id
      },
      data: {
        title: title,
        sub_title: sub_title,
        position: Number(position),
        redirect_url: slug && Manual == "No" ? slug : '',
        coverimage: Manual === "Yes" ? "" : path || undefined,
        Manual: Manual == "Yes" ? true : false
      }
    })

    return res.status(200).json({
      isSuccess: true,
      message: "collection update successfully.",
    });
  } catch (error) {
    console.log("errr", error)
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};



const deleteCollectionbyId = async (req, res, next) => {
  try {
    const id = req.params.id;

    const collection = await prisma.collectionAll.findUnique({
      where: { id: id },
    });

    if (!collection) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Collection not found!" });
    }


    const positionToDelete = await prisma.collectionAll.delete({
      where: { id: id },
    });

    deleteFile(positionToDelete?.coverimage)

    return res
      .status(200)
      .json({ isSuccess: true, message: "Collection deleted successfully." });

  } catch (error) {
    const err = new Error("Something went wrong, Please try again!");
    next(err);
  }
}





// const paginationCollectionProduct = async (req, res, next) => {
//   try {
//     const { perPage, pageNo, search, collectionId } = req.body;
//     const page = +pageNo || 1;
//     const take = +perPage || 10;
//     const skip = (page - 1) * take;
//     const filter = [
//       { title: { contains: search, mode: "insensitive" } },
//       { sub_title: { contains: search, mode: "insensitive" } },
//       { redirect_url: { contains: search, mode: "insensitive" } },
//     ];

//     let searchFilter = createSearchFilter(search, filter);

//     if (collectionId) {
//       searchFilter = {
//         ...searchFilter,
//         collection_id: collectionId,
//       };
//     }

//     const count = await prisma.catalogueCollection.count({
//       where: searchFilter || undefined,
//     });

//     if (count === 0) {
//       return res.status(200).json({
//         isSuccess: true,
//         message: "Collection not found!",
//         data: [],
//       });
//     }

//     const result = await prisma.catalogueCollection.findMany({
//       where: searchFilter || undefined,
//       select: {
//         id: true,
//         product: {
//           select: {
//             id: true,
//             name: true,
//             sku: true,
//             image: true,
//           },
//         },
//         catalogue: {
//           select: {
//             id: true,
//             name: true,
//             no_of_product: true,
//             cat_code: true,
//             coverImage: true
//           },
//         },
//       },
//       skip,
//       take,
//     });

//     const cleanedResult = result.map((item) => ({
//       ...item.product,
//       catalogue: item.catalogue || null,
//       catalogueCollectionId: item.id,
//     }));



//     return res.status(200).json({
//       isSuccess: true,
//       message: "Collection product get successfully.",
//       data: cleanedResult,
//       totalCount: count,
//       currentPage: page,
//       pagesize: take,
//     });
//   } catch (error) {
//     console.error(error);
//     let err = new Error("Something went wrong, please try again!");
//     next(err);
//   }
// };



const paginationCollectionProduct = async (req, res, next) => {
  try {
    const { perPage, pageNo, search, collectionId } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [
      { title: { contains: search, mode: "insensitive" } },
      { sub_title: { contains: search, mode: "insensitive" } },
      { redirect_url: { contains: search, mode: "insensitive" } },
    ];

    let searchFilter = createSearchFilter(search, filter);

    if (collectionId) {
      searchFilter = {
        ...searchFilter,
        collection_id: collectionId,
      };
    }

    const count = await prisma.catalogueCollection.count({
      where: searchFilter || undefined,
    });

    if (count === 0) {
      return res.status(200).json({
        isSuccess: true,
        message: "Collection not found!",
        data: {
          products: [],
          catalogues: [],
        },
      });
    }

    const result = await prisma.catalogueCollection.findMany({
      where: searchFilter || undefined,
      select: {
        id: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            image: true,
          },
        },
        catalogue: {
          select: {
            id: true,
            name: true,
            no_of_product: true,
            cat_code: true,
            coverImage: true,
          },
        },
      },
      skip,
      take,
    });

    const products = result
      .filter((item) => item.product)
      .map((item) => ({
        ...item.product,
        catalogueCollectionId: item.id,
      }));

    const catalogues = result
      .filter((item) => item.catalogue)
      .map((item) => ({
        ...item.catalogue,
        catalogueCollectionId: item.id,
      }));

    return res.status(200).json({
      isSuccess: true,
      message: "Collection product get successfully.",
      data: {
        products,
        catalogues,
      },
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.error(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};


const romoveProductInCollection = async (req, res, next) => {
  try {
    const id = req.params.id;

    const collection = await prisma.catalogueCollection.findUnique({
      where: { id: id },
    });

    if (!collection) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "product not found!" });
    }


    const positionToDelete = await prisma.catalogueCollection.delete({
      where: { id: id },
    });


    return res
      .status(200)
      .json({ isSuccess: true, message: "product remove in this collection." });

  } catch (error) {
    const err = new Error("Something went wrong, Please try again!");
    next(err);
  }
}



const updateNewCollectionStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("collectionAll", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.log(error)
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};


const updateNewCollectionIsHome = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const findData = await prisma.collectionAll.findUnique({ where: { id: id } });
    if (!findData) return { status: false, message: `collection not found!` };
    const newStatus = !findData.showInHome;
    const result = await prisma.collectionAll.update({
      where: { id: id },
      data: { showInHome: newStatus },
    });


    return res.status(200).json({
      isSuccess: true,
      message: 'collection showin home active successfully',
      data: result,
    });
  } catch (error) {
    console.log(error)
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
export { uploadImages, paginationAllCollection, searchCollection, getAllNewCollection, collectionToProduct, updateAllcollection, deleteCollectionbyId, paginationCollectionProduct, romoveProductInCollection, updateNewCollectionStatus, updateNewCollectionIsHome };

