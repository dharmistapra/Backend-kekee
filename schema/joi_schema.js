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
    code: Joi.string()
      .length(3)
      .uppercase()
      .regex(/^[A-Z]{3}$/)
      .required()
      .messages({
        "string.empty": "Code is required",
        "string.length":
          "Code must be exactly three uppercase letters (e.g., USD, EUR)",
        "string.pattern.base": "Code must contain only uppercase letters (A-Z)",
        "any.required": "Code is required",
      }),

    rate: Joi.number().positive().required().messages({
      "number.base": "Rate must be a valid number",
      "number.positive": "Rate must be a positive number",
      "any.required": "Rate is required",
    }),

    symbol: Joi.string().required().messages({
      "string.empty": "Symbol is required",
      "any.required": "Symbol is required",
    }),

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
    name: Joi.string()
      .pattern(new RegExp("^[A-Za-z\\s]+$"))
      .required()
      .messages({
        "string.pattern.base": "Name must contain only letters and spaces",
        "any.required": "Name is required",
      }),
    mobile_number: Joi.string()
      .pattern(new RegExp("^[0-9]{10,15}$"))
      .required()
      .messages({
        "string.pattern.base":
          "Mobile number must be 10-15 digits long and contain only numbers",
        "any.required": "Mobile number is required",
      }),
    email: Joi.string()
      .email()
      // .pattern(new RegExp("^[a-zA-Z0-9._%+-]+@gmail\\.com$"))
      .required()
      .messages({
        "string.pattern.base": "Enter a valid email address",
        "any.required": "Email is required",
      }),
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

const OtpSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      // .pattern(new RegExp("^[a-zA-Z0-9._%+-]+@gmail\\.com$"))
      .required()
      .messages({
        "string.pattern.base": "Enter a valid email address",
        "any.required": "Email is required",
      }),
  });

  await JoiSchemaValidation(schema, req, next);
};

const loginSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      // .pattern(new RegExp("^[a-zA-Z0-9._%+-]+@gmail\\.com$"))
      .required()
      .messages({
        "string.pattern.base": "Enter a valid email address",
        "any.required": "Email is required",
      }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
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
    meta_title: Joi.string().required().allow(""),
    meta_keyword: Joi.string().required().allow(""),
    meta_description: Joi.string().required().allow(""),
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
    value: Joi.string()
      .pattern(/^(?=.*[a-zA-Z])[a-zA-Z0-9 ]+$/)
      .required()
      .messages({
        "string.pattern.base":
          "Value must contain at least one letter and cannot have special characters.",
        "string.empty": "Value is required.",
      }),
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
    optionType: Joi.string().valid("Stitching", "Size", "Other").required(),
    // stitching: Joi.boolean().optional().default(false),
    // size: Joi.boolean().optional().default(false),
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
    sizes: Joi.when("optionType", {
      is: "Size",
      then: Joi.array()
        .items({
          id: Joi.string().required(),
          price: Joi.number().required().default(0),
          quantity: Joi.number().required().default(0),
        })
        .min(1)
        .required(),
      otherwise: Joi.forbidden(),
    }),
    meta_title: Joi.string().optional().default(""),
    meta_keyword: Joi.string().optional().default(""),
    meta_description: Joi.string().optional().default(""),
    coverImage: Joi.any(),
    // mobileImage: Joi.any(),
    description: Joi.string().required(),
    tag: Joi.array().items(Joi.string().required()).required(),
    isActive: Joi.boolean().optional().default(true),
    isApply: Joi.boolean().optional().default(false),
    product: Joi.array()
      .items({
        id: Joi.string().required(),
        name: Joi.string().required(),
        average_price: Joi.number().required(),
        retail_price: Joi.number().required(),
        // sizes: Joi.when("size", {
        //   is: true,
        //   then: Joi.array()
        //     .items({
        //       id: Joi.string().required(),
        //       price: Joi.number().required().default(0),
        //       quantity: Joi.number().required().default(0),
        //     })
        //     .min(1)
        //     .required(),
        //   otherwise: Joi.forbidden(),
        // }),
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
    // stitching: Joi.boolean()
    //   .required()
    //   .messages({ "any.required": "isStitching is required!" }),
    // size: Joi.boolean()
    //   .required()
    //   .messages({ "any.required": "isSize is required!" }),
    optionType: Joi.string().valid("Stitching", "Size", "Other").required(),
    size: Joi.when("optionType", {
      is: "Size",
      then: Joi.array().items({
        id: Joi.string().required(),
        quantity: Joi.number().required().default(0),
        price: Joi.number().required().default(0),
      }),
      otherwise: Joi.forbidden(),
    }),
    weight: Joi.number().required(),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().allow("").required(),
        attributeValue_id: Joi.string()
          .allow("")
          // .items({
          //   id: Joi.string().required(),
          //   value: Joi.string().optional().allow("").default(""),
          // })
          .required(),
        // .default([]),
        // value: Joi.string().optional().allow("").default(""),
      })
      .optional()
      .default([]),
    meta_title: Joi.string().optional().default(""),
    meta_keyword: Joi.string().optional().default(""),
    meta_description: Joi.string().optional().default(""),
    coverImage: Joi.string().required().messages({
      "string.empty": "cat_image can not be empty!",
      "any.required": "cat_image is required!",
    }),
    // mobileImage: Joi.any(),
    description: Joi.string().required(),
    tag: Joi.array().items(Joi.string().required()).required(),
    isActive: Joi.boolean().required(),
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
          attribute_id: Joi.string().allow("").required(),
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
      optionType: Joi.string().valid("Stitching", "Size", "Other").required(),
      size: Joi.when("optionType", {
        is: "Size",
        then: Joi.array()
          .items({
            id: Joi.string().allow("").required(),
            price: Joi.number().required().default(0),
            quantity: Joi.number().required().default(0),
          })
          .required(),
        otherwise: Joi.forbidden(),
      }),
      // .default([]),
      // stitching: Joi.boolean().optional().default(false),
      meta_title: Joi.string().optional().allow("").default(""),
      meta_keyword: Joi.string().optional().allow("").default(""),
      meta_description: Joi.string().optional().allow("").default(""),
      product: Joi.array().items().optional(),
    }),
  });
  // .custom((value, helpers) => {
  //   // If both stitching and size are true or both are false, return an error
  //   if (value.stitching === value.size) {
  //     return helpers.message(
  //       "Stitching and Size cannot both be true or both be false. Choose only one!"
  //     );
  //   }
  //   return value;
  // });

  return schema;
};

const importProductSchema = async (req, res, next) => {
  const schema = Joi.object({
    // id: Joi.string().optional(),
    category: Joi.array().items().optional(),
    collection: Joi.array().items().optional(),
    name: Joi.string().required(),
    // catalogue_id: Joi.optional().allow(null).default(null),
    sku: Joi.string().required(),
    url: Joi.string().optional(),
    showInSingle: Joi.boolean().required(),
    cat_code: Joi.string().when("showInSingle", {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow("").optional(),
    }),
    quantity: Joi.number().required(),
    weight: Joi.number().required(),
    // price: Joi.number().required(),
    average_price: Joi.number().optional().default(0),
    retail_price: Joi.number()
      .required()
      .messages({ "any.required": "retail Price is required!" })
      .when("showInSingle", {
        is: true,
        then: Joi.number().required().greater(0).messages({
          "any.greater":
            "retail_price must be greater than 0 when showInSingle is true!",
        }),
        otherwise: Joi.number().optional(),
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
    image: Joi.any().required().empty("").messages({
      "string.empty": "Image cannot be empty!",
      "any.required": "Image is required!",
    }),
    category_id: Joi.array().optional().min(1),
    collection_id: Joi.array().optional().default([]),
    // attributeValue_id: Joi.array().optional().min(1),
    attributes: Joi.array()
      .items({
        attribute_id: Joi.string().allow("").required(),
        attributeValue_id: Joi.string()
          .allow("")
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
    optionType: Joi.string().valid("Stitching", "Size", "Other").required(),
    size: Joi.when("optionType", {
      is: "Size",
      then: Joi.array()
        .items({
          id: Joi.string().allow("").required(),
          price: Joi.number().required().default(0),
          quantity: Joi.number().required().default(0),
        })
        .required(),
      otherwise: Joi.forbidden(),
    }),
    // stitching: Joi.boolean().required(),
    readyToShip: Joi.boolean().optional().default(false),
    isActive: Joi.boolean().required(),
    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
    relatedProduct: Joi.array().items(Joi.string()).optional(),
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
    optionType: Joi.string().valid("Stitching", "Size", "Other").required(),
    // isSize: Joi.boolean().optional().default(false),
    size: Joi.when("optionType", {
      is: "Size",
      then: Joi.array()
        .items({
          id: Joi.string().required(),
          price: Joi.number().required().default(0),
          quantity: Joi.number().required().default(0),
        })
        .required(),
      otherwise: Joi.forbidden(),
    }),
    // array()
    // .items({
    //   id: Joi.string().required(),
    //   price: Joi.number().required().default(0),
    //   quantity: Joi.number().required().default(0),
    // })
    // .optional()
    // .default([]),

    colour_id: Joi.array().items(Joi.string()).optional().default([]),
    // stitching: Joi.when("optionType", {
    //   is: "Stitching",
    //   then: Joi.boolean().required().default(false),
    //   otherwise: Joi.forbidden(),
    // }),

    meta_title: Joi.string().optional().allow("").default(""),
    meta_keyword: Joi.string().optional().allow("").default(""),
    meta_description: Joi.string().optional().allow("").default(""),
    relatedProduct: Joi.array().items(Joi.string()).optional().default([]),
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
    user_id: Joi.string().required(),
    catalogue_id: Joi.string().optional(),
    // user_id: Joi.string().required(),
    quantity: Joi.number().required(),
    // stitching: Joi.array()
    //   .items({
    //     group_id: Joi.string().required(),
    //     options: Joi.array()
    //       .items({
    //         id: Joi.string().required(),
    //         price: Joi.string().optional(),
    //         dispatch_time: Joi.string().optional(),
    //         measurment_id: Joi.array().items({
    //           id: Joi.string().required(),
    //           value: Joi.string().required(),
    //         }),
    //       })
    //       .optional(),
    //   })
    //   .min(1)
    //   .messages({
    //     "array.min": "Please select at least one stitching option.",
    //   })
    //   .optional(),

    stitching: Joi.array().optional(),
    size: Joi.object({
      id: Joi.string().required(),
      value: Joi.string().required(),
    }).optional(),
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

const orderPlaceSchema = async (req, res, next) => {
  const schema = Joi.object({
    user_id: Joi.string().required().messages({
      "any.required": "User ID is required",
      "string.empty": "User ID cannot be empty",
    }),
    isSame: Joi.boolean().optional().messages({
      "any.required": "isSame is required",
      "string.empty": "isSame cannot be empty",
    }),
    shippingPrice: Joi.number().required().messages({
      "any.required": "shippingPrice is required",
      "string.empty": "shippingPrice cannot be empty",
    }),
    paymentMethod: Joi.string().required().messages({
      "any.required": "Payment Method is required",
      "string.empty": "Payment Method cannot be empty",
      "string.base": "Payment Method must be a string",
    }),
    bankdata: Joi.object().when("paymentMethod", {
      is: "bank",
      then: Joi.object({
        bankName: Joi.string().required().messages({
          "any.required": "Bank Name is required",
          "string.empty": "Bank Name cannot be empty",
        }),
        accountHolderName: Joi.string().required().messages({
          "any.required": "Account Holder Name is required",
          "string.empty": "Account Holder Name cannot be empty",
        }),
        accountNumber: Joi.string().required().messages({
          "any.required": "Account Number is required",
          "string.empty": "Account Number cannot be empty",
        }),
        ifscCode: Joi.string().required().messages({
          "any.required": "IFSC Code is required",
          "string.empty": "IFSC Code cannot be empty",
        }),
      }),
      otherwise: Joi.object({
        bankName: Joi.string().optional(),
        accountHolderName: Joi.string().optional(),
        accountNumber: Joi.string().optional(),
        ifscCode: Joi.string().optional(),
      }),
    }),
    // shippingId: Joi.string().optional(),
    // billingId: Joi.string().optional(),
    type: Joi.string().required(),

    billingdata: Joi.object({
      id: Joi.string().optional(),
      GstNumber: Joi.string().optional().allow(""),
      address1: Joi.string().optional().allow(""),
      address2: Joi.string().optional().allow(""),
      companyname: Joi.string().optional().allow(""),
      city: Joi.string().optional().allow(""),
      country: Joi.string().optional().allow(""),
      customersnotes: Joi.string().optional().allow(""),
      email: Joi.string()
        .email()
        // .pattern(new RegExp("^[a-zA-Z0-9._%+-]+@gmail\\.com$"))
        .required()
        .messages({
          "string.pattern.base": "Enter a valid email address",
          "any.required": "Email is required",
        }),

      fullName: Joi.string().required().messages({
        "any.required": "Full Name is required",
        "string.empty": "Full Name cannot be empty",
      }),
      mobile: Joi.string().required().messages({
        "any.required": "Mobile number is required",
        "string.empty": "Mobile number cannot be empty",
      }),
      state: Joi.string().optional(),
      whatsapp: Joi.string().optional().allow(""),
      zipCode: Joi.string().optional(),
    }).when("defaultAddressId", {
      is: Joi.exist(),
      then: Joi.forbidden().messages({
        "any.unknown":
          "Billing form cannot be provided when defaultAddressId is present",
      }),
    }),

    shippingdata: Joi.object({
      id: Joi.string().optional(),
      GstNumber: Joi.string().optional().allow(""),
      customersnotes: Joi.string().optional().allow(""),
      address1: Joi.string().optional().allow(""),
      address2: Joi.string().optional().allow(""),
      companyname: Joi.string().optional().allow(""),
      city: Joi.string().required(),
      country: Joi.string().required().messages({
        "any.required": "Country is required",
        "string.empty": "Country cannot be empty",
      }),

      email: Joi.string().email().optional(),
      whatsapp: Joi.string().optional().allow(""),

      fullName: Joi.string().required().messages({
        "any.required": "Full Name is required",
        "string.empty": "Full Name cannot be empty",
      }),
      mobile: Joi.string().required().messages({
        "any.required": "Mobile number is required",
      }),
      state: Joi.string().required().messages({
        "any.required": "state is required",
        "string.empty": "state cannot be empty",
      }),
      zipCode: Joi.string().required().messages({
        "any.required": "Zip Code is required",
        "string.empty": "Zip Code cannot be empty",
      }),
    }).when("defaultAddressId", {
      is: Joi.exist(),
      then: Joi.forbidden().messages({
        "any.unknown":
          "Shipping data cannot be provided when defaultAddressId is present",
      }),
    }),

    currency: Joi.object({
      code: Joi.string().required().messages({
        "any.required": "currency code is required",
        "string.empty": "currency code cannot be empty",
      }),
      flag: Joi.string().optional(),
      rate: Joi.number().required().messages({
        "any.required": "Rate is required",
        "number.base": "Rate must be a number",
      }),
    }),
  });

  await JoiSchemaValidation(schema, req, next);
};

const contactUsSchema = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobile_number: Joi.number().required(),
    subject: Joi.string().required(),
    message: Joi.string().required(),
  });

  await JoiSchemaValidation(schema, req, next);
};

const postaddressSchema = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      // .pattern(new RegExp("^[a-zA-Z0-9._%+-]+@gmail\\.com$"))
      .required()
      .messages({
        "string.pattern.base": "Enter a valid email address",
        "any.required": "Email is required",
      }),
    fullName: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.pattern.base": "Full name must contain only letters and spaces",
        "any.required": "Full name is required",
      }),

    country: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.pattern.base": "Country name must contain only letters",
        "any.required": "Country is required",
      }),

    state: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.pattern.base": "state must contain only letters",
        "any.required": "state is required",
      }),

    city: Joi.string()
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.pattern.base": "city must contain only letters",
        "any.required": "city is required",
      }),

    zipCode: Joi.string()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Zip code must be exactly 6 digits",
        "any.required": "Zip code is required",
      }),

    address1: Joi.string().required().messages({
      "any.required": "Address 1 is required",
    }),

    address2: Joi.string().allow("").messages({
      "string.empty": "Address 2 is optional",
    }),

    companyname: Joi.string()
      .pattern(/^[A-Za-z0-9\s]+$/)
      .allow("")
      .messages({
        "string.pattern.base": "Company name must contain only letters",
        "any.required": "Company name is required",
      }),

    GstNumber: Joi.string()
      .pattern(/^\d{15}$/)
      .allow("")
      .messages({
        "string.pattern.base":
          "GST Number must be exactly 15 digits and contain only numbers",
        "any.required": "GST Number is required",
      }),

    mobile: Joi.string()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        "string.pattern.base": "Mobile number must be exactly 10 digits",
        "any.required": "Mobile number is required",
      }),

    whatsapp: Joi.string()
      .pattern(/^\d{10}$/)
      .allow("", null)
      .messages({
        "string.pattern.base": "WhatsApp number must be exactly 10 digits",
        "any.required": "WhatsApp number is required",
      }),

    user_id: Joi.string().required().messages({
      "any.required": "User ID is required",
      "number.base": "User ID must be a number",
    }),

    id: Joi.string().optional().allow("", null).messages({
      "any.required": " ID is option",
    }),

    isDefault: Joi.boolean().optional().messages({
      "boolean.base": "isDefault must be a boolean value",
    }),

    defaultBilling: Joi.boolean().optional().messages({
      "boolean.base": "defaultBilling must be a boolean value",
    }),

    defaultShipping: Joi.boolean().optional().messages({
      "boolean.base": "defaultShipping must be a boolean value",
    }),
  });
  await JoiSchemaValidation(schema, req, next);
};

const webSettingSchema = async (req, res, next) => {
  const schema = Joi.object({
    headerLogo: Joi.string(),
    footerLogo: Joi.string(),
    favIcon: Joi.string(),
    address: Joi.string().required(),
    interNationalNumber: Joi.string().optional(),
    domesticNumber: Joi.string().optional(),
    complaintNumber: Joi.string().optional(),
    email: Joi.string().email().required(),
    skypeId: Joi.string().optional(),
    timing: Joi.string().optional(),
    mapUrl: Joi.string().required(),
    notification: Joi.string().optional(),
    happyToHelp: Joi.object({
      title: Joi.string().required(),
      subTitle: Joi.string().optional().allow(""),
    }).required(),
    showProductCount: Joi.number().required(),
    showPrice: Joi.boolean().required(),
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
  orderPlaceSchema,
  contactUsSchema,
  OtpSchema,
  postaddressSchema,
  webSettingSchema,
};
