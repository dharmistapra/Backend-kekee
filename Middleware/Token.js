import jwt from "jsonwebtoken";
import "dotenv/config";

const generateJWT_Token = (user, type) => {
  const payload = {
    id: user.id || 1,
    name: user.name || "",
    email: user.email || "",
    type: type,
  };

  const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: "12h",
    algorithm: "HS256",
  });
  return { token, payload };
};

export default generateJWT_Token;
