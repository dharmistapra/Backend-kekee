import Joi from "joi";
import JoiSchemaValidation from "../middleware/joiValidate.js";

/** CATEGORY */

const categorySchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    title: Joi.string().optional().default("").allow(""),
    url: Joi.string().optional(),
    parent_id: Joi.string().optional().allow("").default(null),
    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
    attributes: Joi.string().optional().allow("").default(""),
    mixed: Joi.boolean().optional().default(false),
    isFilter: Joi.boolean().optional().default(false),
  });
  await JoiSchemaValidation(schema, req, next);
};
const subCategorySchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    parent_id: Joi.string().required(),
    meta_title: Joi.string().optional(),
    meta_keyword: Joi.string().optional(),
    meta_description: Joi.string().optional(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END CATEGORY */

/** CURRENCY */

const currencySchema = async (req, res, next) => {
  const schema = Joi.object({
    code: Joi.string().required(),
    rate: Joi.number().required(),
    symbol: Joi.string().required(),
    flag: Joi.string().optional().allow(""),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END CURRENCY */

/** ATTRIBUTE MASTER */

const attributeMasterSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    key: Joi.string().required(),
    inputType: Joi.string()
      .valid(
        "TextField",
        "TextArea",
        "TextEditor",
        "Dropdown",
        "MultipleSelect",
        "Date",
        "DateandTime",
        "CheckBox",
        "Redio"
      )
      .required(),
    type: Joi.string()
      .valid("Attribute", "Label", "Colour", "Other")
      .required(),
    isDefault: Joi.boolean().optional().default(false),
    showInFilter: Joi.boolean().optional().default(false),
    showInCatalogue: Joi.boolean().optional().default(false),
  });
  await JoiSchemaValidation(schema, req, next);
};

const pageSchema = async (req, res, next) => {
  const schema = Joi.object({
    perPage: Joi.number().required(),
    pageNo: Joi.number().required(),
    search: Joi.string().optional().allow(""),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END ATTRIBUTE MASTER */

/** ATTRIBUTE VALUE */

const attributeValueSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().allow("").default(""),
    value: Joi.string().optional().default(""),
    colour: Joi.string().optional().allow("").default(""),
    attribute_id: Joi.string().required(),
    search: Joi.string().optional().allow(""),
  });
  await JoiSchemaValidation(schema, req, next);
};

const attributeValuePageSchema = async (req, res, next) => {
  const schema = Joi.object({
    attribute_id: Joi.string().required(),
    perPage: Joi.number().required(),
    pageNo: Joi.number().required(),
    search: Joi.string().optional().allow(""),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END ATTRIBUTE VALUE */

/** ADMIN */

const registerSchema = async (req, res, next) => {
  const schema = Joi.object({
    // userName: Joi.string().required(),
    name: Joi.string().optional(),
    mobile_number: Joi.number().optional(),

    email: Joi.string().email().required(),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password atleast 8 character.",
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Confirm password must match.",
      }),
  });
  await JoiSchemaValidation(schema, req, next);
};

const loginSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

const resetAdminSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

const verifyAdminSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    otpCode: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

const verifyOtpSchema = async (req, res, next) => {
  const schema = Joi.object({
    otp: Joi.string().required(),
    secret: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

const resetPasswordAdminSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8) // At least 8 characters
      // .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$')) // At least one uppercase, one lowercase, one number, and one special character
      .required()
      .messages({
        "string.min": "Password atleast 8 character.",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password")) // Matches `password` field
      .required()
      .messages({
        "any.only": "Confirm password must match the password.",
      }),
  });

  await JoiSchemaValidation(schema, req, next);
};

const changePasswordSchema = async (req, res, next) => {
  const schema = Joi.object({
    newPassword: Joi.string().min(8).required().messages({
      "string.min": "Password atleast 8 character.",
    }),
    oldPassword: Joi.string().min(8).required().messages({
      "string.min": "Password atleast 8 character.",
    }),
  });

  await JoiSchemaValidation(schema, req, next);
};

/** END ADMIN */

/** CMS */

const cmsSchema = async (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    url: Joi.string().optional().allow(""),
    isActive: Joi.boolean().optional().default(true),
  });

  await JoiSchemaValidation(schema, req, next);
};

const labelSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    colorCode: Joi.string().required(),
  });

  await JoiSchemaValidation(schema, req, next);
};

const sizeSchema = async (req, res, next) => {
  const schema = Joi.object({
    value: Joi.string().required(),
  });

  await JoiSchemaValidation(schema, req, next);
};

/** END CMS */

/** MENU */

const menuSchema = async (req, res, next) => {
  const schema = Joi.object({
    parent_id: Joi.string().optional().allow(null).default(null),
    name: Joi.string().required(),
    url: Joi.string().optional().allow("").default(""),
    menuType: Joi.string()
      .valid("Default", "Category")
      .optional()
      .default("Default"),
    displayType: Joi.string()
      .valid("Default", "Megamenu", "Dropdown")
      .optional()
      .default("Default"),
    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
    category_id: Joi.when("menuType", {
      is: "Category",
      then: Joi.string().required(),
      otherwise: Joi.string().optional().allow("").default(null),
    }),
    // cms_id: Joi.string().optional().allow(null).default(null),
    isActive: Joi.boolean().optional().default(true),
    showInHeader: Joi.boolean().optional().default(true),
    showInFooter: Joi.boolean().optional().default(false),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END MENU */

/** HOME BANNER */

const homeBannerSchema = async (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    bannerType: Joi.string().valid("Image", "Video").required(),
    description: Joi.string().optional().allow("").default(""),
    url: Joi.string().optional().allow("").default(""),
    desktopImage: Joi.any(),
    mobileImage: Joi.any(),
    isActive: Joi.boolean().optional().default(true),
  });

  await JoiSchemaValidation(schema, req, next);
};

const positionSchema = async (req, res, next) => {
  const schema = Joi.object({
    data: Joi.array().items({
      id: Joi.string().required(),
      position: Joi.number().required(),
    }),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END HOME BANNER */

/** TESTIMONIAL */

const testimonialSchema = async (req, res, next) => {
  const schema = Joi.object({
    review_date: Joi.string().isoDate().required(),
    review: Joi.string().required(),
    customer_name: Joi.string().required(),
    image: Joi.string().optional().allow(""),
    rating: Joi.number().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END TESTIMONIAL */

/** SOCIAL MEDIA ICON */

const socialMediaIconSchema = async (req, res, next) => {
  const schema = Joi.object({
    icon: Joi.string().required(),
    name: Joi.string().required(),
    url: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END SOCIAL MEDIA ICON */

/** PAGE WISE BANNER */

const pageWiseBannerSchema = async (req, res, next) => {
  const schema = Joi.object({
    // menu_id: Joi.string().required(),
    category_id: Joi.string().required(),
    title: Joi.string().required(),
    bannerType: Joi.string().valid("Image", "Video").required(),
    url: Joi.string().optional().allow("").default(""),
    description: Joi.string().optional().allow("").default(""),
    desktopImage: Joi.any(),
    mobileImage: Joi.any().optional().allow("").default(""),
    isActive: Joi.boolean().optional().default(true),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END PAGE WISE BANNER */

/** EMAIL SETTING */

const emailSettingSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    host: Joi.string().required(),
    port: Joi.number().required(),
    toEmail: Joi.string().required(),
    bccEmail: Joi.string().optional().allow(""),
    ccEmail: Joi.string().optional().allow(""),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END EMAIL SETTING */

/** EMAIL TEMPLATE */

const emailTemplateSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    subject: Joi.string().required(),
    description: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END EMAIL TEMPLATE */

/** COLOUR */

const colourSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    isActive: Joi.boolean().optional().default(true),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END COLOUR */

/** SUBMENU COLLECTION */

const subMenuCollectionSchema = async (req, res, next) => {
  const schema = Joi.object({
    subMenuCollectionType: Joi.string()
      .valid("Default", "Category", "Brand")
      .allow("")
      .default("Default"),
    parent_id: Joi.string().optional().allow(null).default(null),
    name: Joi.string().optional().allow("").default(""),
    menu_id: Joi.string().optional().allow(null).default(null),
    category_id: Joi.when("subMenuCollectionType", {
      is: "Category",
      then: Joi.string().required(),
      otherwise: Joi.string().optional().allow(null).default(null),
    }),
    meta_title: Joi.string().optional().allow(""),
    meta_keyword: Joi.string().optional().allow(""),
    meta_description: Joi.string().optional().allow(""),
    url: Joi.string().optional().allow(""),
    isActive: Joi.boolean().optional().default(true),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END SUBMENU COLLECTION */

/** CATALOGUE */

const catalogueSchema = async (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().optional().default(null),
    name: Joi.string().required(),
    cat_code: Joi.string().required(),
    url: Joi.string().optional().default(""),
    quantity: Joi.number().required(),
    category_id: Joi.array().items(Joi.string().required()).required(),
    collection_id: Joi.array().items(Joi.string()).optional().default([]),
    // category_id: Joi.optional(),
    no_of_product: Joi.number().required(),
    price: Joi.number().required(),
    catalogue_discount: Joi.string().allow("").optional().default(0),
    average_price: Joi.number().required(),
    GST: Joi.number().optional(),
    offer_price: Joi.number().optional(),
    type: Joi.optional(),
    delete_product_ids: Joi.optional(),
    // retail_discount: Joi.number().required(),
    stitching: Joi.boolean().optional().default(false),
    size: Joi.boolean().optional().default(false),
    weight: Joi.number().required(),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().required(),
        attributeValue: Joi.array()
          .items({
            id: Joi.string().required(),
            value: Joi.string().optional().allow("").default(""),
          })
          .optional()
          .default([]),
        // value: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),
    // sizes: Joi.when("size", {
    //   is: true,
    //   then: Joi.array().items(Joi.string().required()).required(),
    //   otherwise: Joi.forbidden(),
    // }),
    sizes: Joi.array().optional(),
    meta_title: Joi.string().optional().default(""),
    meta_keyword: Joi.string().optional().default(""),
    meta_description: Joi.string().optional().default(""),
    coverImage: Joi.any(),
    // mobileImage: Joi.any(),
    description: Joi.string().required(),
    tag: Joi.array().items(Joi.string().required()).required(),
    isActive: Joi.boolean().optional().default(true),
    product: Joi.array()
      .items({
        id: Joi.string().required(),
        name: Joi.string().required(),
        average_price: Joi.number().required(),
        retail_price: Joi.number().required(),
        sizes: Joi.when("size", {
          is: true,
          then: Joi.array()
            .items({
              id: Joi.string().required(),
              price: Joi.number().required().default(0),
              quantity: Joi.number().required().default(0),
            })
            .min(1)
            .required(),
          otherwise: Joi.array()
            .items({
              id: Joi.string().required(),
              price: Joi.number().required().default(0),
              quantity: Joi.number().required().default(0),
            })
            .optional()
            .default([]),
        }),
        showInSingle: Joi.boolean().required(),
        outofStock: Joi.boolean().required(),
      })
      .required(),
  });

  return schema;

  // await JoiSchemaValidation(schema, req, next);
};

const importCatalogueSchema = async (req, res, next) => {
  const schema = Joi.object({
    category: Joi.array().items(Joi.string().required()).optional(),
    collection: Joi.array().items(Joi.string()).optional(),
    name: Joi.string().required(),
    cat_code: Joi.string().required(),
    url: Joi.string().optional().default(""),
    quantity: Joi.number().required(),
    no_of_product: Joi.number().required(),
    price: Joi.number().required(),
    catalogue_discount: Joi.number().allow("").optional().default(0),
    average_price: Joi.number().required(),
    GST: Joi.number().optional(),
    offer_price: Joi.number().optional(),
    stitching: Joi.boolean().optional().default(false),
    size: Joi.boolean().optional().default(false),
    weight: Joi.number().required(),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().required(),
        attributeValue_id: Joi.string()
          // .items({
          //   id: Joi.string().required(),
          //   value: Joi.string().optional().allow("").default(""),
          // })
          .optional()
          .default([]),
        // value: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),
    meta_title: Joi.string().optional().default(""),
    meta_keyword: Joi.string().optional().default(""),
    meta_description: Joi.string().optional().default(""),
    coverImage: Joi.any(),
    // mobileImage: Joi.any(),
    description: Joi.string().required(),
    tag: Joi.array().items(Joi.string().required()).required(),
    isActive: Joi.boolean().optional().default(true),
    product: Joi.array().items({
      // id: Joi.string().optional(),
      name: Joi.string().required(),
      // catalogue_id: Joi.optional().allow(null).default(null),
      cat_code: Joi.string().optional(),
      sku: Joi.string().required(),
      // url: Joi.string().optional().default(""),
      showInSingle: Joi.boolean().optional().default(false),
      quantity: Joi.number().required(),
      weight: Joi.number().required(),
      // price: Joi.number().required(),
      average_price: Joi.number().optional().default(0),
      retail_price: Joi.when("showInSingle", {
        is: true,
        then: Joi.number().required(),
        otherwise: Joi.number().optional().default(0),
      }),
      retail_GST: Joi.number().optional().default(0),
      retail_discount: Joi.optional().default(0),
      offer_price: Joi.when("retail_price", {
        is: "retail_price",
        then: Joi.number().required(),
        otherwise: Joi.number().optional().default(0),
      }),
      description: Joi.string().required(),
      // label: Joi.string().optional().default(null),
      tag: Joi.array().optional().default([]),

      // readyToShip: Joi.boolean().optional().default(false),
      // images: Joi.optional(),
      image: Joi.array().items(Joi.string().required()).required(),
      category_id: Joi.array().optional().min(1),
      collection_id: Joi.array().optional().default([]),
      // attributeValue_id: Joi.array().optional().min(1),
      attributes: Joi.array()
        .items({
          attribute_id: Joi.string().required(),
          attributeValue: Joi.array()
            .items({
              id: Joi.string().required(),
              value: Joi.string().optional().allow("").default(""),
            })
            .optional()
            .default([]),
          // value: Joi.string().optional().allow("").default(""),
        })
        .optional()
        .default([]),
      size: Joi.array()
        .items({
          id: Joi.string().required(),
          price: Joi.number().required().default(0),
          quantity: Joi.number().required().default(0),
        })
        .optional()
        .default([]),
      stitching: Joi.boolean().optional().default(false),
      meta_title: Joi.string().optional().allow("").default(""),
      meta_keyword: Joi.string().optional().allow("").default(""),
      meta_description: Joi.string().optional().allow("").default(""),
      product: Joi.array().items().optional(),
    }),
  });

  return schema;
};

const importProductSchema = async (req, res, next) => {
  const schema = Joi.object({
    // id: Joi.string().optional(),
    category: Joi.array().items().optional(),
    collection: Joi.array().items().optional(),
    name: Joi.string().required(),
    // catalogue_id: Joi.optional().allow(null).default(null),
    // cat_code: Joi.string().optional(),
    sku: Joi.string().required(),
    url: Joi.string().optional(),
    showInSingle: Joi.boolean().optional().default(false),
    quantity: Joi.number().required(),
    weight: Joi.number().required(),
    // price: Joi.number().required(),
    average_price: Joi.number().optional().default(0),
    retail_price: Joi.number().when("showInSingle", {
      is: true,
      then: Joi.number().required(),
      otherwise: Joi.number().optional().default(0),
    }),
    retail_GST: Joi.number().optional().default(0),
    retail_discount: Joi.optional().default(0),
    offer_price: Joi.when("retail_price", {
      is: "retail_price",
      then: Joi.number().required(),
      otherwise: Joi.number().optional().default(0),
    }),
    description: Joi.string().required(),
    // label: Joi.string().optional().default(null),
    tag: Joi.array().optional().default([]),

    // readyToShip: Joi.boolean().optional().default(false),
    // images: Joi.optional(),
    image: Joi.array().items(Joi.string().required()).required(),
    category_id: Joi.array().optional().min(1),
    collection_id: Joi.array().optional().default([]),
    // attributeValue_id: Joi.array().optional().min(1),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().required(),
        attributeValue_id: Joi.string()
          // .items({
          //   id: Joi.string().required(),
          //   value: Joi.string().optional().allow("").default(""),
          // })
          .optional()
          .default([]),
        // value: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),
    size: Joi.array()
      .items({
        id: Joi.string().required(),
        price: Joi.number().required().default(0),
        quantity: Joi.number().required().default(0),
      })
      .optional()
      .default([]),
    stitching: Joi.boolean().optional().default(false),
    readyToShip: Joi.boolean().optional().default(false),
    isActive: Joi.boolean().optional().default(false),
    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
  });

  return schema;
};

const importCatalogue = async (req, res, next) => {
  const schema = Joi.object({
    category: Joi.array().items(Joi.string().required()).required(),
    collection: Joi.array().items(Joi.string()).optional(),
    catCode: Joi.string().optional(),
    productCode: Joi.string().optional(),
    productName: Joi.string()
      .when(
        Joi.object({
          catCode: Joi.exist(),
          productCode: Joi.exist(),
        }).unknown(),
        {
          then: Joi.required(),
          otherwise: Joi.forbidden(),
        }
      )
      .optional(),
    description: Joi.string().required(),
    noOfProduct: Joi.number().when("cat_code", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    quantity: Joi.number().required(),
    catalogueItemMarketPrice: Joi.number()
      .when("cat_code", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    catalogueDiscount: Joi.number()
      .when("cat_code", {
        is: Joi.exist(),
        then: Joi.optional().default(0),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    retailPrice: Joi.number()
      .when(
        Joi.object({
          showInSingle: Joi.valid(true),
          productCode: Joi.exist(),
        }).unknown(),
        {
          then: Joi.required().messages({
            "any.required":
              "retailPrice is required when showInSingle is true and productCode is available",
          }),
          otherwise: Joi.optional().default(0),
        }
      )

      .optional(),
    retailDiscount: Joi.number().optional(),
    showInSingle: Joi.boolean().optional().default(false),
    GST: Joi.number().optional(),
    metaTitle: Joi.string().optional(),
    metaKeyword: Joi.string().optional(),
    metaDescription: Joi.string().optional(),
    weight: Joi.number().optional(),
    tag: Joi.array().items().optional(),
    cat_image: Joi.string().when("catCode", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    image: Joi.array().items().optional(),
    isStitching: Joi.boolean().optional(),
    isSize: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  });

  return schema;
};

/** END CATALOGUE */

/** PRODUCT SCHEMA */

const productSchema = async (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().required(),
    catalogue_id: Joi.optional().allow(null).default(null),
    cat_code: Joi.string().optional(),
    sku: Joi.string().required(),
    url: Joi.string().optional().default(""),
    showInSingle: Joi.boolean().optional().default(false),
    quantity: Joi.number().required(),
    weight: Joi.number().required(),
    // price: Joi.number().required(),
    average_price: Joi.number().optional().default(0),
    retail_price: Joi.when("showInSingle", {
      is: true,
      then: Joi.number().required(),
      otherwise: Joi.number().optional().default(0),
    }),
    retail_GST: Joi.number().optional().default(0),
    retail_discount: Joi.optional().default(0),
    offer_price: Joi.when("retail_price", {
      is: "retail_price",
      then: Joi.number().required(),
      otherwise: Joi.number().optional().default(0),
    }),
    description: Joi.string().required(),
    // label: Joi.string().optional().default(null),
    tag: Joi.array().optional().default([]),

    // readyToShip: Joi.boolean().optional().default(false),
    images: Joi.optional(),
    image: Joi.array().optional(),
    category_id: Joi.array().optional().min(1),
    collection_id: Joi.array().optional().default([]),
    // attributeValue_id: Joi.array().optional().min(1),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().required(),
        attributeValue: Joi.array()
          .items({
            id: Joi.string().required(),
            value: Joi.string().optional().allow("").default(""),
          })
          .optional()
          .default([]),
        // value: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),

    productlabels: Joi.array()
      .items({
        id: Joi.string().required(),
        label: Joi.string().optional().allow("").default(""),
        date: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),

    size: Joi.array()
      .items({
        id: Joi.string().required(),
        price: Joi.number().required().default(0),
        quantity: Joi.number().required().default(0),
      })
      .optional()
      .default([]),

    colour_id: Joi.array().items(Joi.string()).optional().default([]),
    stitching: Joi.boolean().optional().default(false),
    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
  });
  return schema;
  // await JoiSchemaValidation(schema, req, next);
};

const productImageSchema = async (req, res, next) => {
  const schema = Joi.object({
    image: Joi.string().required(),
    id: Joi.string().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/**  END PRODUCT SCHEMA */

/** CONTACT DETAILS SCHEMA */

const contactDetailsSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    image: Joi.string().optional("").default(""),
    description: Joi.string().required(),
    isActive: Joi.boolean().optional().default(true),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END CONTACT DETAILS SCHEMA */

/** STITCHING OPTION  SCHEMA */
const stitchingMeasurementSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid("TextField", "Dropdown").required(),
    option_id: Joi.string().required(),
    range: Joi.when("type", {
      is: "TextField",
      then: Joi.string().required().messages({
        "any.required": "Range is required for type 'TextField'",
        "string.empty": "Range cannot be empty",
      }),
      otherwise: Joi.forbidden(),
    }),

    values: Joi.when("type", {
      is: "Dropdown",
      then: Joi.string().required().messages({
        "any.required": "Values is required for type 'Dropdown'",
        "string.empty": "Values cannot be empty",
      }),
      otherwise: Joi.forbidden(),
    }),

    isActive: Joi.boolean().optional().default(true),
  });

  await JoiSchemaValidation(schema, req, next);
};

/** END STITCHING OPTION  SCHEMA */

/** STITCHING OPTION  SCHEMA */

const stitchingOptionSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    category_id: Joi.string().required(),
    optionfield: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().optional(),
          name: Joi.string().required(),
          catalogue_price: Joi.number().min(0).required().default(0).allow(0),
          price: Joi.number().min(0).required().default(0).allow(0),
          type: Joi.string().valid("Redio", "CheckBox").required(),
          dispatch_time: Joi.string().optional().allow(""),
          isCustom: Joi.boolean().optional().default(false),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one option must be provided",
      }),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END STITCHING OPTION  SCHEMA */

/** STITCHING GROUP SCHEMA */

const stitchingGroupSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    category_id: Joi.string().required(),
    stitchingOption_id: Joi.array().items(Joi.string().required()).required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END STITCHING GROUP SCHEMA */

/** SINGLE STITCHING GROUP SCHEMA */

const singleStitchingSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    catalogue_price: Joi.number().required().default(0),
    price: Joi.number().required().default(0),
    type: Joi.string().valid("Redio", "CheckBox").required(),
    dispatch_time: Joi.string().optional().allow(""),
    stitchingGroup_id: Joi.string().required(),
    isCustom: Joi.boolean().optional().default(false),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END  SINGLE STITCHING GROUP SCHEMA */

/** COLLECTION SCHEMA */

const collectionSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    title: Joi.string().optional().default(""),
    meta_title: Joi.string().optional(),
    meta_keyword: Joi.string().optional(),
    meta_description: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    showInHome: Joi.boolean().optional(),
  });
  await JoiSchemaValidation(schema, req, next);
};
/** END COLLECTION SCHEMA */

/** ADD TO CART SCHEMA */

const cartSchema = async (req, res, next) => {
  const schema = Joi.object({
    product_id: Joi.string().optional(),
    catalogue_id: Joi.string().optional(),
    // user_id: Joi.string().required(),
    quantity: Joi.number().required(),
    stitching: Joi.array()
      .items({
        group_id: Joi.string().required(),
        options: Joi.array()
          .items({
            id: Joi.string().required(),
            price: Joi.string().optional(),
            dispatch_time: Joi.string().optional(),
            measurment_id: Joi.array().items({
              id: Joi.string().required(),
              value: Joi.string().required(),
            }),
          })
          .optional(),
      })
      .min(1)
      .messages({
        "array.min": "Please select at least one stitching option.",
      })
      .optional(),
    size: Joi.array()
      .items({
        id: Joi.string().required(),
        value: Joi.string().required(),
      })
      .optional(),
  })
    .xor("stitching", "size")
    .xor("catalogue_id", "product_id")
    .messages({
      "object.xor.stitching.size":
        "Both 'stitching' and 'size' cannot be provided together. Choose only one.",
      "object.xor.catalogue_id.product_id":
        "Both 'catalogue_id' and 'product_id' cannot be provided together. Choose only one.",
    });

  await JoiSchemaValidation(schema, req, next);
};

const editCartSchema = async (req, res, next) => {
  const schema = Joi.object({
    cartItem_id: Joi.string().required(),
    quantity: Joi.number().required(),
  });

  await JoiSchemaValidation(schema, req, next);
};

/** END ADD TO CART SCHEMA */

/** USER WISH LIST */

const wishListSchema = async (req, res, next) => {
  const schema = Joi.object({
    product_id: Joi.string().optional(),
    catalogue_id: Joi.string().optional(),
  })
    .xor("product_id", "catalogue_id")
    .messages({
      "object.xor": "Please provide either product or catalogue, but not both.",
    });
  await JoiSchemaValidation(schema, req, next);
};

/** END USER WISH LIST */

/** NEWS LETTER */

const newsLetterSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END NEWS LETTER */

/** USER CHANGE PASSWORD */

const userchangePasswordSchema = async (req, res, next) => {
  const schema = Joi.object({
    oldPassword: Joi.string().required().messages({
      "any.required": "Old password is required.",
    }),
    newPassword: Joi.string().required().messages({
      "any.required": "new password is required.",
    }),
    user_id: Joi.string().required().messages({
      "any.required": "user id is required.",
    }),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END USER CHANGE PASSWORD  */

/** USER CHANGE PASSWORD */

const updateUserbasicInfoSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().messages({
      "any.required": "name is required.",
    }),
    mobile_number: Joi.number().required().messages({
      "any.required": "Mobile number is required.",
      "number.min": "Mobile number must be at least 10 digits long.",
    }),
    user_id: Joi.string().required().messages({
      "any.required": "user id is required.",
    }),
  });
  await JoiSchemaValidation(schema, req, next);
};

/** END USER CHANGE PASSWORD  */

/** USER RESET PASSWORD */
const resetPasswordUsersSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters.",
      "any.required": "Password is required.",
    }),
    otp: Joi.string().required().messages({
      "any.required": "OTP is required.",
    }),
    secret: Joi.string().required().messages({
      "any.required": "Secret code is required.",
    }),
  });

  await JoiSchemaValidation(schema, req, next);
};
/** USER RESET PASSWORD */

const shippingchargesSchema = async (req, res, next) => {
  const schema = Joi.object({
    country: Joi.string().required(),
    type: Joi.string().valid("weight", "pcs").required(),
    from: Joi.string().when("type", {
      is: "weight",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    to: Joi.string().when("type", {
      is: "weight",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    pcs: Joi.string().when("type", {
      is: "pcs",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    amount: Joi.number().required(),
  });

  await JoiSchemaValidation(schema, req, next);
};

const paymentMethodsSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    keyId: Joi.string().optional().allow("").default(""),
    secretKey: Joi.string().optional().allow("").default(""),
    image: Joi.string().optional().default("").allow(""),
    charge: Joi.number().optional().default(0),
    description: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  });
  await JoiSchemaValidation(schema, req, next);
};

export {
  categorySchema,
  subCategorySchema,
  currencySchema,
  attributeMasterSchema,
  loginSchema,
  resetAdminSchema,
  verifyAdminSchema,
  resetPasswordAdminSchema,
  registerSchema,
  pageSchema,
  changePasswordSchema,
  attributeValueSchema,
  attributeValuePageSchema,
  cmsSchema,
  homeBannerSchema,
  positionSchema,
  testimonialSchema,
  socialMediaIconSchema,
  pageWiseBannerSchema,
  emailSettingSchema,
  emailTemplateSchema,
  menuSchema,
  colourSchema,
  subMenuCollectionSchema,
  catalogueSchema,
  productSchema,
  productImageSchema,
  contactDetailsSchema,
  labelSchema,
  verifyOtpSchema,
  sizeSchema,
  stitchingGroupSchema,
  stitchingOptionSchema,
  stitchingMeasurementSchema,
  singleStitchingSchema,
  collectionSchema,
  cartSchema,
  editCartSchema,
  wishListSchema,
  newsLetterSchema,
  userchangePasswordSchema,
  resetPasswordUsersSchema,
  updateUserbasicInfoSchema,
  importCatalogueSchema,
  importProductSchema,
  importCatalogue,
  shippingchargesSchema,
  paymentMethodsSchema,
};
