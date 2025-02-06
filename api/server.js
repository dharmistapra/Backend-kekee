import app from "../app.js"; // Import your existing Express app

export default (req, res) => {
  // Handle requests and pass them to the Express app
  app(req, res);
};
