"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = getHealth;
const package_json_1 = require("../../package.json");
function getHealth(_req, res) {
    res.json({ status: 'ok', version: package_json_1.version });
}
