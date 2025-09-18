import { Request, Response } from 'express';
import { logger } from '../config/logger';

// In-memory language storage (in production, this would be in a database)
let languages = [
  {
    id: '1',
    name: 'Hausa',
    code: 'ha-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ha',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Yoruba',
    code: 'yo-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'yo',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Igbo',
    code: 'ig-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ig',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Arabic',
    code: 'ar-SA',
    flag: '🇸🇦',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ar',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'English',
    code: 'en-US',
    flag: '🇺🇸',
    isSourceLanguage: false,
    isTargetLanguage: true,
    translationCode: 'en',
    createdAt: new Date().toISOString()
  }
];

// Get all languages
export async function getLanguages(req: Request, res: Response) {
  try {
    logger.info('Fetching all languages');
    
    res.json({
      success: true,
      languages: languages.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    logger.error('Error fetching languages:', error as any);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch languages'
    });
  }
}

// Add new language
export async function addLanguage(req: Request, res: Response) {
  try {
    const { name, code, flag, isSourceLanguage, isTargetLanguage, translationCode } = req.body;
    
    // Validate required fields
    if (!name || !code || !translationCode) {
      return res.status(400).json({
        success: false,
        error: 'Name, code, and translation code are required'
      });
    }
    
    // Check if language code already exists
    const existingLanguage = languages.find(lang => lang.code === code);
    if (existingLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Language code already exists'
      });
    }
    
    // Create new language
    const newLanguage = {
      id: (languages.length + 1).toString(),
      name,
      code,
      flag: flag || '🌍',
      isSourceLanguage: isSourceLanguage !== false,
      isTargetLanguage: isTargetLanguage !== false,
      translationCode,
      createdAt: new Date().toISOString()
    };
    
    languages.push(newLanguage);
    
    logger.info(`Language added: ${name} (${code})`);
    
    res.json({
      success: true,
      message: 'Language added successfully',
      language: newLanguage
    });
  } catch (error) {
    logger.error('Error adding language:', error as any);
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
    const { name, code, flag, isSourceLanguage, isTargetLanguage, translationCode } = req.body;
    
    const languageIndex = languages.findIndex(lang => lang.id === id);
    if (languageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Language not found'
      });
    }
    
    // Check if new code conflicts with existing languages (excluding current)
    if (code && code !== languages[languageIndex].code) {
      const existingLanguage = languages.find(lang => lang.code === code && lang.id !== id);
      if (existingLanguage) {
        return res.status(400).json({
          success: false,
          error: 'Language code already exists'
        });
      }
    }
    
    // Update language
    languages[languageIndex] = {
      ...languages[languageIndex],
      name: name || languages[languageIndex].name,
      code: code || languages[languageIndex].code,
      flag: flag !== undefined ? flag : languages[languageIndex].flag,
      isSourceLanguage: isSourceLanguage !== undefined ? isSourceLanguage : languages[languageIndex].isSourceLanguage,
      isTargetLanguage: isTargetLanguage !== undefined ? isTargetLanguage : languages[languageIndex].isTargetLanguage,
      translationCode: translationCode || languages[languageIndex].translationCode
    };
    
    logger.info(`Language updated: ${languages[languageIndex].name} (${languages[languageIndex].code})`);
    
    res.json({
      success: true,
      message: 'Language updated successfully',
      language: languages[languageIndex]
    });
  } catch (error) {
    logger.error('Error updating language:', error as any);
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
    
    const languageIndex = languages.findIndex(lang => lang.id === id);
    if (languageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Language not found'
      });
    }
    
    // Prevent deletion of default languages
    const defaultLanguages = ['ha-NG', 'yo-NG', 'ig-NG', 'ar-SA', 'en-US'];
    if (defaultLanguages.includes(languages[languageIndex].code)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default languages'
      });
    }
    
    const deletedLanguage = languages.splice(languageIndex, 1)[0];
    
    logger.info(`Language deleted: ${deletedLanguage.name} (${deletedLanguage.code})`);
    
    res.json({
      success: true,
      message: 'Language deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting language:', error as any);
    res.status(500).json({
      success: false,
      error: 'Failed to delete language'
    });
  }
}

// Get available languages for frontend
export async function getAvailableLanguages(req: Request, res: Response) {
  try {
    const { type } = req.query; // 'source' or 'target'
    
    let availableLanguages = languages;
    
    if (type === 'source') {
      availableLanguages = languages.filter(lang => lang.isSourceLanguage);
    } else if (type === 'target') {
      availableLanguages = languages.filter(lang => lang.isTargetLanguage);
    }
    
    res.json({
      success: true,
      languages: availableLanguages.map(lang => ({
        code: lang.code,
        name: lang.name,
        flag: lang.flag,
        isSourceLanguage: lang.isSourceLanguage,
        isTargetLanguage: lang.isTargetLanguage
      }))
    });
  } catch (error) {
    logger.error('Error fetching available languages:', error as any);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available languages'
    });
  }
}
