import cron from "cron";
import prisma from "../db/config.js";
import { deleteFile, removeProductImage } from "../helper/common.js";

const deleteCatalogues = new cron.CronJob("0 * * * * ", async () => {
  try {
    const currentTime = new Date();
    const cutoffTime = new Date(currentTime - 48 * 60 * 60 * 1000);

    console.log(currentTime, cutoffTime);

    const cataloguesToDelete = await prisma.catalogue.findMany({
      where: { deletedAt: { lte: cutoffTime }, NOT: { deletedAt: null } },
      include: { Product: true },
    });

    console.log(`catalogues ${cataloguesToDelete.length} to delete.`);
    for (const catalogue of cataloguesToDelete) {
      await prisma.product.deleteMany({
        where: { catalogue_id: catalogue.id },
      });
      for (const product of catalogue.Product) {
        if (product.image && product.image.length > 0) {
          // for (const imagePath of product.image) {
          await removeProductImage(product.image);
          // }
          console.log(`Deleted images for product ID: ${product.id}`);
        }
      }

      console.log(`Deleted products for catalogue ID: ${catalogue.id}`);

      await prisma.catalogue.delete({ where: { id: catalogue.id } });

      if (catalogue.coverImage) {
        await deleteFile(catalogue.coverImage);
        console.log(`Deleted cover image for catalogue ID: ${catalogue.id}`);
      }
      console.log(`Deleted Catalogue ID: ${catalogue.id}`);
    }
  } catch (error) {
    console.log("Error during cron job execution:", error);
  }
});

deleteCatalogues.start();
