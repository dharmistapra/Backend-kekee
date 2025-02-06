import prisma from "../../../DB/config.js";
import { updateStatus } from "../../../helper/common.js";

// HANDELE ADD ATTRIBUTE API
const postAttribute = async (req, res, next) => {
  try {
    const {
      name,
      key,
      inputType,
      type,
      isDefault,
      showInFilter,
      showInCatalogue,
    } = req.body;
    const findUniqueName = await prisma.attributeMaster.findUnique({
      where: { name: name },
    });

    if (findUniqueName)
      return res
        .status(409)
        .json({ isSuccess: false, message: "Attribute already exists!" });
    const data = await prisma.attributeMaster.create({
      data: {
        name,
        key,
        inputType,
        type,
        isDefault,
        showInFilter,
        showInCatalogue,
      },
      select: {
        name: true,
        key: true,
        inputType: true,
        type: true,
        isDefault: true,
        isActive: true,
        showInFilter: true,
        showInCatalogue: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Attribute created successfully.",
      data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE GET ALL ATTRIBUTES
const getAllAttribute = async (req, res, next) => {
  try {
    const data = await prisma.attributeMaster.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        inputType: true,
        type: true,
        isDefault: true,
        isActive: true,
        showInFilter: true,
        showInCatalogue: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.status(200).json({
      isSuccess: false,
      message: "Attributes get successfully.",
      data,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE GET DEFAULT ATTRIBUTES
const getDefaultAttributes = async (req, res, next) => {
  try {
    let { isDefault, child, showInCatalogue } = req.body;
    isDefault = isDefault || false;
    child = child || false;
    showInCatalogue = showInCatalogue || false;

    const whereCondition = {
      isActive: true,
      ...(isDefault && { isDefault: isDefault }),
      ...(showInCatalogue && { showInCatalogue: true }),
    };

    const data = await prisma.attributeMaster.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        key: true,
        inputType: true,
        type: true,
        isDefault: true,
        isActive: true,
        showInFilter: true,
        showInCatalogue: true,
        createdAt: true,
        updatedAt: true,
        ...(child && {
          children: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              value: true,
              attr_id: true,
            },
          },
        }),
      },
    });

    return res.status(200).json({
      isSuccess: true,  // Changed this to true
      message: "Attributes fetched successfully.",
      data,
    });

  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE ALL PAGINATION API
const getAllAttributePagination = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const totalCount = await prisma.attributeMaster.count();
    if (totalCount === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Attribute not found!", data: [] });
    const data = await prisma.attributeMaster.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        inputType: true,
        type: true,
        isDefault: true,
        isActive: true,
        showInFilter: true,
        showInCatalogue: true,
        createdAt: true,
        updatedAt: true,
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
      message: "Attributes get Successfully.",
      data,
      totalCount: totalCount,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE UPDATE API
const updateAttribute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      key,
      type,
      inputType,
      isDefault,
      showInFilter,
      showInCatalogue,
    } = req.body;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }

    const findUnique = await prisma.attributeMaster.findUnique({
      where: {
        id: id,
      },
    });

    if (!findUnique) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Attribute not found", data: [] });
    }

    const data = await prisma.attributeMaster.update({
      where: {
        id: id,
      },
      data: {
        name,
        key,
        inputType,
        type,
        isDefault,
        showInFilter,
        showInCatalogue,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Attribute update successfully.",
      data,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE DELETE API
const deleteAttribute = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format." });
    }
    const uniquePosition = await prisma.attributeMaster.findUnique({
      where: { id: id },
    });

    if (!uniquePosition) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Attribute not found!" });
    }

    const CheckAttributeValueCount = await prisma.attributeValue.count({
      where: {
        attr_id: id,
      },
    });

    if (CheckAttributeValueCount > 0) {
      return res.status(400).json({
        isSuccess: false,
        message: `Please remove Attribute values.`,
      });
    }
    const result = await prisma.attributeMaster.delete({
      where: { id: id },
    });

    return res
      .status(200)
      .json({ isSuccess: true, message: "Attribute deleted successfully." });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE STATUS UPDATE API
const updateAttributeStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("attributeMaster", id);
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
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateAttributeFilterStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const findData = await prisma.attributeMaster.findUnique({
      where: { id: id },
    });
    if (!findData)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Attribute not found!" });

    const newStatus = !findData.showInFilter;
    const result = await prisma.attributeMaster.update({
      where: { id: id },
      data: { showInFilter: newStatus },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Attribute filter status updated successfully.",
      data: result,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export {
  postAttribute,
  getAllAttribute,
  getDefaultAttributes,
  getAllAttributePagination,
  updateAttribute,
  updateAttributeStatus,
  updateAttributeFilterStatus,
  deleteAttribute,
};
