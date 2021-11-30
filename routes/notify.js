const notify = require("../controllers/notify");

module.exports = (app) => {
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/notify/verify", notify.verify);

  app.get("/notify/revoke", notify.revoke);
};
