import prisma from "../../DB/config.js";

const postWishList = async (req, res, next) => {
  try {
    const { product_id, catalogue_id } = req.body;
    const user_id = req.user.id;
    const isUserExists = await prisma.users.findUnique({
      where: { id: user_id },
    });
    if (!isUserExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "User not found!" });
    if (product_id) {
      const isProductExists = await prisma.product.findUnique({
        where: { id: product_id },
      });
      if (!isProductExists)
        return res
          .status(404)
          .json({ isSuccess: false, message: "Product not found!" });
    }

    if (catalogue_id) {
      const isCatalogueExists = await prisma.catalogue.findUnique({
        where: { id: catalogue_id },
      });
      if (!isCatalogueExists)
        return res
          .status(404)
          .json({ isSuccess: false, message: "Catalogue not found!" });
    }
    let condition = {
      user_id: user_id,
    };
    let data;
    if (product_id) {
      condition["product_id"] = product_id;
      data = "Product";
    }
    if (catalogue_id) {
      condition["catalogue_id"] = catalogue_id;
      data = "Catalogue";
    }
    console.log(condition);
    const isWishListExists = await prisma.wishList.findFirst({
      where: condition,
    });
    if (isWishListExists)
      return res
        .status(200)
        .json({ isSuccess: true, message: `This ${data} already exists!` });
    const result = await prisma.wishList.create({
      data: {
        user_id,
        product_id: product_id || null,
        catalogue_id: catalogue_id || null,
      },
      select: {
        product_id: true,
        catalogue_id: true,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "wishlist store successfully.",
      data: result,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, Please try again!");
    next(err);
  }
};

const deleteWishListItem = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const id = req.params.id;

    const isUserExists = await prisma.users.findUnique({
      where: { id: user_id },
    });
    if (!isUserExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "User not found!" });

    const isRecordExists = await prisma.wishList.findUnique({
      where: { id: id, user_id: user_id },
    });
    if (!isRecordExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "record not found!" });

    const result = await prisma.wishList.delete({
      where: { id: id },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "wish list record deleted successfully.",
      data: result,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

const getWishLists = async (req, res, next) => {
  try {
    const id = req.user.id;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const isUserExists = await prisma.users.findUnique({ where: { id: id } });

    if (!isUserExists)
      return res
        .status(404)
        .json({ isSuccess: false, message: "User not found!" });

    const wishLists = await prisma.wishList.findMany({
      where: {
        user_id: id,
        OR: [
          {
            product: { categories: { some: { category: { isActive: true } } } },
          },
          {
            catalogue: {
              CatalogueCategory: { some: { category: { isActive: true } } },
            },
          },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            catalogue_id: true,
            sku: true,
            url: true,
            quantity: true,
            average_price: true,
            retail_price: true,
            retail_GST: true,
            retail_discount: true,
            offer_price: true,
            image: true,
            categories: {
              select: {
                id: true,
                category: {
                  select: {
                    id: true,
                    Menu: { select: { id: true, name: true, url: true } },
                  },
                },
              },
            },
            attributeValues: {
              where: { attribute: { type: "Label" } },
              select: {
                attributeValue: true,
              },
            },
          },
        },
        catalogue: {
          select: {
            id: true,
            name: true,
            cat_code: true,
            no_of_product: true,
            url: true,
            price: true,
            catalogue_discount: true,
            average_price: true,
            GST: true,
            offer_price: true,
            meta_title: true,
            meta_keyword: true,
            meta_description: true,
            coverImage: true,
            tag: true,
            isActive: true,
            CatalogueCategory: {
              select: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    Menu: {
                      select: {
                        id: true,
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },
            attributeValues: {
              where: { attribute: { type: "Label" } },
              select: {
                attributeValue: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            Product: {
              select: {
                id: true,
                name: true,
                sku: true,
                showInSingle: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    let product = [];
    let catalogue = [];
    wishLists.map((value) => {
      if (value.product !== null) {
        let labels = [];
        value.product.attributeValues.map((attribute) =>
          labels.push(attribute.attributeValue.value)
        );
        value.product.labels = labels;
        value.product.categories = value.product.categories.map(
          (value) => value.category.Menu[0].url
        );
        value.product.menu = value.product.categories[0];
        delete value.product.attributeValues;
        delete value.product.categories;
        product.push(value.product);
      } else if (value.catalogue !== null) {
        let labels = [];
        value.catalogue.attributeValues.map((attribute) =>
          labels.push(attribute.attributeValue.value)
        );
        value.catalogue.labels = labels;
        value.catalogue.CatalogueCategory =
          value.catalogue.CatalogueCategory.map(
            (value) => value.category.Menu[0].url
          );
        value.catalogue.menu = value.catalogue.CatalogueCategory[0];
        delete value.catalogue.attributeValues;
        catalogue.push(value.catalogue);
      }
    });

    const transformedData = catalogue.map((item) => {
      const hasSingle = item.Product.some((product) => product.showInSingle);
      delete item.Product;
      delete item.CatalogueCategory;

      return {
        ...item,
        type: hasSingle ? "Full Set + Single" : "Full Set",
      };
    });

    const data = { product, catalogue: transformedData };

    if (!wishLists && wishLists.length === 0)
      return res
        .status(200)
        .json({ isSuccess: false, message: "Wish Lists not found!" });

    return res.status(200).json({
      isSuccess: true,
      message: "Wish lists get successfully.",
      data: data,
    });
  } catch (err) {
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};

export { postWishList, deleteWishListItem, getWishLists };
