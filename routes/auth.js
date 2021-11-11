const checkDuplicate = require("../middlewares/checkDuplicate");
const controller = require("../controllers/auth");

module.exports = (app) => {
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/auth/signup", checkDuplicate, controller.signup);

  app.post("/api/auth/signin", controller.signin);
};
