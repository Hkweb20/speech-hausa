"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authStub = authStub;
function authStub(req, _res, next) {
    const headerVal = req.header('x-user-premium');
    const isPremium = headerVal ? headerVal.toLowerCase() === 'true' : false;
    req.user = {
        id: 'stub-user-id',
        email: 'stub@example.com',
        isPremium,
    };
    next();
}
