import multer from "multer";
import { uniqueFilename } from "../helper/common.js";
import path from "path";
import fs from "fs";

const folderPaths = {
  homeBanner: {
    desktopImage: "./uploads/homeBanner/desktop",
    mobileImage: "./uploads/homeBanner/mobile",
  },
  currency: "./uploads/currency",
  product: "./uploads/product",
  pageWiseBanner: {
    desktopImage: "./uploads/pageBanner/desktop",
    mobileImage: "./uploads/pageBanner/mobile",
  },
  catalogue: "./uploads/catalogue",

  contactDetails: "./uploads/contactDetails",
  measurement: "./uploads/measurement",
  importcsv: "./uploads/importcsv",
  importZip: "./uploads/zip",
  paymentMethod: "./uploads/payment",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/admin");
  },
  filename: function (req, file, cb) {
    const fileExt = file.originalname.split(".").pop();
    cb(null, Date.now() + "." + fileExt);
  },
});

const filefilter = (req, file, cb) => {
  const validTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];
  if (validTypes.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    req.fileValidationError = "Invalid file type. Please upload a valid image.";
    return cb(new Error(req.fileValidationError), false);
  }
};

const filefilter1 = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/gif" ||
    file.mimetype === "image/webp" ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "video/mp4" ||
    file.mimetype === "video/webm" ||
    file.mimetype === "video/ogg" ||
    file.mimetype === "video/mov" ||
    file.mimetype === "video/avi" ||
    file.mimetype === "video/wmv" ||
    file.mimetype === "video/flv" ||
    file.mimetype === "image/svg+xml"
  ) {
    return cb(null, true);
  } else {
    req.fileValidationError = "Please upload valid image or video.";
    return cb(null, false);
  }
};

const csvFile = (req, file, cb) => {
  if (file) {
    if (!file.originalname.match(/\.(csv)$/)) {
      req.fileValidationError = "Only csv file are allowed!";
      return cb(null, false);
    }
  }
  cb(null, true);
};

const zipFile = (req, file, cb) => {
  if (file) {
    if (!file.originalname.match(/\.(zip)$/)) {
      req.fileValidationError = "Only zip file are allowed!";
      return cb(null, false);
    }
  }
  cb(null, true);
};

const dynamicStorage = (entityType) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let folderPath = folderPaths[entityType];

      if (typeof folderPath === "object") {
        folderPath = folderPath[file.fieldname];
      }

      if (folderPath) {
        const fullPath = path.resolve(folderPath);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, folderPath);
      } else {
        cb(new Error("Invalid entity type or fieldname"));
      }
    },
    filename: async (req, file, cb) => {
      let filename = await uniqueFilename(file);
      if (entityType === "product") filename = file.originalname;
      cb(null, filename);
    },
  });
};

const uploadConfiguration = {
  homeBanner: multer({
    storage: dynamicStorage("homeBanner"),
    fileFilter: filefilter1,
    limits: { fileSize: 10000000 * 5 },
  }).fields([
    { name: "desktopImage", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),

  pageWiseBanner: multer({
    storage: dynamicStorage("pageWiseBanner"),
    fileFilter: filefilter1,
    limits: { fileSize: 10000000 * 5 },
  }).fields([
    { name: "desktopImage", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),

  catalogue: multer({
    storage: dynamicStorage("catalogue"),
    fileFilter: filefilter,
    limits: { fileSize: 10000000 * 5 },
  }).single("coverImage"),

  product: multer({
    storage: dynamicStorage("product"),
    limits: { fileSize: 10000000 * 5 },
    fileFilter: filefilter1,
  }).array("images", 6),

  contactDetails: multer({
    storage: dynamicStorage("contactDetails"),
    fileFilter: filefilter,
    limits: { fileSize: 10000000 * 5 },
  }).single("image"),

  stitchingMeasurement: multer({
    storage: dynamicStorage("measurement"),
    fileFilter: filefilter,
    limits: { fileSize: 10000000 * 5 },
  }).array("image"),

  importcsv: multer({
    storage: dynamicStorage("importcsv"),
    fileFilter: csvFile,
    limits: { fileSize: 10000000 * 5 },
  }).single("csv"),

  importZip: multer({
    storage: dynamicStorage("importZip"),
    fileFilter: zipFile,
    limits: { fileSize: 10000000 * 5 },
  }).single("zip"),

  paymentMethod: multer({
    storage: dynamicStorage("paymentMethod"),
    fileFilter: filefilter,
    limits: { fileSize: 10000000 * 5 },
  }).single("image"),
};

const currencystorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/currency");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let uploadcurrencyImg = multer({
  storage: currencystorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: filefilter,
}).single("flag");

const testimonialstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/testimonial");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let uploadtestimonialImg = multer({
  storage: testimonialstorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: filefilter,
}).single("image");

const productImagestorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/product");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let uploadProductImges = multer({
  storage: productImagestorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: filefilter,
}).array("images", 6);

const collectionImagestorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/collection");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let collectionImages = multer({
  storage: collectionImagestorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: filefilter,
}).single("coverimage");

const data = {
  uploadHomeBanner: uploadConfiguration.homeBanner,
  uploadPageWiseBanner: uploadConfiguration.pageWiseBanner,
  uploadCatalogue: uploadConfiguration.catalogue,
  uploadProduct: uploadConfiguration.product,
  uploadContactDetails: uploadConfiguration.contactDetails,
  uploadstitchingmeasuremnt: uploadConfiguration.stitchingMeasurement,
  uploadCSV: uploadConfiguration.importcsv,
  uploadZip: uploadConfiguration.importZip,
  uploadPaymentMethod: uploadConfiguration.paymentMethod,
  // uploadCollectionImage:uploadConfiguration.co
};

const Categorystorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/category");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let uploadCategorystorageImg = multer({
  storage: Categorystorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: filefilter,
}).single("image");

const fileFilterCSV = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".csv") {
    cb(null, true);
  } else {
    cb(new Error("Only .csv files are allowed!"), false);
  }
};

const ShippingChagrestorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/shippingcharges");
  },
  filename: async (req, file, cb) => {
    let filename = await uniqueFilename(file);
    cb(null, filename);
  },
});

let uploadShippingChagresCSV = multer({
  storage: ShippingChagrestorage,
  limits: { fileSize: 10000000 * 5 },
  fileFilter: fileFilterCSV,
}).single("files");

export {
  uploadcurrencyImg,
  uploadtestimonialImg,
  uploadProductImges,
  uploadCategorystorageImg,
  collectionImages,
  uploadShippingChagresCSV,
  data,
};
