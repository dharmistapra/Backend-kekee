import express from "express";
const adminRouter = express.Router();
import {
  postCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  categoryPagination,
  categoryPosition,
  getSubCategory,
  deleteCategoryImage,
  getAllParentCategory,
  getAllCategories,
  updateCategoryShowInHomeStatus,
} from "../controller/admin/category/category.js";
import {
  attributeMasterSchema,
  pageSchema,
  attributeValuePageSchema,
  attributeValueSchema,
  categorySchema,
  changePasswordSchema,
  cmsSchema,
  currencySchema,
  subCategorySchema,
  homeBannerSchema,
  testimonialSchema,
  socialMediaIconSchema,
  pageWiseBannerSchema,
  emailSettingSchema,
  positionSchema,
  emailTemplateSchema,
  menuSchema,
  colourSchema,
  subMenuCollectionSchema,
  catalogueSchema,
  contactDetailsSchema,
  productImageSchema,
  labelSchema,
  sizeSchema,
  stitchingOptionSchema,
  stitchingMeasurementSchema,
  stitchingGroupSchema,
  singleStitchingSchema,
  collectionSchema,
  shippingchargesSchema,
  paymentMethodsSchema,
  webSettingSchema,
  shippingMethodSchema,
  shippingZoneSchema,
  shippingRateSchema,
} from "../schema/joi_schema.js";
import {
  getAllSubCategory,
  postSubCategory,
  subCategoryPagination,
} from "../controller/admin/category/subCategory.js";
import {
  postCurrency,
  updateCurrency,
  updateCurrencyStatus,
  deleteCurrency,
  paginationCurrency,
  getAllCurrency,
} from "../controller/admin/currency.js";
import {
  uploadcurrencyImg,
  uploadtestimonialImg,
  data,
  uploadProductImges,
  uploadCategorystorageImg,
  collectionImages,
  uploadShippingChagresCSV,
} from "../middleware/uploads.js";
import {
  deleteAttribute,
  getAllAttribute,
  getAllAttributePagination,
  getDefaultAttributes,
  postAttribute,
  updateAttribute,
  updateAttributeFilterStatus,
  updateAttributeStatus,
} from "../controller/admin/attribute/attributeKey.js";
import {
  deletAttributeValue,
  getAllAttributeValue,
  getAttributeValuePagination,
  postAttributeValue,
  updateAttributeValue,
  updateAttributeValueStatus,
} from "../controller/admin/attribute/attributeValue.js";
import { changePassword } from "../auth/auth.js";
import {
  cmsPosition,
  cmsStatus,
  deleteCms,
  getAllCms,
  paginationCms,
  postCms,
  updateCms,
} from "../controller/admin/cms.js";
import {
  deleteHomeBanner,
  deleteHomeBannerImage,
  homeBannerPosition,
  paginationHomeBanner,
  postHomeBanner,
  updateHomeBanner,
  updateHomeBannerStatus,
} from "../controller/admin/homeBanner.js";
import {
  deleteTestimonial,
  filterTestimonial,
  paginationTestimonial,
  postTestimonial,
  testimonialPosition,
  updateTestimonial,
  updateTestimonialStatus,
} from "../controller/admin/testimonials.js";
import {
  deleteSocialMedia,
  paginationSocialMedia,
  postSocialMedia,
  updateSocialMedia,
  updateSocialMediaStatus,
} from "../controller/admin/socialMediaIcon.js";
import {
  deletePageWiseBanner,
  paginationPageWiseBanner,
  postPageWiseBanner,
  updatePageWiseBanner,
  updatePageWiseBannerStatus,
} from "../controller/admin/pageWiseBanner.js";
import {
  deleteEmailSetting,
  getEmailSetting,
  postEmailSetting,
} from "../controller/admin/emailSetting.js";
import {
  deleteEmailTemplate,
  paginationEmailTemplate,
  postEmailTemplate,
  updateEmailTemplate,
} from "../controller/admin/emailTemplate.js";
import {
  deleteMenu,
  getAllMenu,
  getAllOnlyMenu,
  getMenus,
  menuPagination,
  menuPosition,
  postMenu,
  updateMenu,
  updateMenuStatus,
} from "../controller/admin/menu/menu.js";
import {
  deleteColour,
  getAllColour,
  paginationColour,
  postColour,
  updateColour,
  updateColourStatus,
} from "../controller/admin/colour.js";
import {
  deleteSubMenuCollection,
  getAllParentSubMenuCollection,
  postSubMenuCollection,
  subMenuCollectionPagination,
  subMenuCollectionPosition,
  updateSubMenuCollection,
  updateSubMenuCollectionStatus,
} from "../controller/admin/subMenuCollection.js";
import {
  paginationCatalogue,
  postCatalogue,
  updateCatalogue,
  updateCatalogueStatus,
} from "../controller/admin/catalogue.js";
import {
  deleteProductImage,
  deleteReatailProduct,
  getAllReatialProduct,
  paginationReatilProduct,
  postCatalogueProduct,
  postRetailProduct,
  updateReatailProductStatus,
  updateRetailProduct,
} from "../controller/admin/product/product.js";
import {
  deleteContactDetails,
  deleteContactDetailsImage,
  paginationContactDetails,
  postContactDetail,
  updateContactDetails,
  updateContactDetailsStatus,
} from "../controller/admin/contactDetails.js";
import {
  arrayProducts,
  getArrayOfProducts,
  removeArrayOfProduct,
  removeArrayOfProducts,
} from "../controller/admin/product/tempData.js";
import HandleChunkData, {
  postCatalogueChunk,
} from "../controller/admin/product/chunk.js";
import {
  addCatalogue,
  catlogtGetSingleProduct,
  deleteCatlogProduct,
  draftProdcutRemove,
  getCatalogueProduct,
  getCatalogueProducts,
  postCatlogProduct,
  updateCatalogueProduct,
  deleteCatalogue,
  restoreCatalogues,
  restoreCatalogue,
  restoreDeleteCatalogue,
} from "../controller/admin/catalogue/catalogue.js";
import {
  deleteLabels,
  getAllLabels,
  labelstatus,
  postLabels,
  updatelabels,
} from "../controller/admin/label.js";
import {
  deleteSize,
  getAllSizes,
  paginationSize,
  postSize,
  sizeStatus,
  sortingSizes,
  updateSize,
} from "../controller/admin/size.js";

// import {
//   // deleteStitchingGroup,
//   // deletetStitchingGroup,
//   // deletetStitchingOption,
//   // findgroupStitching,
//   // getAllStitchingOption,
//   // paginationStitchingOption,
//   // postSingleStitchingOption,
//   // postStitchingMeasurement,
//   // postStitchingOption,
//   // putSingleStitchingOption,
//   // putStitchingOption,
//   // stitchingOptionStatus,
// } from "../Controller/Admin/stitching/option.js";
// import {
//   getStitchingGroup,
//   paginationStitchingGroup,
//   postStitchingGroup,
//   updateStitchingGroup,
// } from "../controller/admin/stitching/stitchingGroup.js";
// import { changeOptionMeasurementStatus, deleteOptionMeasurement, getOptionMeasurement, postOptionMeasurement, putOptionMeasurement } from "../Controller/Admin/stitching/measurement.js";
import {
  deletegroupstitching,
  getAllgroupstitching,
  paginationgroupstitching,
  postgroupstitching,
  putgroupstitching,
} from "../controller/admin/stitching/group.js";
import {
  deleteOptionByGroupingId,
  getOptionByGroupingId,
  optionStatusChange,
  postOptionByGroupingId,
  putOptionByGroupingId,
} from "../controller/admin/stitching/option.js";
import {
  changeOptionMeasurementStatus,
  deleteOptionMeasurement,
  getOptionMeasurement,
  postOptionMeasurement,
  putOptionMeasurement,
} from "../controller/admin/stitching/measurement.js";
import {
  collectionPagination,
  collectionPosition,
  deleteCollection,
  getAllCollection,
  postCollection,
  updateCollection,
  updateCollectionStatus,
} from "../controller/admin/collection.js";
import {
  deleteNewsLetter,
  getNewsLetter,
} from "../controller/public/newsLetter.js";
import {
  getOrderdetailsUsers,
  getOrderHistoryusers,
  paginationusers,
  updateOrderStatus,
  updateUsersStatus,
} from "../controller/admin/users.js";
import {
  exportCatalogue,
  // importCatalogue,
  importCatalogues,
  zipImages,
} from "../controller/admin/catalogue/importSheet.js";
import {
  countrylistGroup,
  deleteShippingcharges,
  paginationShippingcharges,
  postShippingcharges,
  updateShippingcharges,
  uploadShippingChargeCSV,
} from "../controller/admin/shippingcharges.js";
import {
  collectionToProduct,
  deleteCollectionbyId,
  getAllNewCollection,
  paginationAllCollection,
  paginationCollectionProduct,
  romoveProductInCollection,
  searchCollection,
  updateAllcollection,
  updateNewCollectionIsHome,
  updateNewCollectionStatus,
  uploadImages,
} from "../controller/admin/newCollection.js";
import {
  deletePaymentMethod,
  deletePaymentMethodImage,
  getPaymentMethod,
  paymentMethodPosition,
  paymentMethodStatus,
  postPaymentMethod,
  updatePaymentMethod,
} from "../controller/admin/paymentMethod.js";
import { getOrderHistory } from "../controller/public/orderHistory.js";
import { getAllSingleProductInventory } from "../controller/admin/inventory.js";
import {
  deleteContactUs,
  getAllContactUs,
} from "../controller/admin/contactUs.js";
import {
  getWebSetting,
  postWebSetting,
} from "../controller/admin/webSetting.js";
import {
  deleteShippingMethod,
  getShippingMethod,
  postShippingMethod,
  shippingMethodStatus,
  updateShippingMethod,
} from "../controller/admin/shippingMethod.js";
import {
  deleteShippingZone,
  getShippingZone,
  postShippingZone,
  updateShippingZone,
} from "../controller/admin/shippingZone.js";
import {
  importShippingRate,
  postShippingRate,
} from "../controller/admin/shippingRate.js";

/* GET home page. */
adminRouter.get("/", function (req, res, next) {
  return res
    .status(200)
    .json({ isSuccess: true, message: "data Fetch Successfully." });
});

// CATEGORY API  []==>MIDDLEWARE AND CONTROLLER
adminRouter.post(
  "/category",
  [uploadCategorystorageImg, categorySchema],
  postCategory
);
adminRouter.put(
  "/category/:id",
  [uploadCategorystorageImg, categorySchema],
  updateCategory
);
adminRouter.delete("/category/:id", deleteCategory);
adminRouter.get("/category", getAllParentCategory);

adminRouter.get("/all-category", getAllParentCategory);
adminRouter.get("/mixed-category", getAllCategories);

adminRouter.get("/category-status/:id", updateCategoryStatus);
adminRouter.post("/category-pagination", categoryPagination);
adminRouter.post("/category-position", [positionSchema], categoryPosition);
adminRouter.get("/category/:id", getSubCategory);
adminRouter.post("/category-image/:id", deleteCategoryImage);
adminRouter.get("/category-home-status/:id", updateCategoryShowInHomeStatus);

// SUBCATEGORY API HANDLE
adminRouter.post("/sub-category", [subCategorySchema], postSubCategory);
adminRouter.get("/sub-category/:parent_id", getAllSubCategory);
adminRouter.get("/sub-category-pagination/:parent_id", subCategoryPagination);

// CURRENCY API
adminRouter.post(
  "/currency",
  [uploadcurrencyImg, currencySchema],
  postCurrency
);
adminRouter.put(
  "/currency/:id",
  [uploadcurrencyImg, currencySchema],
  updateCurrency
);
adminRouter.get("/currency-status/:id", updateCurrencyStatus);
adminRouter.delete("/currency/:id", deleteCurrency);
adminRouter.post("/currency-pagination", [pageSchema], paginationCurrency);
adminRouter.get("/currency", getAllCurrency);

// ATTRIBUTE MASTER API HANDLE
adminRouter.post("/attribute", [attributeMasterSchema], postAttribute);
adminRouter.put("/attribute/:id", [attributeMasterSchema], updateAttribute);
adminRouter.delete("/attribute/:id", deleteAttribute);
adminRouter.get("/attribute-status/:id", updateAttributeStatus);
adminRouter.get("/attribute-filterstatus/:id", updateAttributeFilterStatus);
adminRouter.get("/attribute", getAllAttribute);
adminRouter.post("/default-attribute", getDefaultAttributes);
adminRouter.post(
  "/attribute-pagination",
  [pageSchema],
  getAllAttributePagination
);

// ATTRIBUTE MASTER API HANDLE
adminRouter.post(
  "/attribute-value",
  [attributeValueSchema],
  postAttributeValue
);
adminRouter.put(
  "/attribute-value/:id",
  [attributeValueSchema],
  updateAttributeValue
);
adminRouter.delete("/attribute-value/:id", deletAttributeValue);
adminRouter.get("/attribute-value-status/:id", updateAttributeValueStatus);
adminRouter.get("/attribute-value/:id", getAllAttributeValue);
adminRouter.post(
  "/attribute-pagination-value",
  [attributeValuePageSchema],
  getAttributeValuePagination
);

adminRouter.post("/changePassword", [changePasswordSchema], changePassword);

// CMS API
adminRouter.post("/cms", [cmsSchema], postCms);
adminRouter.put("/cms/:id", [cmsSchema], updateCms);
adminRouter.delete("/cms/:id", deleteCms);
adminRouter.get("/cms-status/:id", cmsStatus);
adminRouter.post("/cms-pagination", paginationCms);
adminRouter.post("/cms-position", [positionSchema], cmsPosition);

// HOME BANNER API
adminRouter.post(
  "/homebanner",
  [data.uploadHomeBanner, homeBannerSchema],
  postHomeBanner
);
adminRouter.put(
  "/homebanner/:id",
  [data.uploadHomeBanner, homeBannerSchema],
  updateHomeBanner
);
adminRouter.delete("/homebanner/:id", deleteHomeBanner);
adminRouter.get("/homebanner-status/:id", updateHomeBannerStatus);
adminRouter.post("/homebanner-pagination", [pageSchema], paginationHomeBanner);
adminRouter.post("/homebanner-position", [positionSchema], homeBannerPosition);
adminRouter.delete("/homebanner-image/:id", deleteHomeBannerImage);

// TESTIMONIAL API
adminRouter.post(
  "/testimonial",
  [uploadtestimonialImg, testimonialSchema],
  postTestimonial
);
adminRouter.put(
  "/testimonial/:id",
  [uploadtestimonialImg, testimonialSchema],
  updateTestimonial
);
adminRouter.delete("/testimonial/:id", deleteTestimonial);
adminRouter.get("/testimonial-status/:id", updateTestimonialStatus);
adminRouter.post("/filter-testimonial", filterTestimonial);
adminRouter.post(
  "/testimonial-pagination",
  [pageSchema],
  paginationTestimonial
);
adminRouter.post(
  "/testimonial-position",
  [positionSchema],
  testimonialPosition
);

// SOCIAL MEDIA ICON
adminRouter.post("/socialmedia", [socialMediaIconSchema], postSocialMedia);
adminRouter.put("/socialmedia/:id", [socialMediaIconSchema], updateSocialMedia);
adminRouter.delete("/socialmedia/:id", deleteSocialMedia);
adminRouter.get("/socialmedia-status/:id", updateSocialMediaStatus);
adminRouter.post(
  "/socialmedia-pagination",
  [pageSchema],
  paginationSocialMedia
);

// PAGE WISE BANNER API
adminRouter.post(
  "/pagewisebanner",
  [data.uploadPageWiseBanner, pageWiseBannerSchema],
  postPageWiseBanner
);
adminRouter.put(
  "/pagewisebanner/:id",
  [data.uploadPageWiseBanner, pageWiseBannerSchema],
  updatePageWiseBanner
);
adminRouter.delete("/pagewisebanner/:id", deletePageWiseBanner);
adminRouter.get("/pagewisebanner-status/:id", updatePageWiseBannerStatus);
adminRouter.post(
  "/pagewisebanner-pagination",
  [pageSchema],
  paginationPageWiseBanner
);

// EMAIL SETTING API
adminRouter.post("/emailsetting", [emailSettingSchema], postEmailSetting);
adminRouter.get("/emailsetting", getEmailSetting);
adminRouter.delete("/emailsetting/:id", deleteEmailSetting);

// EMAIL TEMPLATE API
adminRouter.post("/emailtemplate", [emailTemplateSchema], postEmailTemplate);
adminRouter.put(
  "/emailtemplate/:id",
  [emailTemplateSchema],
  updateEmailTemplate
);
adminRouter.delete("/emailtemplate/:id", deleteEmailTemplate);
adminRouter.post("/emailtemplate-pagination", paginationEmailTemplate);

adminRouter.post("/menu", [menuSchema], postMenu);
adminRouter.put("/menu/:id", [menuSchema], updateMenu);
adminRouter.delete("/menu/:id", deleteMenu);
adminRouter.get("/menu-status/:id", updateMenuStatus);
adminRouter.post("/menu-pagination", menuPagination);
adminRouter.get("/menuall", getAllOnlyMenu);
adminRouter.post("/menu-position", [positionSchema], menuPosition);
adminRouter.get("/menus", getMenus);

// COLOUR API

adminRouter.post("/colour", [colourSchema], postColour);
adminRouter.put("/colour/:id", [colourSchema], updateColour);
adminRouter.get("/colour-status/:id", updateColourStatus);
adminRouter.get("/colour", getAllColour);
adminRouter.delete("/colour/:id", deleteColour);
adminRouter.post("/colour-pagination", paginationColour);

// SUBMENU COLLECTION API

adminRouter.post(
  "/submenu-collection",
  [subMenuCollectionSchema],
  postSubMenuCollection
);
adminRouter.put(
  "/submenu-collection/:id",
  [subMenuCollectionSchema],
  updateSubMenuCollection
);
adminRouter.get(
  "/submenu-collection-status/:id",
  updateSubMenuCollectionStatus
);
adminRouter.post("/parentsubmenu-collection", getAllParentSubMenuCollection);
adminRouter.delete("/submenu-collection/:id", deleteSubMenuCollection);
adminRouter.post("/submenu-collection-pagination", subMenuCollectionPagination);
adminRouter.post(
  "/submenu-collection-position",
  [positionSchema],
  subMenuCollectionPosition
);

//  CATALOGUE API

adminRouter.post("/catalogue", [data.uploadCatalogue], postCatalogueChunk);

adminRouter.put(
  "/catalogue/:id",
  [data.uploadCatalogue, catalogueSchema],
  updateCatalogue
);
adminRouter.get("/catalogue-status/:id", updateCatalogueStatus);
// adminRouter.delete("/catalogue/:id", deleteCatalogue);
adminRouter.post("/catalogue-pagination", paginationCatalogue);

adminRouter.post("/product", [data.uploadProduct], postRetailProduct);
adminRouter.get("/product", getAllReatialProduct);
adminRouter.post("/product-pagination", paginationReatilProduct);
adminRouter.put("/product/:id", [data.uploadProduct], updateRetailProduct);
adminRouter.delete("/product/:id", deleteReatailProduct);
adminRouter.get("/product-status/:id", updateReatailProductStatus);
adminRouter.post("/product-image", [productImageSchema], deleteProductImage);
adminRouter.post(
  "/catalogueproduct",
  [data.uploadProduct],
  postCatalogueProduct
);
adminRouter.post("/arrayproduct", [data.uploadProduct], arrayProducts);
adminRouter.post("/remove-arrayproduct", removeArrayOfProduct);
adminRouter.get("/remove-arrayproducts", removeArrayOfProducts);
adminRouter.get("/arrayproduct/:cat_code", getArrayOfProducts);

adminRouter.post("/chunk", [data.uploadProduct], HandleChunkData);

// CONTACT DETAILS API

adminRouter.post(
  "/contactdetail",
  [data.uploadContactDetails, contactDetailsSchema],
  postContactDetail
);
adminRouter.put(
  "/contactdetail/:id",
  [data.uploadContactDetails, contactDetailsSchema],
  updateContactDetails
);
adminRouter.get("/contactdetails-status/:id", updateContactDetailsStatus);
adminRouter.delete("/contactdetail/:id", deleteContactDetails);
adminRouter.post("/contactdetail-image/:id", deleteContactDetailsImage);
adminRouter.post(
  "/contactdetails-pagination",
  [pageSchema],
  paginationContactDetails
);

adminRouter.post("/catlog-product", [data.uploadProduct], postCatlogProduct);
adminRouter.put(
  "/catalogue-product/:id",
  [data.uploadProduct],
  updateCatalogueProduct
);
adminRouter.get("/catlog-single-product/:id", catlogtGetSingleProduct);
adminRouter.delete("/catlog-single-delete/:id", deleteCatlogProduct);
adminRouter.post("/catalogueproducts", [data.uploadCatalogue], addCatalogue);
adminRouter.post("/catalogue-product", getCatalogueProducts);
adminRouter.get("/catalogue-product/:catalogue_id", getCatalogueProduct);
adminRouter.get("/draft-product", draftProdcutRemove);
adminRouter.delete("/catalogue/:id", deleteCatalogue);
adminRouter.get("/restorecatalogue", restoreCatalogues);
adminRouter.put("/restorecatalogue/:id", restoreCatalogue);
adminRouter.delete("/restorecatalogue/:id", restoreDeleteCatalogue);

// CMS API
adminRouter.get("/labels", getAllLabels);
adminRouter.post("/labels", [labelSchema], postLabels);
adminRouter.put("/labels/:id", [labelSchema], updatelabels);
adminRouter.delete("/labels/:id", deleteLabels);
adminRouter.get("/labels-status/:id", labelstatus);

adminRouter.get("/size", getAllSizes);
adminRouter.post("/size", [sizeSchema], postSize);
adminRouter.put("/size/:id", [sizeSchema], updateSize);
adminRouter.delete("/size/:id", deleteSize);
adminRouter.get("/size-status/:id", sizeStatus);
adminRouter.post("/size-position", [positionSchema], sortingSizes);
adminRouter.get("/size-pagination", paginationSize);

// IN THIS ROUTE HIS CONTROLLER WE CAN ADD STITCHING GROP AND STITCHING OPTION
adminRouter.post(
  "/stitching-option",
  [stitchingOptionSchema],
  postgroupstitching
);
adminRouter.put(
  "/stitching-option/:id",
  [stitchingOptionSchema],
  putgroupstitching
);
adminRouter.delete("/stitching-group/:id", deletegroupstitching);
adminRouter.get("/stitching-option", getAllgroupstitching);
adminRouter.post("/stitching-option-pagination", paginationgroupstitching);
// END

// IN THIS ROUTE HIS CONTROLLER WE CAN ADD ONY STITCHING OPTION BY GROPING ID
adminRouter.delete("/stitching-option/:id", deleteOptionByGroupingId);
adminRouter.get("/stitching-option-status/:id", optionStatusChange);
adminRouter.get("/stitching-option/:id", getOptionByGroupingId);
adminRouter.post(
  "/single-stitching-option",
  [singleStitchingSchema],
  postOptionByGroupingId
);
adminRouter.put(
  "/single-stitching-option/:id",
  [singleStitchingSchema],
  putOptionByGroupingId
);
// END

// IN THIS ROUTE HIS CONTROLLER WE CAN ADD OPTION MEASUREMENT BY OPTION ID
adminRouter.post(
  "/option-measurement",
  [stitchingMeasurementSchema],
  postOptionMeasurement
);
adminRouter.put(
  "/option-measurement/:id",
  [stitchingMeasurementSchema],
  putOptionMeasurement
);
adminRouter.get("/option-measurement/:id", getOptionMeasurement);
adminRouter.delete("/option-measurement/:id", deleteOptionMeasurement);
adminRouter.get(
  "/option-measurement-status/:id",
  changeOptionMeasurementStatus
);
// END

// COLLECTION API

adminRouter.post("/collection", collectionSchema, postCollection);
adminRouter.put("/collection/:id", collectionSchema, updateCollection);
adminRouter.delete("/collection/:id", deleteCollection);
adminRouter.get("/collection", getAllNewCollection);
adminRouter.get("/collection-status/:id", updateCollectionStatus);
adminRouter.post("/collection-pagination", collectionPagination);
adminRouter.post("/collection-position", positionSchema, collectionPosition);

// NEWS LETTER API

adminRouter.post("/newsletter-pagination", getNewsLetter);
adminRouter.delete("/newsletter/:id", deleteNewsLetter);

// IMPORT CATALOGUE PRODUCTS API

adminRouter.post("/importsheet", data.uploadCSV, importCatalogues);
adminRouter.post("/exportsheet", exportCatalogue);
adminRouter.post("/importzip", data.uploadZip, zipImages);

adminRouter.post("/users-pagination", paginationusers);
adminRouter.get("/users-status/:id", updateUsersStatus);

adminRouter.post("/shipping-charges-pagination", paginationShippingcharges);
adminRouter.post(
  "/shipping-charges",
  [shippingchargesSchema],
  postShippingcharges
);
adminRouter.put(
  "/shipping-charges/:id",
  [shippingchargesSchema],
  updateShippingcharges
);
adminRouter.delete("/shipping-charges/:id", deleteShippingcharges);
adminRouter.get("/shipping-list", countrylistGroup);
adminRouter.post(
  "/shipping-charges-upload",
  [uploadShippingChagresCSV],
  uploadShippingChargeCSV
);

adminRouter.post("/new-collection", collectionImages, uploadImages);
adminRouter.put("/new-collection/:id", collectionImages, updateAllcollection);
adminRouter.delete("/new-collection/:id", deleteCollectionbyId);
adminRouter.post("/collectionall-pagination", paginationAllCollection);
adminRouter.post("/search-collection", searchCollection);
adminRouter.get("/newall-collection", getAllNewCollection);
adminRouter.post("/product-collection", collectionToProduct);
adminRouter.post("/collection-product", paginationCollectionProduct);
adminRouter.delete("/remove-product-collection/:id", romoveProductInCollection);

adminRouter.get("/collection-all-status/:id", updateNewCollectionStatus);
adminRouter.get("/collection-all-home/:id", updateNewCollectionIsHome);

// PAYMENT METHOD API

adminRouter.post(
  "/paymentmethod",
  [data.uploadPaymentMethod, paymentMethodsSchema],
  postPaymentMethod
);
adminRouter.put(
  "/paymentmethod/:id",
  [data.uploadPaymentMethod, paymentMethodsSchema],
  updatePaymentMethod
);
adminRouter.get("/paymentmethod", getPaymentMethod);
adminRouter.delete("/paymentmethod/:id", deletePaymentMethod);
adminRouter.get("/paymentmethod-status/:id", paymentMethodStatus);
adminRouter.post("/paymentmethod-position", paymentMethodPosition);
adminRouter.get("/paymentmethod-image/:id", deletePaymentMethodImage);
adminRouter.post("/customer/order/history", getOrderHistoryusers);
adminRouter.post("/customer/order/details", getOrderdetailsUsers);
adminRouter.post("/order/status", updateOrderStatus);

adminRouter.post("/inventory/single/product", getAllSingleProductInventory);

adminRouter.delete("/contact-us/:id", deleteContactUs);
adminRouter.post("/contact-us-pagination", getAllContactUs);

adminRouter.post(
  "/websetting",
  [data.uploadLogo, webSettingSchema],
  postWebSetting
);
adminRouter.get("/websetting", getWebSetting);

adminRouter.post("/shippingmethod", shippingMethodSchema, postShippingMethod);
adminRouter.put(
  "/shippingmethod/:id",
  shippingMethodSchema,
  updateShippingMethod
);
adminRouter.get("/shippingmethod", getShippingMethod);
adminRouter.delete("/shippingmethod/:id", deleteShippingMethod);
adminRouter.get("/shippingmethod-status/:id", shippingMethodStatus);

adminRouter.post("/shipping/zone", shippingZoneSchema, postShippingZone);
adminRouter.put("/shipping/zone/:id", shippingZoneSchema, updateShippingZone);
adminRouter.get("/shipping/zone", getShippingZone);
adminRouter.delete("/shipping/zone/:id", deleteShippingZone);

adminRouter.post("/shipping/rate", [shippingRateSchema], postShippingRate);
adminRouter.post(
  "/importshipping-rate",
  data.uploadShippingRate,
  importShippingRate
);

export default adminRouter;
