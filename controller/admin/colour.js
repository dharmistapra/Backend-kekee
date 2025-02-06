import prisma from "../../db/config.js";
import { deleteData, updateStatus } from "../../helper/common.js";

// INSERT COLOUR
const postColour = async (req, res, next) => {
  const { name, code, isActive } = req.body;
  try {
    const uniqueCode = await prisma.colour.findFirst({ where: { code } });

    if (uniqueCode) {
      return res.status(409).json({
        isSuccess: false,
        message: "Colour already exists!",
      });
    }
    const result = await prisma.colour.create({
      data: {
        name,
        code,
        isActive,
      },
    });
    if (result) {
      return res.status(200).json({
        isSuccess: true,
        message: "Colour created successfully.",
        data: result,
      });
    } else {
      return res.status(500).json({
        isSuccess: false,
        message: "Internal Server Error!",
      });
    }
  } catch (error) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

// GET ALL COLOUR
const getAllColour = async (req, res, next) => {
  try {
    const result = await prisma.colour.findMany();
    return res.status(200).json({
      isSuccess: true,
      message: "Colour get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

// GET COLOUR BY PAGINATION
const paginationColour = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.colour.count();
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Colour not found!", data: [] });
    const result = await prisma.colour.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Colours get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateColour = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const { name, code, isActive } = req.body;

    const existingColour = await prisma.colour.findUnique({
      where: { id: id },
    });

    if (!existingColour) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Colour not found!" });
    }

    const result = await prisma.colour.update({
      where: { id },
      data: {
        name,
        code,
        isActive,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Colour updated successfully.",
      data: result,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
// DELETE COLOUR
const deleteColour = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("colour", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    return res
      .status(200)
      .json({ isSuccess: result.status, message: result.message });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
// CHANGE COLOUR STATUS
const updateColourStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("colour", id);
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
  postColour,
  getAllColour,
  paginationColour,
  updateColour,
  deleteColour,
  updateColourStatus,
};
