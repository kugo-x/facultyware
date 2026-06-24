var createError = require("http-errors");

// catch 404 and forward to error handler
const notFoundHandler = (req, res, next) => {
  next(createError(404));
};

// error handler
const errorHandler = (err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.locals.message = err.message || String(err);
  res.locals.error = err; // Force expose error in all environments

  // render the error page
  res.status(err.status || 500);
  res.render("error");
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
