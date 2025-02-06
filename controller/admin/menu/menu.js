import slug from "slug";
import prisma from "../../../DB/config.js";
import { deleteFile, updatePosition } from "../../../helper/common.js";

const postMenu = async (req, res, next) => {
  try {
    const {
      name,
      url,
      parent_id,
      menuType,
      displayType,
      meta_title,
      meta_keyword,
      meta_description,
      category_id,
      // cms_id,
      isActive,
      showInHeader,
      showInFooter,
    } = req.body;

    if (parent_id) {
      const isParentMenuExists = await prisma.menu.findUnique({
        where: { id: parent_id },
      });

      if (!isParentMenuExists)
        return res
          .status(404)
          .json({ status: false, message: "Parent Menu is not found!" });
    }

    let filter = {};
    if (parent_id) filter = { where: { parent_id: parent_id } };

    const [uniqueMenu, count] = await Promise.all([
      prisma.menu.findFirst({ where: { name: name } }),
      prisma.menu.count(filter),
    ]);

    if (uniqueMenu)
      return res
        .status(200)
        .json({ status: false, message: "Menu name already exists!" });

    if (category_id) {
      const isCategoryExists = await prisma.categoryMaster.findUnique({
        where: { id: category_id },
      });

      if (!isCategoryExists)
        return res
          .status(404)
          .json({ status: false, message: "Category not found!" });
    }
    // if (cms_id) {
    //   const isCmsPageExists = await prisma.cmsPage.findUnique({
    //     where: { id: cms_id },
    //   });
    //   if (!isCmsPageExists)
    //     return res
    //       .status(404)
    //       .json({ status: false, message: "CMS not found!" });
    // }
    // const slugUrl = url ? slug(url) : slug(name);

    const newMenu = await prisma.menu.create({
      data: {
        name,
        url,
        position: count + 1,
        menuType: menuType,
        displayType: displayType,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        parent_id: parent_id ? parent_id : null,
        category_id: category_id ? category_id : null,
        // cms_id: cms_id ? cms_id : null,
        isActive: isActive,
        showInHeader: showInHeader,
        showInFooter: showInFooter,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Menu created successfully.",
      result: newMenu,
    });
  } catch (err) {
    let error = new Error("Internal Server Error");
    console.log(err);
    next(error);
  }
};

// GET ALL MENU

// const getAllMenu = async (req, res, next) => {
//   try {
//     const data = await prisma.menu.findMany({
//       where: { parent_id: null, isActive: true },
//       orderBy: { position: "asc" },
//       select: {
//         id: true,
//         position: true,
//         name: true,
//         url: true,
//         menuType: true,
//         displayType: true,
//         meta_title: true,
//         meta_keyword: true,
//         meta_description: true,
//         isActive: true,
//         showInHeader: true,
//         showInFooter: true,
//         CategoryMaster: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//         SubMenuCollection: {
//           where: { isActive: true },
//           select: {
//             id: true,
//             position: true,
//             name: true,
//             // type: true,
//             // meta_title: true,
//             // meta_keyword: true,
//             // meta_description: true,
//             // url: true,
//             // isActive: true,
//             // CategoryMaster: {
//             //   select: {
//             //     id: true,
//             //     name: true,
//             //   },
//             // },
//             // AttributeMaster: {
//             //   select: {
//             //     id: true,
//             //     key: true,
//             //     value: true,
//             //   },
//             // },
//             // Colour: {
//             //   select: {
//             //     id: true,
//             //     name: true,
//             //     code: true,
//             //   },
//             // },
//             children: {
//               where: { isActive: true },
//               select: {
//                 id: true,
//                 position: true,
//                 name: true,
//                 type: true,
//                 meta_title: true,
//                 meta_keyword: true,
//                 meta_description: true,
//                 url: true,
//                 isActive: true,
//                 CategoryMaster: {
//                   select: {
//                     id: true,
//                     name: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });
//     return res
//       .status(200)
//       .json({ isSuccess: true, message: "Menu get succesfully.", data });
//   } catch (err) {
//     console.log(err);
//     let error = new Error("Something went wrong, please try again!");
//     next(error);
//   }
// };

const getAllMenu = async (req, res, next) => {
  try {
    const data = await prisma.menu.findMany({
      where: { parent_id: null, isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        name: true,
        url: true,
        menuType: true,
        displayType: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        showInHeader: true,
        showInFooter: true,
        CategoryMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            name: true,
            url: true,
            menuType: true,
            displayType: true,
            meta_title: true,
            meta_keyword: true,
            meta_description: true,
            isActive: true,
            showInHeader: true,
            showInFooter: true,
            CategoryMaster: {
              select: {
                id: true,
                name: true,
              },
            },
            children: {
              where: { isActive: true },
              orderBy: { position: "asc" },
              select: {
                id: true,
                position: true,
                name: true,
                url: true,
                menuType: true,
                displayType: true,
                meta_title: true,
                meta_keyword: true,
                meta_description: true,
                isActive: true,
                showInHeader: true,
                showInFooter: true,
                CategoryMaster: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return res
      .status(200)
      .json({ isSuccess: true, message: "Menu get succesfully.", data });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getAllOnlyMenu = async (req, res, next) => {
  try {
    const data = await prisma.menu.findMany({
      where: { parent_id: null, isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        menuType: true,
      },
    });
    return res
      .status(200)
      .json({ isSuccess: true, message: "Menu get succesfully.", data });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

// GET MENU WITH PAGINATION
const menuPagination = async (req, res, next) => {
  try {
    const { perPage, pageNo, parent_id } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    // Get the total count of categories where parent_id is null
    const count = await prisma.menu.count({
      where: { parent_id: parent_id },
    });

    if (count === 0) {
      return res
        .status(200)
        .json({ isSuccess: false, message: "Menu not found!", data: [] });
    }

    const result = await prisma.menu.findMany({
      where: { parent_id: parent_id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        parent_id: true,
        menuType: true,
        name: true,
        position: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        // cms_id: true,
        url: true,
        category_id: true,
        menuType: true,
        displayType: true,
        url: true,
        position: true,
        isActive: true,
        showInHeader: true,
        showInFooter: true,
        createdAt: true,
        updatedAt: true,
        CategoryMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        // cms: {
        //   select: {
        //     id: true,
        //     title: true,
        //   },
        // },
        _count: {
          select: {
            children: true,
            // SubMenuCollection: {
            //   where: { parent_id: null },
            // },
          },
        },
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Menu get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const updateMenu = async (req, res, next) => {
  try {
    const id = req.params.id;

    const {
      name,
      url,
      parent_id,
      menuType,
      displayType,
      meta_title,
      meta_keyword,
      meta_description,
      category_id,
      // cms_id,
      isActive,
      showInHeader,
      showInFooter,
    } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid ID format" });
    }

    const findData = await prisma.menu.findUnique({ where: { id: id } });
    if (!findData)
      return res
        .status(404)
        .json({ status: false, message: "Menu not found!" });

    if (parent_id) {
      const isParentMenuExists = await prisma.menu.findUnique({
        where: { id: parent_id },
      });
      if (!isParentMenuExists)
        return res
          .status(404)
          .json({ status: false, message: "Parent Menu is not found!" });
    }

    if (category_id) {
      const isCategoryExists = await prisma.categoryMaster.findUnique({
        where: { id: category_id },
      });

      if (!isCategoryExists)
        return res
          .status(404)
          .json({ status: false, message: "Category not found!" });
    }
    // if (cms_id) {
    //   const isCmsPageExists = await prisma.cmsPage.findUnique({
    //     where: { id: cms_id },
    //   });
    //   if (!isCmsPageExists)
    //     return res
    //       .status(404)
    //       .json({ status: false, message: "CMS not found!" });
    // }

    let filter = { parent_id: null };

    if (parent_id) filter = { id: { not: id }, parent_id: parent_id };

    const [uniqueMenu, count] = await prisma.$transaction([
      prisma.menu.findFirst({
        where: { id: { not: id }, name: name },
      }),
      prisma.menu.count({ where: filter }),
    ]);
    if (uniqueMenu)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Menu name already exists!" });

    if (findData.parent_id !== parent_id) {
      const updatePosition = await prisma.menu.updateMany({
        where: {
          parent_id: findData.parent_id,
          position: { gte: findData.position },
        },
        data: { position: { decrement: 1 } },
      });
    }

    // const slugUrl = url ? slug(url) : slug(title);
    const result = await prisma.menu.update({
      where: { id: id },
      data: {
        name: name,
        url,
        menuType: menuType,
        displayType: displayType,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        parent_id: parent_id ? parent_id : null,
        category_id: category_id ? category_id : null,
        // cms_id: cms_id ? cms_id : null,
        ...(findData.parent_id !== parent_id && { position: count + 1 }),
        isActive: isActive,
        showInHeader: showInHeader,
        showInFooter: showInFooter,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Menu updated successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Internal Server Error");
    next(error);
  }
};

// DELETE MENU WITH UPDATE A POSITION
const deleteMenu = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const menu = await prisma.menu.findUnique({
      where: { id: id },
      select: {
        position: true,
        parent_id: true,
      },
    });

    if (!menu) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Menu not found!" });
    }
    const findSubMenu = await prisma.menu.findMany({
      where: { parent_id: id },
      select: {
        position: true,
        parent_id: true,
      },
    });

    if (findSubMenu.length > 0) {
      return res.status(400).json({
        isSuccess: false,
        message: "Please delete all submenus before deleting this menu.",
      });
    }

    const positionToDelete = menu.position;
    const existingPageWiseBanner = await prisma.pageWiseBanner.findFirst({
      where: { menu_id: id },
    });
    if (existingPageWiseBanner) {
      const pageBanner = await prisma.pageWiseBanner.delete({
        where: { id: id },
      });
      if (!pageBanner)
        return res
          .status(400)
          .json({ isSuccess: false, message: "Page banner not deleted!" });
      await deleteFile(pageBanner.desktopImage);
      await deleteFile(pageBanner.mobileImage);
    }
    await prisma.menu.delete({
      where: { id: id },
    });
    if (menu.parent_id) {
      const updatedCount = await prisma.menu.updateMany({
        where: {
          parent_id: menu.parent_id,
          position: {
            gte: positionToDelete,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    } else {
      const updatedCount = await prisma.menu.updateMany({
        where: {
          parent_id: null,
          position: {
            gte: positionToDelete,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    }
    return res
      .status(200)
      .json({ isSuccess: true, message: "Menu deleted successfully." });
  } catch (err) {
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
//UPDATE STATUS OF CATEGORY
const updateMenuStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const findData = await prisma.menu.findUnique({
      where: { id: id },
      select: {
        isActive: true,
      },
    });

    if (!findData) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Menu not found!" });
    }

    const newStatus = !findData.isActive;

    const data = await prisma.menu.update({
      where: {
        id: id,
      },
      data: {
        isActive: newStatus,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Menu status updated successfully.",
      data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const menuPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "menu";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Menu positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getMenuPageWiseBanner = async (req, res, next) => {
  try {
    const url = req.params.url;

    if (!url)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please provide Url!" });

    const result = await prisma.menu.findFirst({
      where: { url: url },
      select: {
        position: true,
        name: true,
        url: true,
        menuType: true,
        displayType: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        PageWiseBanner: {
          select: {
            id: true,
            bannerType: true,
            title: true,
            url: true,
            description: true,
            desktopImage: true,
            mobileImage: true,
            isActive: true,
          },
        },
      },
    });

    if (!result)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Menu not found!" });
    return res.status(200).json({
      isSuccess: true,
      data: result,
      message: "Menu page wise banner get successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong please try again!");
    next(error);
  }
};

const getMenus = async (req, res, next) => {
  try {
    const data = await prisma.menu.findMany({
      where: { parent_id: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        children: {
          select: {
            parent: { select: { id: true, name: true } },
            id: true,
            name: true,
            children: {
              select: {
                parent: { select: { id: true, name: true } },
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Menus get successfully.",
      data,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postMenu,
  getAllMenu,
  menuPagination,
  updateMenu,
  deleteMenu,
  updateMenuStatus,
  menuPosition,
  getAllOnlyMenu,
  getMenuPageWiseBanner,
  getMenus,
};
