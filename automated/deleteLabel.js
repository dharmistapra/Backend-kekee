import cron from "cron";
import prisma from "../db/config.js";
import dayjs from "dayjs";

const deleteLabels = new cron.CronJob("0 0 * * *", async () => {
  console.log("Checking and deleting expired label attributes...");

  try {
    const labelAttributes = await prisma.attributeMaster.findMany({
      where: { type: "Label" },
      select: { id: true },
    });

    const labelAttributeIds = labelAttributes.map((attr) => attr.id);
    if (labelAttributeIds.length === 0) {
      console.log("No label attributes found.");
      return;
    }

    const attributeValues = await prisma.attributeValue.findMany({
      where: { attr_id: { in: labelAttributeIds } },
      select: { id: true, value: true, updatedAt: true },
    });

    const now = dayjs();

    const expiredIds = attributeValues
      .filter((av) => {
        if (!av.value || isNaN(av.value)) return false;
        // let expiryDate;
        // try {
        //   expiryDate = dayjs(av.value, "YYYY-MM-DD", true);
        //   if (!expiryDate.isValid()) {
        //     console.warn(`Skipping invalid date format for ID: ${av.id}`);
        //     return false;
        //   }
        // } catch (error) {
        //   console.warn(`Skipping invalid value format for ID: ${av.id}`);
        //   return false;
        // }
        const daysToExpire = parseInt(av.value);
        const expiryDate = dayjs(av.updatedAt).add(daysToExpire, "day");
        return expiryDate.isBefore(now);
      })
      .map((av) => av.id);

    if (expiredIds.length > 0) {
      await prisma.catalogueAttributeValue.deleteMany({
        where: { attributeValue_id: { in: expiredIds } },
      });
      await prisma.productAttributeValue.deleteMany({
        where: { attributeValue_id: { in: expiredIds } },
      });
      console.log(`Deleted ${expiredIds.length} expired attribute values.`);
    } else {
      console.log("No expired attribute values found.");
    }
  } catch (error) {
    console.error("Error deleting expired attribute values:", error);
  }
});

deleteLabels.start();
