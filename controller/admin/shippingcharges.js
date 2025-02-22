import prisma from "../../db/config.js";
import { deleteData, deleteFile } from "../../helper/common.js";
import createSearchFilter from "../../helper/searchFilter.js";
import { getName } from "country-list";
import csvtojson from "csvtojson";
import xlsx from "xlsx";
import fs from "fs";
import iso from "iso-3166-1";
const postShippingcharges = async (req, res, next) => {
  try {
    const { country, from, to, amount, type, pcs } = req.body;
    let data = {};

    if (type === "weight") {
      data = { country, from, to, amount, type: "weight" };
    } else if (type === "pcs") {
      data = { country, pcs, amount, type: "pcs" };
    }
    const createdShippingCharge = await prisma.shippingCharges.create({
      data,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Shipping charges created successfully.",
      data: createdShippingCharge,
    });
  } catch (error) {
    console.error("Error creating shipping charge:", error);
    return res.status(500).json({
      isSuccess: false,
      message: "Something went wrong, please try again!",
    });
  }
};

const updateShippingcharges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { country, from, to, amount, type, pcs } = req.body;
    let data = {};

    if (type === "weight") {
      data = { country, from, to, amount, type: "weight" };
    } else if (type === "pcs") {
      data = { country, pcs, amount, type: "pcs" };
    }
    const createdShippingCharge = await prisma.shippingCharges.update({
      where: {
        id: id,
      },
      data,
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Shipping charges updated successfully.",
      data: createdShippingCharge,
    });
  } catch (error) {
    console.error("Error creating shipping charge:", error);
    return res.status(500).json({
      isSuccess: false,
      message: "Something went wrong, please try again!",
    });
  }
};

const paginationShippingcharges = async (req, res, next) => {
  try {
    const { perPage, pageNo, search } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const filter = [{ country: { contains: search, mode: "insensitive" } }];
    const searchFilter = createSearchFilter(search, filter);
    const count = await prisma.shippingCharges.count({
      where: searchFilter || undefined,
    });

    if (count === 0)
      return res.status(200).json({
        isSuccess: true,
        message: "shipping charges not found!",
        data: [],
      });

    const result = await prisma.shippingCharges.findMany({
      where: searchFilter || undefined,
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "shipping get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    console.log("error", error);
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteShippingcharges = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("shippingCharges", id);
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

const uploadShippingChargeCSV = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = req.file.path;
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const jsonArray = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const validEntries = jsonArray.filter((item) => item.Country);
    const uniqueKeys = validEntries.map((item) => ({
      country: item.Country.toUpperCase(),
      from: item.From,
      to: item.To,
      type: "weight",
    }));

    const existingRecords = await prisma.shippingCharges.findMany({
      where: {
        OR: uniqueKeys,
      },
      select: {
        country: true,
        from: true,
        to: true,
        type: true,
      },
    });

    const existingSet = new Set(
      existingRecords.map(
        (record) =>
          `${record.country}_${record.from}_${record.to}_${record.type}`
      )
    );

    const newEntries = validEntries.filter((item) => {
      const key = `${item.Country.toUpperCase()}_${item.From}_${
        item.To
      }_weight`;
      return !existingSet.has(key);
    });

    if (newEntries.length > 0) {
      await prisma.shippingCharges.createMany({
        data: newEntries.map((item) => ({
          country: item.Country.toUpperCase(),
          from: item.From,
          to: item.To,
          amount: parseFloat(item.Amount) || 0,
          type: "weight",
          pcs: item.Pcs || null,
        })),
      });
    }

    await deleteFile(filePath);

    return res.status(200).json({
      isSuccess: true,
      message: "File uploaded successfully",
      insertedCount: newEntries.length,
    });
  } catch (error) {
    console.error(error);
    await deleteFile(filePath);
    next(new Error("Internal Server Error!"));
  }
};

const countrylistGroup = async (req, res, next) => {
  try {
    const result = await prisma.shippingCharges.groupBy({
      by: ["country"],
    });

    return res.status(200).json({
      isSuccess: true,
      message: "country get successfully",
      data: result,
    });
  } catch (error) {
    next(new Error("Internal Server Error!"));
  }
};

const calculateShippingCost = async (weight, country) => {
  try {
    const shippingRules = await prisma.shippingCharges.findMany({
      where: { country: country },
      orderBy: { to: "asc" },
    });

    if (!shippingRules || shippingRules.length === 0) {
      return {
        success: false,
        message: "No shipping rules found for this country",
      };
    }

    for (let rule of shippingRules) {
      let minWeight = parseFloat(rule.from);
      let maxWeight = parseFloat(rule.to);

      if (weight >= minWeight && weight <= maxWeight) {
        return { success: true, shippingCost: rule.amount };
      }
    }

    return {
      success: false,
      message: "No matching shipping rule found for this weight",
    };
  } catch (error) {
    console.error("Error in calculateShippingCost:", error);
    return { success: false, message: "Internal server error" };
  }
};

const findShippingPrice = async (req, res) => {
  try {
    const { weight, country } = req.body;
    const result = await calculateShippingCost(weight, country);

    if (!result.success) {
      return res
        .status(404)
        .json({ isSuccess: false, message: result.message });
    }

    res
      .status(200)
      .json({ isSuccess: true, data: { shippingCost: result.shippingCost } });
  } catch (error) {
    console.error("Error finding shipping price:", error);
    res
      .status(500)
      .json({ isSuccess: false, message: "Internal server error" });
  }
  let shippingCost = null;

  for (let rule of shippingRules) {
    let minWeight = parseFloat(rule.from);
    let maxWeight = parseFloat(rule.to);

    if (weight >= minWeight && weight <= maxWeight) {
      shippingCost = rule.amount;
      break;
    }
  }

  if (shippingCost === null) {
    return res.status(404).json({
      isSuccess: false,
      message: "No matching shipping rule found for this weight",
    });
  }

  res.status(200).json({ isSuccess: true, data: { shippingCost } });
};

export {
  postShippingcharges,
  paginationShippingcharges,
  updateShippingcharges,
  deleteShippingcharges,
  uploadShippingChargeCSV,
  countrylistGroup,
  calculateShippingCost,
  findShippingPrice,
};
