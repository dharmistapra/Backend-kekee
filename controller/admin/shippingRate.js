import _ from "underscore";
import prisma from "../../db/config.js";
import { deleteData, deleteFile, updateStatus } from "../../helper/common.js";
import csvtojson from "csvtojson";
import { importShippingRateSchema } from "../../schema/joi_schema.js";

const postShippingRate = async (req, res, next) => {
  try {
    const {
      maxWeight,
      minWeight,
      name,
      price,
      selectedOption,
      type,
      zone_id,
      minprice,
      maxprice,
      description,
    } = req.body;
    const result = await prisma.shippingZoneAddRate.create({
      data: {
        name,
        price,
        type,
        selectedOption,
        minWeight,
        maxWeight,
        zone_id,
        minprice,
        description,
        maxprice,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping rate created successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const puttShippingRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      maxWeight,
      minWeight,
      name,
      price,
      selectedOption,
      type,
      zone_id,
      minprice,
      maxprice,
      description,
    } = req.body;
    const result = await prisma.shippingZoneAddRate.update({
      where: {
        id: id,
      },
      data: {
        name,
        price,
        type,
        selectedOption,
        minWeight,
        maxWeight,
        zone_id,
        minprice,
        description,
        maxprice,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping rate update successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteShippingRate = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const { status, message, data } = await deleteData(
      "shippingZoneAddRate",
      id
    );
    if (!status)
      return res.status(404).json({ isSuccess: status, message: message });

    return res.status(200).json({
      isSuccess: status,
      message: message,
      data: data,
    });
  } catch (err) {
    const error = new Error("Something went wrong,please try again!");
    next(error);
  }
};

const importShippingRate = async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ isSuccess: false, message: "Please upload a file!" });

    const file = req.file.path;
    const shippingRate = [];
    const errors = [];

    const jsonArray = await csvtojson().fromFile(file);
    for (let [index, row] of jsonArray.entries()) {
      let {
        name,
        price,
        description,
        selectedOption,
        minWeight,
        maxWeight,
        minprice,
        maxprice,
        zoneName,
      } = row;
      index = index + 1;
      console.log(selectedOption == "WEIGHT");
      if (selectedOption === "WEIGHT") {
        minprice = 0;
        maxprice = 0;
      } else if (selectedOption === "TOTAL_PRICE") {
        minWeight = 0;
        maxWeight = 0;
      } else if (selectedOption === "") {
        minWeight = 0;
        maxWeight = 0;
        minprice = 0;
        maxprice = 0;
      }
      let zoneId;
      //   if (!zoneName) {
      //     if (file) deleteFile(file);
      //     // return res.status(400).json({
      //     //   isSuccess: false,
      //     //   message: `Zone name is required in row ${index}`,
      //     // });
      //     errors.push(`Zone name is required in row ${index}`);
      //   }
      if (zoneName) {
        let isExistShippingZone = await prisma.shippingZone.findFirst({
          where: { name: zoneName },
          select: { id: true },
        });

        zoneId = isExistShippingZone?.id;
        if (!isExistShippingZone) {
          if (file) deleteFile(file);
          //   return res.status(400).json({
          //     isSuccess: false,
          //     message: `Zone name ${zoneName} does not exist in row ${index}`,
          //   });
          errors.push(`Zone name ${zoneName} does not exist in row ${index}`);
        }
      }

      let shippingZoneRate = {
        name,
        type: "EXCEL_SHEET",
        price: parseFloat(price),
        description,
        selectedOption: selectedOption || null,
        minWeight: parseFloat(minWeight),
        maxWeight: parseFloat(maxWeight),
        minprice: parseFloat(minprice),
        maxprice: parseFloat(maxprice),
        zone_id: zoneId || "",
      };

      const shippingRateSchema = await importShippingRateSchema();
      const { error } = shippingRateSchema.validate(shippingZoneRate, {
        abortEarly: false,
      });

      if (error) {
        if (file) deleteFile(file);
        // return res.status(400).json({
        //   isSuccess: false,
        //   message: shippingRateSchema.error?.details[0].message,
        // });
        errors.push(
          `Error in row ${index}: ${error?.details.map((item) => item.message)}`
        );
      }
      shippingRate.push(shippingZoneRate);
    }

    if (errors.length > 0) {
      if (file) await deleteFile(file);
      return res.status(400).json({ isSuccess: false, message: errors });
    }

    await prisma.$transaction(async (tx) => {
      const shippingRateData = await tx.shippingZoneAddRate.createMany({
        data: shippingRate,
      });
      if (shippingRateData) {
        if (file) deleteFile(file);
        return res.status(200).json({
          isSuccess: true,
          message: "Shipping rate imported successfully.",
          data: shippingRateData,
        });
      }
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export {
  postShippingRate,
  puttShippingRate,
  deleteShippingRate,
  importShippingRate,
};
