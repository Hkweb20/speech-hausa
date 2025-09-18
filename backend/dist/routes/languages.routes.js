"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_languages_controller_1 = require("../controllers/admin-languages.controller");
const router = (0, express_1.Router)();
// Public endpoint to get available languages (no authentication required)
router.get('/available', admin_languages_controller_1.getAvailableLanguages);
exports.default = router;
