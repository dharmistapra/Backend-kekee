import prisma from "../../db/config.js";

const getOrderdetails = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    console.log("orderId", orderId);
    const orderDetails = await prisma.order.findUnique({
      where: { orderId: orderId },
      select: {
        orderId: true,
        createdAt: true,
        subtotal: true,
        Tax: true,
        discount: true,
        shippingcharge: true,
        totalAmount: true,
        status: true,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            productsnapshots: true,
            product: {
              select: {
                name: true,
                image: true,
                categories: {
                  select: {
                    category: {
                      select: {
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },

            catalogue: {
              select: {
                name: true,
                url: true,
                coverImage: true,
                CatalogueCategory: {
                  select: {
                    category: {
                      select: {
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        shipping: {
          select: {
            fullName: true,
            address1: true,
            address2: true,
            city: true,
            country: true,
            state: true,
            zipCode: true,
            mobile: true,
          },
        },
        billing: {
          select: {
            fullName: true,
            address1: true,
            address2: true,
            city: true,
            country: true,
            state: true,
            zipCode: true,
            mobile: true,
            GstNumber: true,
            companyname: true,
            whatsapp: true,
            isSame: true,
          },
        },
        payment: {
          select: {
            paymentMethod: true,
            transactionId: true,
            status: true,
            bankAccountId: true,
            bankaccount: {
              select: {
                bankName: true,
                accountHolderName: true,
                accountNumber: true,
                ifscCode: true,
              },
            },
          },
        },
      },
    });

    if (!orderDetails) {
      return res.status(404).json({
        message: "Order not found",
        isSuccess: false,
      });
    }

    const transformedOrderItems = orderDetails?.orderItems?.map((item) => {
      return {
        ...item,
        name: item?.product?.name || item?.catalogue?.name,
        url: item?.product?.url || item?.catalogue?.url,
        image: item?.catalogue?.coverImage || item?.product?.image?.[0],
        type: item?.catalogue ? "Catalogue" : "product",
        categoryURL:
          item?.product?.categories?.[0]?.category?.url ||
          item?.catalogue?.CatalogueCategory?.[0]?.category?.url,
        productsnapshots: JSON.parse(item.productsnapshots),
      };
    });

    return res.status(200).json({
      message: "Order retrieved successfully",
      isSuccess: true,
      data: {
        ...orderDetails,
        orderDate: new Date(orderDetails.createdAt).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        ),
        orderItems: transformedOrderItems,
      },
    });
  } catch (error) {
    console.log("Error fetching order details:", error);
    let err = new Error("Something went wrong, Please try again!");
    next(err);
  }
};

const getOrderHistory = async (req, res, next) => {
  try {
    const { perPage, pageNo, userId } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;
    const result = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        orderId: true,
        createdAt: true,
        status: true,
        totalAmount: true,
        orderItems: {
          select: {
            // productname: true,
            // type: true,
            quantity: true,
            product: {
              select: {
                name: true,
                categories: {
                  select: {
                    category: {
                      select: {
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },

            catalogue: {
              select: {
                name: true,
                url: true,
                CatalogueCategory: {
                  select: {
                    category: {
                      select: {
                        name: true,
                        url: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take,
    });

    const formattedResult = result.map((order) => {
      const catalogue = order.orderItems?.[0]?.catalogue;
      const prdoduct = order.orderItems?.[0]?.product;
      return {
        orderId: order?.orderId,
        name: prdoduct?.name || catalogue?.name,
        url: prdoduct?.url || catalogue?.url,
        type: catalogue ? "Catalogue" : "product",
        categoryURL:
          prdoduct?.categories?.[0]?.category?.url ||
          catalogue?.CatalogueCategory?.[0]?.category?.url,

        orderDate: new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        status: order?.status,
        amount: order?.totalAmount.toFixed(2),
      };
    });

    return res.status(200).json({
      message: "Order history fetched successfully",
      isSuccess: true,
      data: formattedResult,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, Please try again!");
    next(err);
  }
};

const getuserAddresspagiantion = async (req, res, next) => {
  try {
    const { user_id, pageNo, perPage } = req.body;
    const page = Number(pageNo) || 1;
    const take = Number(perPage) || 4;
    const skip = (page - 1) * take;
    const [count, result] = await await prisma.$transaction([
      prisma.billing.count({ where: { userId: user_id } }),
      prisma.billing.findMany({
        where: { userId: user_id },
        select: {
          id: true,
          fullName: true,
          address1: true,
          address2: true,
          city: true,
          country: true,
          state: true,
          zipCode: true,
          email: true,
          mobile: true,
          whatsapp: true,
          companyname: true,
          GstNumber: true,
          isSame: true,
        },
        skip,
        take,
      }),
    ]);
    // const result = await prisma.billing.findMany({
    //   where: { userId: id },
    //   select: {
    //     id: true,
    //     fullName: true,
    //     address1: true,
    //     address2: true,
    //     city: true,
    //     country: true,
    //     state: true,
    //     zipCode: true,
    //     email: true,
    //     mobile: true,
    //     whatsapp: true,
    //     companyname: true,
    //     GstNumber: true,
    //   },
    // });

    if (!result) {
      return res.status(200).json({
        message: "Address not found",
        isSuccess: false,
        data: [],
        otalCount: count,
        currentPage: page,
        pageSize: take,
      });
    }

    return res.status(200).json({
      message: "Default address successfully",
      isSuccess: true,
      data: result,
      totalCount: count,
      currentPage: page,
      pageSize: take,
    });
  } catch (error) {
    console.log(error);
    let err = new Error("Something went wrong, Please try again!");
    next(err);
  }
};
export { getOrderdetails, getOrderHistory, getuserAddresspagiantion };
