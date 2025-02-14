import prisma from "../../db/config.js";
import {
  convertFilePathSlashes,
  deleteData,
  deleteFile,
  updatePosition,
  updateStatus,
} from "../../helper/common.js";

const postTestimonial = async (req, res, next) => {
  const image = req.file;
  const { review_date, review, customer_name, rating } = req.body;
  let filepath = null;
  if (image?.path) {
    filepath = await convertFilePathSlashes(image.path);
  }
  try {
    const count = await prisma.testimonial.count();
    const result = await prisma.testimonial.create({
      data: {
        review_date,
        review,
        customer_name,
        image: filepath,
        rating: rating,
        position: count + 1,
      },
    });
    if (result) {
      return res.status(200).json({
        isSuccess: true,
        message: "Testimonial created successfully.",
        data: result,
      });
    } else {
      filepath && (await deleteFile(filepath));
      return res.status(500).json({
        isSuccess: false,
        message: "Something went wrong, please try again!",
      });
    }
  } catch (error) {
    filepath && deleteFile(filepath);
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const getTestimonial = async (req, res, next) => {
  try {
    const result = await prisma.testimonial.findMany();
    return res.status(200).json({
      isSuccess: true,
      message: "Testimonial get successfully.",
      data: result,
    });
  } catch (err) {
    next(new Error("Something went wrong, please try again!", { status: 500 }));
  }
};

const paginationTestimonial = async (req, res, next) => {
  try {
    const { perPage, pageNo } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.testimonial.count();
    if (count === 0)
      return res
        .status(200)
        .json({ isSuccess: true, message: "Testimonial not found!", data: [] });

    const result = await prisma.testimonial.findMany({
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Testimonial get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {

    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateTestimonial = async (req, res, next) => {
  const image = req.file;
  const { review_date, review, customer_name, rating } = req.body;
  let filepath = null;
  if (image?.path) {
    filepath = await convertFilePathSlashes(image.path);
  }
  try {
    const id = req.params.id;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Invalid ID format!" });
    }

    const existingTestimonial = await prisma.testimonial.findUnique({
      where: { id: id },
    });

    if (!existingTestimonial) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Testimonial not found!" });
    }

    if (image) {
      await deleteFile(existingTestimonial?.image);
    } else {
      filepath = existingTestimonial.image;
    }

    const result = await prisma.testimonial.update({
      where: { id },
      data: {
        review_date,
        review,
        customer_name,
        image: filepath,
        rating: rating,
      },
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Testimonial updated successfully.",
      data: result,
    });
  } catch (error) {
    console.log("errr", error);
    if (filepath) {
      await deleteFile(filepath);
    }
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const deleteTestimonial = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await deleteData("testimonial", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: result.status, message: result.message });

    await deleteFile(result.data.image);
    await prisma.testimonial.updateMany({
      where: {
        position: { gt: result.data.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });
    return res
      .status(200)
      .json({ isSuccess: result.status, message: result.message });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const updateTestimonialStatus = async (req, res, next) => {
  try {
    let id = req.params.id.trim();
    const result = await updateStatus("testimonial", id);
    if (result.status === false)
      return res
        .status(400)
        .json({ isSuccess: false, message: result.message });

    return res.status(200).json({
      isSuccess: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const filterTestimonial = async (req, res, next) => {
  try {
    const { perPage, pageNo, isActive } = req.body;
    const page = +pageNo || 1;
    const take = +perPage || 10;
    const skip = (page - 1) * take;

    const count = await prisma.testimonial.count({
      where: { isActive: isActive },
    });
    if (count === 0)
      return res
        .status(400)
        .json({ isSuccess: true, message: "Testimonial not found!", data: [] });

    const result = await prisma.testimonial.findMany({
      where: {
        isActive: isActive,
      },
      skip,
      take,
    });

    return res.status(200).json({
      isSuccess: true,
      message: "Testimonial get successfully.",
      data: result,
      totalCount: count,
      currentPage: page,
      pagesize: take,
    });
  } catch (error) {
    let err = new Error("Something went wrong, please try again!");
    next(err);
  }
};

const testimonialPosition = async (req, res, next) => {
  try {
    const { data } = req.body;
    const model = "testimonial";
    const document = await updatePosition(model, data);
    if (document.status === false)
      return res
        .status(404)
        .json({ isSuccess: false, message: document.message });

    return res.status(200).json({
      isSuccess: true,
      message: "Testimonial positions updated successfully.",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Something went wrong, please try again!");
    next(error);
  }
};
export {
  postTestimonial,
  getTestimonial,
  paginationTestimonial,
  updateTestimonial,
  deleteTestimonial,
  updateTestimonialStatus,
  filterTestimonial,
  testimonialPosition,
};
