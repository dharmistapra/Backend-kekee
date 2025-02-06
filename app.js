// import createError from "http-errors";
// import express from "express";
// import path from "path";
// import { dirname } from "path";
// import cookieParser from "cookie-parser";
// import logger from "morgan";
// import { fileURLToPath } from "url";
// import adminRouter from "./routes/AdminRoute.js";
// import passport, { isAuthenticated } from "./Middleware/Passport.js";
// import "dotenv/config";
// import cors from "cors";
// import adminAuthRouter from "./routes/adminLogin.js";
// import publicRouter from "./routes/publicRoute.js";
// import publicProtected from "./routes/publicProtectedRoute.js";
// // import "./automated/deleteCatalogue.js";
// const PORT = process.env.PORT || 3000;

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // var indexRouter = require('./routes/index');
// // var usersRouter = require('./routes/users');

// var app = express();

// app.set("views", path.join(__dirname, "views"));
// app.use("/uploads", express.static("uploads"));
// app.set("view engine", "jade");

// app.use(passport.initialize());
// app.use(logger("dev"));
// app.use(express.json({ limit: "100mb" }));
// app.use(
//   express.urlencoded({
//     extended: true,
//     limit: "100mb",
//     parameterLimit: 1000000,
//   })
// );
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "public")));
// app.use(cors());
// app.use("/api", isAuthenticated, adminRouter);
// app.use("/admin", adminAuthRouter);
// app.use("/", publicRouter);
// app.use("/protected", isAuthenticated, publicProtected);

// app.use(function (req, res, next) {
//   next(createError(404));
// });

// app.use(function (err, req, res, next) {
//   res.status(err.status || 500).json({
//     message: err.message || "Internal Server Error",
//     isSuccess: err.statusMessage ? true : false,
//   });
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on ${PORT}`);
// });


import express from "express";
import path from "path";
import { dirname } from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import createError from "http-errors";
import adminRouter from "./routes/AdminRoute.js";
import passport, { isAuthenticated } from "./Middleware/Passport.js";
import "dotenv/config";
import cors from "cors";
import adminAuthRouter from "./routes/adminLogin.js";
import publicRouter from "./routes/publicRoute.js";
import publicProtected from "./routes/publicProtectedRoute.js";

const __dirname = dirname(new URL(import.meta.url).pathname);

const app = express();

app.set("views", path.join(__dirname, "views"));
app.use("/uploads", express.static("uploads"));
// app.set("view engine", "jade");

app.use(passport.initialize());
app.use(logger("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb",
    parameterLimit: 1000000,
  })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use("/api", isAuthenticated, adminRouter);
app.use("/admin", adminAuthRouter);
app.use("/", publicRouter);
app.use("/protected", isAuthenticated, publicProtected);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    isSuccess: err.statusMessage ? true : false,
  });
});

// Export the Express app
export default app;
