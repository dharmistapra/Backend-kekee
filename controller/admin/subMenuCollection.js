import prisma from "../../DB/config.js";
import { updatePosition } from "../../helper/common.js";

const postSubMenuCollection = async (req, res, next) => {
  try {
    const {
      name,
      url,
      parent_id,
      menu_id,
      subMenuCollectionType,
      meta_title,
      meta_keyword,
      meta_description,
      category_id,
      isActive,
    } = req.body;

    if (parent_id) {
      const isParentMenuExists = await prisma.subMenuCollection.findUnique({
        where: { id: parent_id },
      });

      if (!isParentMenuExists)
        return res.status(404).json({
          status: false,
          message: "Parent Submenu collection is not found!",
        });
    }

    if (menu_id) {
      const isMenuExists = await prisma.menu.findUnique({
        where: { id: menu_id },
      });
      if (!isMenuExists)
        return res
          .status(404)
          .json({ status: false, message: "Menu not found!" });
    }

    let filter = {};
    if (parent_id) filter = { where: { parent_id: parent_id } };
    if (menu_id && parent_id === null)
      filter = { where: { parent_id: null, menu_id: menu_id } };
    const count = await prisma.subMenuCollection.count(filter);
    if (category_id) {
      const isCategoryExists = await prisma.categoryMaster.findUnique({
        where: { id: category_id },
      });

      if (!isCategoryExists)
        return res
          .status(404)
          .json({ status: false, message: "Category not found!" });
    }

    const newMenu = await prisma.subMenuCollection.create({
      data: {
        name,
        url: url,
        position: count + 1,
        type: subMenuCollectionType,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        parent_id: parent_id ? parent_id : null,
        menu_id: menu_id ? menu_id : null,
        category_id: category_id ? category_id : null,
        isActive: isActive,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Submenu collection created successfully.",
      result: newMenu,
    });
  } catch (err) {
    let error = new Error("Internal Server Error");
    console.log(err);
    next(error);
  }
};

// GET ALL MENU

const getAllParentSubMenuCollection = async (req, res, next) => {
  try {
    let { perPage, pageNo, menu_id, category_id } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    if (!menu_id)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Menu is required!" });

    if (!category_id) category_id = null;

    const count = await prisma.subMenuCollection.count({
      where: { parent_id: null, menu_id: menu_id, category_id: category_id },
    });

    if (count === 0) {
      return res.status(200).json({
        isSuccess: false,
        message: "Submenu collection not found!",
        data: [],
      });
    }
    const data = await prisma.subMenuCollection.findMany({
      where: { parent_id: null, menu_id: menu_id, category_id: category_id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        parent_id: true,
        menu_id: true,
        name: true,
        url: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        CategoryMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
      skip,
      take,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Submenu collection get succesfully.",
      data,
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
// GET MENU WITH PAGINATION
const subMenuCollectionPagination = async (req, res, next) => {
  try {
    const { perPage, pageNo, parent_id } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    // Get the total count of categories where parent_id is null
    const count = await prisma.subMenuCollection.count({
      where: { parent_id: parent_id },
    });

    if (count === 0) {
      return res.status(200).json({
        isSuccess: false,
        message: "Submenu collection not found!",
        data: [],
      });
    }

    const result = await prisma.subMenuCollection.findMany({
      where: { parent_id: parent_id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        parent_id: true,
        menu_id: true,
        name: true,
        url: true,
        type: true,
        meta_title: true,
        meta_keyword: true,
        meta_description: true,
        category_id: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        CategoryMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Submenu collection get successfully.",
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

const updateSubMenuCollection = async (req, res, next) => {
  try {
    const id = req.params.id;

    const {
      name,
      url,
      parent_id,
      menu_id,
      subMenuCollectionType,
      meta_title,
      meta_keyword,
      meta_description,
      category_id,
      isActive,
    } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid ID format" });
    }

    const findData = await prisma.subMenuCollection.findUnique({
      where: { id: id },
    });
    if (!findData)
      return res
        .status(404)
        .json({ status: false, message: "Submenu collection not found!" });

    if (parent_id) {
      const isParentMenuExists = await prisma.subMenuCollection.findUnique({
        where: { id: parent_id },
      });
      if (!isParentMenuExists)
        return res.status(404).json({
          status: false,
          message: "Parent Menu Collection is not found!",
        });
    }

    if (menu_id) {
      const isMenuExists = await prisma.menu.findUnique({
        where: { id: menu_id },
      });
      if (!isMenuExists)
        return res
          .status(404)
          .json({ status: false, message: "Menu not found!" });
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

    let filter = { parent_id: null, menu_id: menu_id };

    if (parent_id) filter = { id: { not: id }, parent_id: parent_id };
    if (menu_id && parent_id === null)
      filter = { id: { not: id }, parent_id: parent_id, menu_id: menu_id };
    const [uniqueMenu, count] = await prisma.$transaction([
      prisma.subMenuCollection.findFirst({
        where: { id: { not: id }, name: name },
      }),
      prisma.subMenuCollection.count({ where: filter }),
    ]);
    // if (uniqueMenu)
    //   return res
    //     .status(400)
    //     .json({ isSuccess: false, message: "Menu name already exists!" });

    if (findData.parent_id !== parent_id) {
      const updatePosition = await prisma.subMenuCollection.updateMany({
        where: {
          parent_id: findData.parent_id,
          position: { gte: findData.position },
        },
        data: { position: { decrement: 1 } },
      });
    }

    const result = await prisma.subMenuCollection.update({
      where: { id: id },
      data: {
        name: name,
        url: url,
        type: subMenuCollectionType,
        meta_title: meta_title,
        meta_keyword: meta_keyword,
        meta_description: meta_description,
        parent_id: parent_id ? parent_id : null,
        menu_id: menu_id ? menu_id : null,
        category_id: category_id ? category_id : null,
        ...(findData.parent_id !== parent_id && { position: count + 1 }),
        isActive: isActive,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Submenu collection updated successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Internal Server Error");
    next(error);
  }
};

// DELETE MENU WITH UPDATE A POSITION
const deleteSubMenuCollection = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const subMenuCollection = await prisma.subMenuCollection.findUnique({
      where: { id: id },
      select: {
        position: true,
        parent_id: true,
      },
    });

    if (!subMenuCollection) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Submenu collection not found!" });
    }
    const findSubMenu = await prisma.subMenuCollection.findMany({
      where: { parent_id: id },
      select: {
        position: true,
        parent_id: true,
      },
    });

    if (findSubMenu.length > 0) {
      return res.status(400).json({
        isSuccess: false,
        message:
          "Please delete all ChildsubMenuCollections before deleting this subMenuCollection.",
      });
    }
    const positionToDelete = subMenuCollection.position;
    await prisma.subMenuCollection.delete({
      where: { id: id },
    });
    if (subMenuCollection.parent_id) {
      const updatedCount = await prisma.subMenuCollection.updateMany({
        where: {
          parent_id: subMenuCollection.parent_id,
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
      const updatedCount = await prisma.subMenuCollection.updateMany({
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

    return res.status(200).json({
      isSuccess: true,
      message: "Submenu collection deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    let error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
//UPDATE STATUS OF CATEGORY
const updateSubMenuCollectionStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const findData = await prisma.subMenuCollection.findUnique({
      where: { id: id },
      select: {
        isActive: true,
      },
    });

    if (!findData) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Submenu collection not found!" });
    }

    const newStatus = !findData.isActive;

    const data = await prisma.subMenuCollection.update({
      where: {
        id: id,
      },
      data: {
        isActive: newStatus,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Submenu Collection status updated successfully.",
      data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const subMenuCollectionPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "subMenuCollection";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Submenu collection positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postSubMenuCollection,
  getAllParentSubMenuCollection,
  subMenuCollectionPagination,
  updateSubMenuCollection,
  deleteSubMenuCollection,
  updateSubMenuCollectionStatus,
  subMenuCollectionPosition,
};
