import prisma from "../../db/config.js";
import { deleteData } from "../../helper/common.js";

const postShippingZone = async (req, res, next) => {
  try {
    const { name, countries } = req.body;

    const findUniqueName = await prisma.shippingZone.findFirst({
      where: { name: name },
    });

    if (findUniqueName)
      return res.status(409).json({
        isSuccess: false,
        message: "Shipping zone name already exists!",
      });

    const existingZones = await prisma.shippingZone.findMany({
      where: {
        countries: {
          hasSome: countries,
        },
      },
    });

    const conflictingCountries = existingZones
      .flatMap((zone) => zone.countries)
      .filter((country) => countries.includes(country));

    if (existingZones.length > 0) {
      return res.status(409).json({
        isSuccess: false,
        message:
          "One or more selected countries are already assigned to another shipping zone.",
        conflictingCountries,
      });
    }

    const result = await prisma.shippingZone.create({
      data: { name, countries },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping zone created successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getShippingZone = async (req, res, next) => {
  try {
    const result = await prisma.shippingZone.findMany({
      select: {
        id: true,
        name: true,
        countries: true,
        ShippingZoneAddRate: {
          select: {
            id: true,
            name: true,
            price: true,
            type: true,
            selectedOption: true,
            minWeight: true,
            maxWeight: true,
            minprice:true,
            maxprice:true,
            description:true,
            zone_id: true,
          }
        }
      }
    });
    return res.status(200).json({
      isSuccess: true,
      message: "Shipping zone get successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong,please try again!");
    next(error);
  }
};

const updateShippingZone = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, countries } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const [findUnique, findUniqueName, findUniqueCountries] =
      await prisma.$transaction([
        prisma.shippingZone.findUnique({ where: { id: id } }),
        prisma.shippingZone.findFirst({
          where: { id: { not: id }, name: name },
        }),
        prisma.shippingZone.findMany({
          where: {
            id: { not: id },
            countries: {
              hasSome: countries,
            },
          },
        }),
      ]);

    if (!findUnique)
      return res
        .status(404)
        .json({ isSuccess: false, message: "Shipping zone not found!" });

    if (findUniqueName)
      return res.status(400).json({
        isSuccess: false,
        message: "Shipping zone name already exist!",
      });

    const conflictingCountries = findUniqueCountries
      .flatMap((zone) => zone.countries)
      .filter((country) => countries.includes(country));

    if (findUniqueCountries.length > 0) {
      return res.status(409).json({
        isSuccess: false,
        message:
          "One or more selected countries are already assigned to another shipping zone.",
        conflictingCountries,
      });
    }

    const result = await prisma.shippingZone.update({
      where: { id: id },
      data: { name, countries },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Shipping zone updated successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const deleteShippingZone = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id))
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });

    const { status, message, data } = await deleteData("shippingZone", id);
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

export {
  postShippingZone,
  getShippingZone,
  updateShippingZone,
  deleteShippingZone,
};
