"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguages = getLanguages;
exports.addLanguage = addLanguage;
exports.updateLanguage = updateLanguage;
exports.deleteLanguage = deleteLanguage;
exports.toggleLanguageStatus = toggleLanguageStatus;
exports.testDatabaseConnection = testDatabaseConnection;
exports.getAvailableLanguages = getAvailableLanguages;
const logger_1 = require("../config/logger");
const Language_1 = require("../models/Language");
// Get all languages
async function getLanguages(req, res) {
    try {
        logger_1.logger.info('Fetching all languages');
        const languages = await Language_1.Language.find().sort({ name: 1 });
        res.json({
            success: true,
            languages: languages.map(lang => ({
                id: lang._id.toString(),
                name: lang.name,
                code: lang.code,
                flag: lang.flag,
                isSourceLanguage: lang.isSourceLanguage,
                isTargetLanguage: lang.isTargetLanguage,
                translationCode: lang.translationCode,
                enabled: lang.enabled,
                createdAt: lang.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch languages'
        });
    }
}
// Add new language
async function addLanguage(req, res) {
    try {
        const { name, code, flag, isSourceLanguage, isTargetLanguage, translationCode, enabled } = req.body;
        // Validate required fields
        if (!name || !code || !translationCode) {
            return res.status(400).json({
                success: false,
                error: 'Name, code, and translation code are required'
            });
        }
        // Check if language code already exists
        const existingLanguage = await Language_1.Language.findOne({ code });
        if (existingLanguage) {
            return res.status(400).json({
                success: false,
                error: 'Language code already exists'
            });
        }
        // Create new language
        const newLanguage = new Language_1.Language({
            name,
            code,
            flag: flag || '🌍',
            isSourceLanguage: isSourceLanguage !== false,
            isTargetLanguage: isTargetLanguage !== false,
            translationCode,
            enabled: enabled !== false // Default to true if not specified
        });
        await newLanguage.save();
        logger_1.logger.info(`Language added: ${name} (${code})`);
        res.json({
            success: true,
            message: 'Language added successfully',
            language: {
                id: newLanguage._id.toString(),
                name: newLanguage.name,
                code: newLanguage.code,
                flag: newLanguage.flag,
                isSourceLanguage: newLanguage.isSourceLanguage,
                isTargetLanguage: newLanguage.isTargetLanguage,
                translationCode: newLanguage.translationCode,
                enabled: newLanguage.enabled,
                createdAt: newLanguage.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error adding language:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add language'
        });
    }
}
// Update language
async function updateLanguage(req, res) {
    try {
        const { id } = req.params;
        const { name, code, flag, isSourceLanguage, isTargetLanguage, translationCode, enabled } = req.body;
        const language = await Language_1.Language.findById(id);
        if (!language) {
            return res.status(404).json({
                success: false,
                error: 'Language not found'
            });
        }
        // Check if new code conflicts with existing languages (excluding current)
        if (code && code !== language.code) {
            const existingLanguage = await Language_1.Language.findOne({ code, _id: { $ne: id } });
            if (existingLanguage) {
                return res.status(400).json({
                    success: false,
                    error: 'Language code already exists'
                });
            }
        }
        // Update language
        const updateData = {};
        if (name)
            updateData.name = name;
        if (code)
            updateData.code = code;
        if (flag !== undefined)
            updateData.flag = flag;
        if (isSourceLanguage !== undefined)
            updateData.isSourceLanguage = isSourceLanguage;
        if (isTargetLanguage !== undefined)
            updateData.isTargetLanguage = isTargetLanguage;
        if (translationCode)
            updateData.translationCode = translationCode;
        if (enabled !== undefined)
            updateData.enabled = enabled;
        const updatedLanguage = await Language_1.Language.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        logger_1.logger.info(`Language updated: ${updatedLanguage.name} (${updatedLanguage.code})`);
        res.json({
            success: true,
            message: 'Language updated successfully',
            language: {
                id: updatedLanguage._id.toString(),
                name: updatedLanguage.name,
                code: updatedLanguage.code,
                flag: updatedLanguage.flag,
                isSourceLanguage: updatedLanguage.isSourceLanguage,
                isTargetLanguage: updatedLanguage.isTargetLanguage,
                translationCode: updatedLanguage.translationCode,
                enabled: updatedLanguage.enabled,
                createdAt: updatedLanguage.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error updating language:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update language'
        });
    }
}
// Delete language
async function deleteLanguage(req, res) {
    try {
        const { id } = req.params;
        const language = await Language_1.Language.findById(id);
        if (!language) {
            return res.status(404).json({
                success: false,
                error: 'Language not found'
            });
        }
        // Prevent deletion of default languages
        const defaultLanguages = ['ha-NG', 'yo-NG', 'ig-NG', 'ar-SA', 'en-US'];
        if (defaultLanguages.includes(language.code)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete default languages'
            });
        }
        await Language_1.Language.findByIdAndDelete(id);
        logger_1.logger.info(`Language deleted: ${language.name} (${language.code})`);
        res.json({
            success: true,
            message: 'Language deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting language:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete language'
        });
    }
}
// Toggle language enabled status
async function toggleLanguageStatus(req, res) {
    try {
        const { id } = req.params;
        const language = await Language_1.Language.findById(id);
        if (!language) {
            return res.status(404).json({
                success: false,
                error: 'Language not found'
            });
        }
        // Toggle the enabled status
        const updatedLanguage = await Language_1.Language.findByIdAndUpdate(id, { enabled: !language.enabled }, { new: true, runValidators: true });
        logger_1.logger.info(`Language ${updatedLanguage.enabled ? 'enabled' : 'disabled'}: ${updatedLanguage.name} (${updatedLanguage.code})`);
        res.json({
            success: true,
            message: `Language ${updatedLanguage.enabled ? 'enabled' : 'disabled'} successfully`,
            language: {
                id: updatedLanguage._id.toString(),
                name: updatedLanguage.name,
                code: updatedLanguage.code,
                flag: updatedLanguage.flag,
                isSourceLanguage: updatedLanguage.isSourceLanguage,
                isTargetLanguage: updatedLanguage.isTargetLanguage,
                translationCode: updatedLanguage.translationCode,
                enabled: updatedLanguage.enabled,
                createdAt: updatedLanguage.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error toggling language status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle language status'
        });
    }
}
// Test database connection
async function testDatabaseConnection(req, res) {
    try {
        const allLanguages = await Language_1.Language.find();
        res.json({
            success: true,
            message: 'Database connection working',
            totalLanguages: allLanguages.length,
            languages: allLanguages.map(lang => ({
                name: lang.name,
                code: lang.code,
                enabled: lang.enabled
            }))
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error.message
        });
    }
}
// Get available languages for frontend
async function getAvailableLanguages(req, res) {
    try {
        const { type } = req.query; // 'source' or 'target'
        // First, let's check if we can find any languages at all
        const allLanguages = await Language_1.Language.find();
        console.log('DEBUG: Total languages in database:', allLanguages.length);
        let query = { enabled: true }; // Only return enabled languages for users
        if (type === 'source') {
            query.isSourceLanguage = true;
        }
        else if (type === 'target') {
            query.isTargetLanguage = true;
        }
        console.log('DEBUG: Query:', query);
        const languages = await Language_1.Language.find(query).sort({ name: 1 });
        console.log('DEBUG: Found languages:', languages.length);
        res.json({
            success: true,
            languages: languages.map(lang => ({
                code: lang.code,
                name: lang.name,
                flag: lang.flag,
                isSourceLanguage: lang.isSourceLanguage,
                isTargetLanguage: lang.isTargetLanguage
            }))
        });
    }
    catch (error) {
        console.error('Error fetching available languages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available languages'
        });
    }
}
