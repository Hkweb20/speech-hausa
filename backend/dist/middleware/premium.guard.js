"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.premiumGuard = premiumGuard;
function premiumGuard(req, res, next) {
    if (!req.user?.isPremium) {
        return res.status(402).json({ message: 'Premium required' });
    }
    return next();
}
