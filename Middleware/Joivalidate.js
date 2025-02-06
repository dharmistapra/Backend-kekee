import {
  convertFilePathSlashes,
  deleteFile,
  fileValidation,
  deleteUploadedFiles,
} from "../helper/common.js";

const joiSchemaValidation = async (schema, req, next) => {
  const data = await req.body;
  try {
    let fileStatus = false;
    if (req.files) fileStatus = true;
    if (!data || Object.keys(data).length === 0) {
      const files = req.file || req.files;
      if (files) await fileValidation(files, fileStatus);
      // if (req.file) {
      //   const flag = req.file;
      //   const filepath = convertFilePathSlashes(flag.path);
      //   deleteFile(filepath);
      // }
      // if (req.file || req.files) {
      //   await deleteUploadedFiles(req.file || req.files);
      // }
      let error = new Error("Invalid Or Empty Object");
      error.status = 400;
      next(error);
    } else {
      const option = {
        abortEarly: true,
        allowUnknown: false,
      };
      const { error, value } = schema.validate(data, option);
      if (error) {
        // if (req.file) {
        //   const flag = req.file;
        //   const filepath = convertFilePathSlashes(flag.path);
        //   deleteFile(filepath);
        // }
        const files = req.file || req.files;
        if (files) await fileValidation(files, fileStatus);
        // console.log("HHHHHHHHHHHHHHHHHHHHHHHH")
        // if (req.file || req.files) {
        //   await deleteUploadedFiles(req.file || req.files);
        // }

        let validation_error = new Error(
          `validation Error ${error?.details?.map((item) => item.message)}`
        );
        validation_error.status = 400;
        validation_error.statusMessage = false;
        next(validation_error);
      }
      req.body = value;
      next();
    }
  } catch (err) {
    if (req.file || req.files) {
      await deleteUploadedFiles(req.file || req.files);
    }
    next(err);
  }
};

export default joiSchemaValidation;
