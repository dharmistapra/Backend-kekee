import prisma from "../../db/config.js";
const getDashboard = async (req, res, next) => {
    try {
        let { date } = req.query;
        const currentDate = date ? new Date(date) : new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const totalOrder = await prisma.order.count({
            where: {
                createdAt: {
                    gte: startOfMonth, lte: endOfMonth
                }
            }
        });

        const bookedOrder = await prisma.order.count({
            where: {
                status: "CONFIRMED",
                createdAt: {
                    gte: startOfMonth, lte: endOfMonth
                }
            }
        });

        const cancelOrder = await prisma.order.count({
            where: {
                status: "CANCELLED",
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const pendingOrder = await prisma.order.count({
            where: {
                status: "PENDING",
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const totalRevenue = await prisma.order.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });


        return res.status(200).json({
            isSuccess: true,
            message: "Dashboard data get successfully",
            data: {
                totalOrder,
                bookedOrder,
                cancelOrder,
                pendingOrder,
                totalRevenue
            }
        })

    } catch (error) {
        const err = new Error("Something went wrong!")
        next(err)
    }
}

export default getDashboard