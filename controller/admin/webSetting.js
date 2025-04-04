import prisma from "../../db/config.js";
import { convertFilePathSlashes, deleteFile } from "../../helper/common.js";

const postWebSetting = async (req, res, next) => {
  try {
    const {
      address,
      interNationalNumber,
      domesticNumber,
      complaintNumber,
      email,
      skypeId,
      timing,
      mapUrl,
      notification,
      happyToHelp,
      showProductCount,
      showPrice,
      wholesale_min_buy_qty,
      wholesale_min_buy_amount,
    } = req.body;

    const isExistWebSetting = await prisma.webSettings.findFirst();
    let result;
    let headerLogo;
    let footerLogo;
    let favIcon;

    if (isExistWebSetting) {
      headerLogo =
        (req.files &&
          req.files.headerLogo &&
          convertFilePathSlashes(req.files.headerLogo[0].path)) ||
        isExistWebSetting.headerLogo;
      footerLogo =
        (req.files &&
          req.files.footerLogo &&
          convertFilePathSlashes(req.files.footerLogo[0].path)) ||
        isExistWebSetting.footerLogo;
      favIcon =
        (req.files.favIcon &&
          convertFilePathSlashes(req.files.favIcon[0].path)) ||
        isExistWebSetting.favIcon;
      result = await prisma.webSettings.update({
        where: { id: isExistWebSetting.id },
        data: {
          address,
          interNationalNumber,
          domesticNumber,
          complaintNumber,
          email,
          skypeId,
          timing,
          mapUrl,
          notification,
          happyToHelp,
          showProductCount,
          showPrice,
          wholesale_min_buy_qty,
          wholesale_min_buy_amount,
          headerLogo,
          footerLogo,
          favIcon,
        },
      });
      if (req.files && req.files.headerLogo)
        await deleteFile(isExistWebSetting.headerLogo);
      if (req.files && req.files.footerLogo)
        await deleteFile(isExistWebSetting.footerLogo);
      if (req.files && req.files.favIcon)
        await deleteFile(isExistWebSetting.favIcon);
    } else {
      if (!req.files)
        return res.status(400).json({
          isSuccess: false,
          message: "Header Logo is required!",
        });
      if (!req.files.footerLogo) {
        if (req.files.headerLogo)
          await deleteFile(req.files.headerLogo[0].path);
        if (req.files.favIcon) await deleteFile(req.files.favIcon[0].path);
        return res.status(400).json({
          isSuccess: false,
          message: "Footer Logo is required!",
        });
      }
      if (!req.files.favIcon) {
        if (req.files.headerLogo)
          await deleteFile(req.files.headerLogo[0].path);
        if (req.files.footerLogo)
          await deleteFile(req.files.footerLogo[0].path);
        return res.status(400).json({
          isSuccess: false,
          message: "Favicon is required!",
        });
      }

      headerLogo = convertFilePathSlashes(req.files.headerLogo[0].path);
      footerLogo = convertFilePathSlashes(req.files.footerLogo[0].path);
      favIcon = convertFilePathSlashes(req.files.favIcon[0].path);

      result = await prisma.webSettings.create({
        data: {
          address,
          interNationalNumber,
          domesticNumber,
          complaintNumber,
          email,
          skypeId,
          timing,
          mapUrl,
          notification,
          happyToHelp,
          showProductCount,
          showPrice,
          wholesale_min_buy_qty,
          wholesale_min_buy_amount,
          headerLogo,
          footerLogo,
          favIcon,
        },
      });
    }

    return res.status(200).json({
      isSuccess: true,
      data: result,
      message: "Web setting updated successfully!",
    });
  } catch (err) {
    console.log("err", err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getWebSetting = async (req, res, next) => {
  try {
    const result = await prisma.webSettings.findFirst({
      select: {
        id: true,
        headerLogo: true,
        footerLogo: true,
        favIcon: true,
        address: true,
        interNationalNumber: true,
        domesticNumber: true,
        complaintNumber: true,
        email: true,
        skypeId: true,
        timing: true,
        mapUrl: true,
        notification: true,
        happyToHelp: true,
        showProductCount: true,
        showPrice: true,
        wholesale_min_buy_qty: true,
        wholesale_min_buy_amount: true,
      },
    });
    return res.status(200).json({
      isSuccess: true,
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { postWebSetting, getWebSetting };
