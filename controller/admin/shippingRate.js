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
        selectedOption,
        minWeight,
        maxWeight,
        minPrice,
        maxPrice,
        zoneName,
      } = row;
      index = index + 1;
      if (selectedOption === "Weight") {
        minPrice = 0;
        maxPrice = 0;
      } else if (selectedOption === "Price") {
        minWeight = 0;
        maxWeight = 0;
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
        price,
        selectedOption,
        minWeight,
        maxWeight,
        minPrice,
        maxPrice,
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

export { postShippingRate, importShippingRate };
