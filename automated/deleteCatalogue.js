import cron from "cron";
import prisma from "../db/config.js";
import { deleteFile, removeProductImage } from "../helper/common.js";

const deleteCatalogues = new cron.CronJob("0 0 * * *", async () => {
  try {
    const currentTime = new Date();
    const cutoffTime = new Date(currentTime - 48 * 60 * 60 * 1000);


    const cataloguesToDelete = await prisma.catalogue.findMany({
      where: { deletedAt: { lte: cutoffTime }, NOT: { deletedAt: null } },
      include: { Product: true },
    });

    for (const catalogue of cataloguesToDelete) {
      await prisma.product.deleteMany({
        where: { catalogue_id: catalogue.id },
      });
      for (const product of catalogue.Product) {
        if (product.image && product.image.length > 0) {
          // for (const imagePath of product.image) {
          await removeProductImage(product.image);
          product.thumbImage.length > 0 &&
            product.thumbImage.map(async (image) => await deleteFile(image));
          product.mediumImage.length > 0 &&
            product.mediumImage.map(async (image) => await deleteFile(image));
          // }
        }
      }
      await prisma.catalogue.delete({ where: { id: catalogue.id } });
      if (catalogue.coverImage) {
        await deleteFile(catalogue.coverImage);
      }
    }
  } catch (error) {
    return error;
  }
});

deleteCatalogues.start();
