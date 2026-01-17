const express = require("express");
const router = express.Router();
const controller = require("../controllers/loginController");

router.get("/", (req, res) => {
    res.redirect("/login");
});
router.get("/login", controller.loginSayfasi);
router.post("/login", controller.loginYap);

module.exports = router;

