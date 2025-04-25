import { convertFilePathSlashes, deleteFile, deleteFileReturn } from "../../helper/common.js";

const uploadCMSImages = async (req, res, next) => {
    try {
        const { files } = req;
        let filepath = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const newPath = await convertFilePathSlashes(file.path);
                filepath.push(newPath);
            }
        }
        if (filepath && filepath?.length > 0) {

            return res.status(200).json({
                isSuccess: true,
                message: "Image uploaded successfully",
                data: filepath
            });
        }
        return res.status(400).json({
            isSuccess: false,
            message: "Please upload a file"
        });

    } catch (err) {
        console.log(err);
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
};

const deleteUploadImages = async (req, res, next) => {
    try {
        const { path } = req.query;
        const isDeleted = await deleteFileReturn(path);
        if (!isDeleted) {
            return res.status(400).json({
                isSuccess: false,
                message: "Image not deleted",
            });
        }
        return res.status(200).json({
            isSuccess: true,
            message: "Image deleted successfully",
        });

    } catch (err) {
        const error = new Error("Something went wrong, please try again!");
        next(error);
    }
}

export default uploadCMSImages;
export { deleteUploadImages };
