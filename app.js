require("dotenv").config();
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var gedungRouter = require("./routes/gedungRoutes");
var ruanganRouter = require("./routes/ruanganRoutes");
var apiGedungRouter = require("./routes/api/gedungApiRoutes");
var apiAsetRouter = require("./routes/api/asetApiRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/error");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
  schema: {
    tableName: "express_sessions",
  },
});

app.use(
  session({
    key: "session_cookie_name",
    secret: process.env.SESSION_SECRET || "secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Global middleware untuk mengatasi race condition session pada redirect
app.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function (...args) {
    if (req.session) {
      req.session.save(() => {
        originalRedirect.apply(res, args);
      });
    } else {
      originalRedirect.apply(res, args);
    }
  };
  next();
});

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/gedung", gedungRouter);
app.use("/ruangan", ruanganRouter);
app.use("/api/gedung", apiGedungRouter);
app.use("/api/aset", apiAsetRouter);
// Redirect /aset lama ke /ruangan
app.use("/aset", (req, res) => res.redirect("/ruangan"));

// catch 404 and forward to error handler
app.use(notFoundHandler);

// error handler
app.use(errorHandler);

module.exports = app;
