const checkDuplicate = require("../middlewares/checkDuplicate");
const auth = require("../controllers/auth");

module.exports = (app) => {
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/auth/signup", checkDuplicate, auth.signup);

  app.post("/auth/signin", auth.signin);
  app.get("/auth/verify", auth.verify);
};
