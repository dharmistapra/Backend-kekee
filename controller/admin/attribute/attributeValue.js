import slug from "slug";
import prisma from "../../../db/config.js";
import { deleteData, updateStatus } from "../../../helper/common.js";
import createSearchFilter from "../../../helper/searchFilter.js";

// HANDELE ADD ATTRIBUTE API
const postAttributeValue = async (req, res, next) => {
  try {
    // suppeose the value is a  ==> Cotton silk the value store in this format cotton-silk
    const { name, value, colour, attribute_id } = req.body;
    // const formattedValue = value.trim().toLowerCase().replace(/\s+/g, "-");

    const isAttributeExists = await prisma.attributeMaster.findUnique({
      where: { id: attribute_id },
    });

    if (!isAttributeExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Attribute not found!" });

    if (
      (isAttributeExists.type === "Colour" ||
        isAttributeExists.type === "Label") &&
      !colour
    )
      return res
        .status(400)
        .json({ isSuccess: false, message: "Colour is required!" });

    const findUniqueName = await prisma.attributeValue.findFirst({
      where: { name: name },
    });
    if (findUniqueName)
      return res
        .status(409)
        .json({ isSuccess: false, message: "Name already exists!" });

    const data = await prisma.attributeValue.create({
      data: {
        name: name,
        value: slug(name),
        colour: colour,
        attr_id: attribute_id,
      },
      select: { name: true, value: true, colour: true },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Attribute value inserted successfully.",
      data,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE GET ALL ATRRIBUTE
const getAllAttributeValue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.attributeValue.findMany({
      where: {
        attr_id: id,
      },
      include: {
        attribute: {
          select: {
            id: true,
            key: true,
            name: true,
            inputType: true,
            type: true,
            isActive: true,
          },
        },
      },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Attribute values get successfully.",
      data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE ALL PAGINATION API
const getAttributeValuePagination = async (req, res, next) => {
  try {
    const { attribute_id, perPage, pageNo, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [
      { name: { contains: search, mode: "insensitive" } },
      { value: { contains: search, mode: "insensitive" } },
    ];

    const searchFilter = createSearchFilter(search, filter);
    const totalCount = await prisma.attributeValue.count({
      where: { attr_id: attribute_id },
    });

    if (totalCount === 0)
      return res.status(200).json({
        isSuccess: false,
        message: "Attribute value not found!",
        data: [],
      });

    const isAttributeExists = await prisma.attributeMaster.findUnique({
      where: {
        id: attribute_id,
      },
    });

    if (!isAttributeExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Attribute not found!" });

    const data = await prisma.attributeValue.findMany({
      where: {
        attr_id: attribute_id,
        ...searchFilter,
      },
      include: {
        attribute: {
          select: {
            id: true,
            key: true,
            name: true,
            inputType: true,
            type: true,
            isActive: true,
          },
        },
      },
      skip,
      take,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Attribute values get successfully.",
      data,
      totalCount: totalCount,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.log("errr", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE UPDATE API
const updateAttributeValue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, value, colour, attribute_id } = req.body;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const [findUnique, findUniqueName] = await prisma.$transaction([
      prisma.attributeValue.findUnique({
        where: {
          id: id,
        },
      }),
      prisma.attributeValue.findFirst({
        where: { name: name, id: { not: id } },
      }),
    ]);

    if (!findUnique) {
      return res.status(200).json({
        isSuccess: false,
        message: "Attribute value not found.",
        data: [],
      });
    }

    if (findUnique.attr_id !== attribute_id) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Parent attribute not match." });
    }

    if (findUnique.type === "Colour" && !colour)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Colour is required!" });

    if (findUniqueName)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Attribute Value already exist!" });

    // suppeose the value is a  ==> Cotton silk the value store in this format cotton-silk
    // const formattedValue = value.trim().toLowerCase().replace(/\s+/g, "-");
    const data = await prisma.attributeValue.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        value: slug(name),
        colour: colour,
        attr_id: attribute_id,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Attribute value update successfully.",
      data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE DELETE API
const deletAttributeValue = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("attributeValue", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    return res.status(200).json({
      isSuccess: result.status,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

// HANDLE STATUS UPDATE API
const updateAttributeValueStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("attributeValue", id);
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

export {
  postAttributeValue,
  getAllAttributeValue,
  getAttributeValuePagination,
  updateAttributeValue,
  updateAttributeValueStatus,
  deletAttributeValue,
};
