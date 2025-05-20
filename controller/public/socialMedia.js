import "dotenv/config";
import axios from "axios";

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const businessId = process.env.INSTAGRAM_ACCESS_BUSINESSID;

const scoialMedia = async (req, res, next) => {
    try {
        if (!businessId || !ACCESS_TOKEN) {
            return res.status(400).json({ error: "Missing businessId or accessToken" });
        }

        const url = `https://graph.facebook.com/v22.0/${businessId}/media?fields=id,caption,media_type,media_url,media_product_type,timestamp,permalink&access_token=${ACCESS_TOKEN}`;
        const response = await axios.get(url);
        const mediaItems = response.data.data;
        const videoItems = mediaItems.filter(item => item.media_type === "VIDEO");
        res.json({
            isSuccess: true,
            message: "Video data fetched successfully",
            data: videoItems,
        });

    } catch (error) {
        console.error("Error fetching social media data:", error);
        const err = new Error("Something went wrong");
        next(err);
    }
};

export default scoialMedia;
