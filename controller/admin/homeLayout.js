import prisma from "../../db/config.js";
import { convertFilePathSlashes, deleteImage, tokenExists, updatePosition, updateStatus } from "../../helper/common.js";

const postHomeLayout = async (req, res, next) => {
    try {
        let { title, type, desktopsize, mobilesize, categoryId, bannerDetails
        } = req.body;
        const getlatestPosition = await prisma.homeLayout.count()
        const result = await prisma.homeLayout.create({
            data: {
                title,
                type,
                desktopsize: Number(desktopsize),
                mobilesize: Number(mobilesize),
                position: getlatestPosition + 1,
                categoryid: categoryId,
                banner: bannerDetails || []
            },
        });
        return res.status(200).json({
            isSuccess: true,
            message: "Layout created successfully.",
            data: result,
        });

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const getHomeLayout = async (req, res, next) => {
    try {
        const result = await prisma.homeLayout.findMany({
            select: {
                id: true,
                title: true,
                type: true,
                html_content: true,
                isActive: true,
                position: true,
            },
            orderBy: { position: "asc" }
        })
        return res.status(200).json({
            isSuccess: true,
            message: "Layout fetched successfully.",
            data: result
        })

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const putHomeLayout = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { title, type, desktopsize, mobilesize, categoryId, bannerDetails
        } = req.body;

        const exist = await prisma.homeLayout.findUnique({ where: { id: id } })
        if (!exist) res.status(404).json({ isSuccess: false, message: "Layout not found.", })

        const result = await prisma.homeLayout.update({
            where: { id: id },
            data: {
                title,
                type,
                desktopsize: Number(desktopsize),
                mobilesize: Number(mobilesize),
                categoryid: categoryId,
                banner: bannerDetails || []
            }
        })
        return res.status(200).json({
            isSuccess: true,
            message: "Layout updated successfully.",
            data: result
        })

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

const paginationHomeLayout = async (req, res, next) => {
    try {
        const { perPage, pageNo, search } = req.query;
        const page = Number(pageNo) || 1;
        const take = Number(perPage) || 10;
        const skip = (page - 1) * take;

        const searchFilter = search
            ? {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};

        const [count, result] = await prisma.$transaction([
            prisma.homeLayout.count({ where: searchFilter }),
            prisma.homeLayout.findMany({
                where: searchFilter,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    desktopsize: true,
                    mobilesize: true,
                    banner: true,
                    isActive: true,
                    position: true,
                },
                orderBy: { position: "asc" },
                skip,
                take,
            }),
        ])


        return res.status(200).json({
            isSuccess: true,
            message: count ? "HomeLayout fetched successfully." : "Currency not found!",
            data: result,
            totalCount: count,
            currentPage: page,
            pageSize: take,
        });


    } catch (error) {
        console.log(error)
        const err = new Error("Something went wrong !");
        next(err)
    }
}

const publicHomeLayout = async (req, res, next) => {
    try {
        const isTokenExists = await tokenExists(req);
        let count = 8;

        const isWebSettings = await prisma.webSettings.findFirst({
            select: { showProductCount: true, showPrice: true },
        });

        if (isWebSettings?.showProductCount) {
            count = isWebSettings.showProductCount;
        }

        const layouts = await prisma.homeLayout.findMany({
            select: {
                id: true,
                title: true,
                type: true,
                desktopsize: true,
                mobilesize: true,
                banner: true,
                html_content: true,
                isActive: true,
                position: true,
                categoryid: true,
            },
            orderBy: { position: "asc" },
        });

        const data = await Promise.all(
            layouts.map(async (layout) => {
                if (layout.type === "product" && layout?.categoryid) {
                    const category = await prisma.categoryMaster.findFirst({
                        where: {
                            id: layout?.categoryid,
                            isActive: true,
                            showInHome: true,
                        },
                        select: {
                            id: true,
                            name: true,
                            title: true,
                            url: true,
                            CatalogueCategory: {
                                where: {
                                    catalogue: {
                                        isActive: true,
                                        deletedAt: null,
                                    },
                                },
                                select: {
                                    catalogue_id: true,
                                },
                            },
                        },
                    });

                    if (category) {
                        const catalogueCollection = await Promise.all(
                            category.CatalogueCategory.map(async (val) => {
                                const catalogues = await prisma.catalogue.findMany({
                                    where: {
                                        id: val.catalogue_id,
                                        isActive: true,
                                        deletedAt: null,
                                    },
                                    select: {
                                        id: true,
                                        name: true,
                                        cat_code: true,
                                        no_of_product: true,
                                        url: true,
                                        average_price: true,
                                        offer_price: true,
                                        coverImage: true,
                                        updatedAt: true,
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
                                    orderBy: { updatedAt: "desc" },
                                });

                                return catalogues.map((catalogue) => {
                                    const labels = catalogue.attributeValues.map(
                                        (attr) => attr.attributeValue.name
                                    );
                                    catalogue.labels = labels;
                                    delete catalogue.attributeValues;

                                    if (!isTokenExists && !isWebSettings?.showPrice) {
                                        delete catalogue.average_price;
                                        delete catalogue.offer_price;
                                    }

                                    const hasSingle = catalogue.Product.some(
                                        (product) => product.showInSingle
                                    );
                                    delete catalogue.Product;

                                    return {
                                        ...catalogue,
                                        type: hasSingle ? "Full Set + Single" : "Full Set",
                                    };
                                });
                            })
                        );

                        const catalogueData = catalogueCollection
                            .flat()
                            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                            .slice(0, count);

                        return {
                            ...layout,
                            category: {
                                id: category.id,
                                name: category.name,
                                title: category.title,
                                url: category.url,
                                catalogueCollection: catalogueData,
                            },
                        };
                    }
                }

                return layout;
            })
        );

        return res.status(200).json({
            isSuccess: true,
            message: "Layout fetched successfully.",
            data,
        });
    } catch (error) {
        console.error(error);
        const err = new Error("Something went wrong!");
        next(err);
    }
};


const deleteHomeLayout = async (req, res, next) => {
    try {
        const { id } = req.params
        const deletehome = await prisma.homeLayout.delete({
            where: {
                id: id
            }
        })
        return res.status(200).json({ "IsSuccess": false, "message": "Data delete successfully" })
    } catch (error) {
        const err = new Error("Something went wrong!")
        next(err)
    }
}



const homeLayoutPosition = async (req, res, next) => {
    try {
        const { data } = req.body;
        const model = "homeLayout";
        const document = await updatePosition(model, data);
        if (document.status === false)
            return res
                .status(404)
                .json({ isSuccess: false, message: document.message });

        return res.status(200).json({
            isSuccess: true,
            message: "Home layout positions updated successfully.",
        });
    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

export { postHomeLayout, getHomeLayout, putHomeLayout, paginationHomeLayout, publicHomeLayout, deleteHomeLayout, homeLayoutPosition }