import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  updateStatus,
} from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";

// INSERT CURRENCY
const postCurrency = async (req, res, next) => {
  const flag = req.file;
  const { code, symbol, rate } = req.body;
  let filepath = null;
  if (flag) {
    filepath = await convertFilePathSlashes(flag.path);
  }
  try {
    const [uniqueCode, count] = await prisma.$transaction([
      // HERE WE CHECK UIQUE AND COUNT
      prisma.currencyMaster.findFirst({ where: { code } }),
      prisma.currencyMaster.count(),
    ]);
    if (uniqueCode) {
      await deleteFile(filepath); // THIS FUNCTION USED FOR DELETE FILE IN UPLOAD FOLDER
      return res.status(409).json({
        isSuccess: false,
        message: "Currency already exists!",
      });
    }
    const result = await prisma.currencyMaster.create({
      data: {
        code,
        symbol,
        rate,
        flag: filepath,
      },
    });
    if (result) {
      return res.status(200).json({
        isSuccess: true,
        message: "Currency created successfully.",
        data: result,
      });
    } else {
      await deleteFile(filepath);
      return res.status(500).json({
        isSuccess: false,
        message: "Internal Server Error!",
      });
    }
  } catch (error) {
    deleteFile(filepath);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

// GET ALL CURRENCY
const getAllCurrency = async (req, res, next) => {
  try {
    const result = await prisma.currencyMaster.findMany({
      where: { isActive: true },
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Currencies get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

// GET CURRENCY BY PAGINATION
const paginationCurrency = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.query;
    const page = Number(pageNo) || 1;
    const take = Number(perPage) || 10;
    const skip = (page - 1) * take;

    const searchFilter = search
      ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          isNaN(search) ? {} : { rate: parseFloat(search) },
        ],
      }
      : {};

    const [count, result] = await prisma.$transaction([
      prisma.currencyMaster.count({ where: searchFilter }),
      prisma.currencyMaster.findMany({
        where: searchFilter,
        select: {
          id: true,
          code: true,
          symbol: true,
          rate: true,
          isActive: true,
          flag: true,
        },
        orderBy: { id: "asc" },
        skip,
        take,
      }),
    ]);

    return res.status(200).json({
      isSuccess: true,
      message: count ? "Currencies fetched successfully." : "Currency not found!",
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    next(new Error("Something went wrong, please try again!"));
  }
};


const updateCurrency = async (req, res, next) => {
  const flag = req.file;
  let filepath = null;
  if (flag?.path) {
    filepath = await convertFilePathSlashes(flag.path);
  }
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }
    const { code, symbol, rate } = req.body;

    const existingCurrency = await prisma.currencyMaster.findUnique({
      where: { id: id },
    });

    if (!existingCurrency) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Currency not found!" });
    }

    if (flag) {
      await deleteFile(existingCurrency?.flag);
    }

    const result = await prisma.currencyMaster.update({
      where: { id },
      data: {
        code,
        symbol,
        rate,
        flag: filepath ? filepath : existingCurrency?.flag,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Currency updated successfully.",
      data: result,
    });
  } catch (error) {
    if (filepath) {
      await deleteFile(filepath);
    }
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
// DELETE CURRENCY WITH UPDATE A POSITION
const deleteCurrency = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("currencyMaster", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    await deleteFile(result.data.flag);
    return res
      .status(200)
      .json({ isSuccess: result.status, message: result.message });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};
// CHANGE CATEGORY STATUS
const updateCurrencyStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("currencyMaster", id);
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


const deleteMultipleCurrency = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const existingCurrencies = await prisma.currencyMaster.findMany({
      where: {
        id: { in: ids },
      },
      select: { id: true },
    });

    const existingIds = existingCurrencies.map((currency) => currency.id);
    const missingIds = ids.filter((id) => !existingIds.includes(id));
    if (missingIds.length > 0) {
      return res.status(404).json({
        isSuccess: false,
        message: "Some currency IDs were not found.",
        missingIds,
      });
    }

    const deleted = await prisma.currencyMaster.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Currencies deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    console.error("Error in deleteMultipleCurrency:", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

export {
  postCurrency,
  getAllCurrency,
  paginationCurrency,
  updateCurrency,
  deleteCurrency,
  updateCurrencyStatus,
  deleteMultipleCurrency
};
