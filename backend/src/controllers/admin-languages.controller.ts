import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Language, ILanguage } from '../models/Language';

// Get all languages
export async function getLanguages(req: Request, res: Response) {
  try {
    logger.info('Fetching all languages');
    
    const languages = await Language.find().sort({ name: 1 });
    
            res.json({
              success: true,
              languages: languages.map(lang => ({
                id: (lang._id as any).toString(),
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
  } catch (error: any) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch languages'
    });
  }
}

// Add new language
export async function addLanguage(req: Request, res: Response) {
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
    const existingLanguage = await Language.findOne({ code });
    if (existingLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Language code already exists'
      });
    }
    
    // Create new language
    const newLanguage = new Language({
      name,
      code,
      flag: flag || '🌍',
      isSourceLanguage: isSourceLanguage !== false,
      isTargetLanguage: isTargetLanguage !== false,
      translationCode,
      enabled: enabled !== false // Default to true if not specified
    });
    
    await newLanguage.save();
    
    logger.info(`Language added: ${name} (${code})`);
    
    res.json({
      success: true,
      message: 'Language added successfully',
      language: {
        id: (newLanguage._id as any).toString(),
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
  } catch (error: any) {
    console.error('Error adding language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add language'
    });
  }
}

// Update language
export async function updateLanguage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, flag, isSourceLanguage, isTargetLanguage, translationCode, enabled } = req.body;
    
    const language = await Language.findById(id);
    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found'
      });
    }
    
    // Check if new code conflicts with existing languages (excluding current)
    if (code && code !== language.code) {
      const existingLanguage = await Language.findOne({ code, _id: { $ne: id } });
      if (existingLanguage) {
        return res.status(400).json({
          success: false,
          error: 'Language code already exists'
        });
      }
    }
    
    // Update language
    const updateData: any = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (flag !== undefined) updateData.flag = flag;
    if (isSourceLanguage !== undefined) updateData.isSourceLanguage = isSourceLanguage;
    if (isTargetLanguage !== undefined) updateData.isTargetLanguage = isTargetLanguage;
    if (translationCode) updateData.translationCode = translationCode;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    const updatedLanguage = await Language.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    logger.info(`Language updated: ${updatedLanguage!.name} (${updatedLanguage!.code})`);
    
    res.json({
      success: true,
      message: 'Language updated successfully',
      language: {
        id: (updatedLanguage!._id as any).toString(),
        name: updatedLanguage!.name,
        code: updatedLanguage!.code,
        flag: updatedLanguage!.flag,
        isSourceLanguage: updatedLanguage!.isSourceLanguage,
        isTargetLanguage: updatedLanguage!.isTargetLanguage,
        translationCode: updatedLanguage!.translationCode,
        enabled: updatedLanguage!.enabled,
        createdAt: updatedLanguage!.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error updating language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update language'
    });
  }
}

// Delete language
export async function deleteLanguage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const language = await Language.findById(id);
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
    
    await Language.findByIdAndDelete(id);
    
    logger.info(`Language deleted: ${language.name} (${language.code})`);
    
    res.json({
      success: true,
      message: 'Language deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete language'
    });
  }
}

// Toggle language enabled status
export async function toggleLanguageStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const language = await Language.findById(id);
    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found'
      });
    }
    
    // Toggle the enabled status
    const updatedLanguage = await Language.findByIdAndUpdate(
      id,
      { enabled: !language.enabled },
      { new: true, runValidators: true }
    );
    
    logger.info(`Language ${updatedLanguage!.enabled ? 'enabled' : 'disabled'}: ${updatedLanguage!.name} (${updatedLanguage!.code})`);
    
    res.json({
      success: true,
      message: `Language ${updatedLanguage!.enabled ? 'enabled' : 'disabled'} successfully`,
      language: {
        id: (updatedLanguage!._id as any).toString(),
        name: updatedLanguage!.name,
        code: updatedLanguage!.code,
        flag: updatedLanguage!.flag,
        isSourceLanguage: updatedLanguage!.isSourceLanguage,
        isTargetLanguage: updatedLanguage!.isTargetLanguage,
        translationCode: updatedLanguage!.translationCode,
        enabled: updatedLanguage!.enabled,
        createdAt: updatedLanguage!.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error toggling language status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle language status'
    });
  }
}

// Test database connection
export async function testDatabaseConnection(req: Request, res: Response) {
  try {
    const allLanguages = await Language.find();
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
}

// Get available languages for frontend
export async function getAvailableLanguages(req: Request, res: Response) {
  try {
    const { type } = req.query; // 'source' or 'target'
    
    // First, let's check if we can find any languages at all
    const allLanguages = await Language.find();
    console.log('DEBUG: Total languages in database:', allLanguages.length);
    
    let query: any = { enabled: true }; // Only return enabled languages for users
    
    if (type === 'source') {
      query.isSourceLanguage = true;
    } else if (type === 'target') {
      query.isTargetLanguage = true;
    }
    
    console.log('DEBUG: Query:', query);
    
    const languages = await Language.find(query).sort({ name: 1 });
    
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
  } catch (error: any) {
    console.error('Error fetching available languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available languages'
    });
  }
}
