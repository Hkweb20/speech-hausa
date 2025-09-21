import { Translate } from '@google-cloud/translate/build/src/v2';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { logger } from '../config/logger';

export class TranslationService {
  private translate: Translate;
  private ttsClient: TextToSpeechClient;

  constructor() {
    this.translate = new Translate();
    this.ttsClient = new TextToSpeechClient();
  }

  /**
   * Translate text from any language to any target language
   */
  async translateTextFromTo(text: string, sourceLanguage: string, targetLanguage: string): Promise<{ translatedText: string }> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for translation');
      }

      // Validate languages
      const supportedLanguages = ['ha', 'yo', 'ig', 'ar', 'en', 'fr'];
      if (!supportedLanguages.includes(sourceLanguage)) {
        throw new Error(`Unsupported source language: ${sourceLanguage}`);
      }
      if (!supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      logger.info({ textLength: text.length, sourceLanguage, targetLanguage }, 'Starting text translation');

      const [translation] = await this.translate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage
      });

      logger.info({ 
        originalLength: text.length, 
        translatedLength: translation.length,
        sourceLanguage,
        targetLanguage 
      }, 'Text translated successfully');

      return { translatedText: translation };

    } catch (error) {
      logger.error({ error, text: text.substring(0, 100), sourceLanguage, targetLanguage }, 'Error translating text');
      throw new Error('Failed to translate text');
    }
  }

  /**
   * Translate text from Hausa to target language
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for translation');
      }

      // Validate target language
      const supportedLanguages = ['en', 'fr', 'ar'];
      if (!supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      logger.info({ textLength: text.length, targetLanguage }, 'Starting text translation');

      const [translation] = await this.translate.translate(text, {
        from: 'ha', // Hausa language code
        to: targetLanguage
      });

      logger.info({ 
        originalLength: text.length, 
        translatedLength: translation.length,
        targetLanguage 
      }, 'Text translated successfully');

      return translation;

    } catch (error) {
      logger.error({ error, text: text.substring(0, 100), targetLanguage }, 'Error translating text');
      throw new Error('Failed to translate text');
    }
  }

  /**
   * Convert text to speech using Google TTS
   */
  async textToSpeech(text: string, languageCode: string, voiceName?: string): Promise<Buffer> {
    try {
      logger.info({ 
        text: text.substring(0, 50), 
        languageCode, 
        voiceName,
        textLength: text.length 
      }, 'Starting textToSpeech');

      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for text-to-speech');
      }

      // Get available voices for the language
      logger.info({ languageCode }, 'Fetching available voices');
      const [voices] = await this.ttsClient.listVoices({
        languageCode: languageCode
      });

      logger.info({ 
        voiceCount: voices.voices?.length || 0,
        languageCode 
      }, 'Retrieved voices from Google TTS');

      // Select voice based on preferences
      let selectedVoice = voiceName;
      
      // Check if the provided voice is safe to use
      if (selectedVoice) {
        console.log('🔍 Checking voice safety for:', selectedVoice);
        const isUnsafeVoice = selectedVoice.includes('Aoede') || 
                             selectedVoice.includes('Echo') ||
                             selectedVoice.includes('Fable') ||
                             selectedVoice.includes('Nova') ||
                             selectedVoice.includes('Phoenix') ||
                             selectedVoice.includes('Sage') ||
                             selectedVoice.includes('Shimmer') ||
                             selectedVoice.includes('Studio') ||
                             selectedVoice.includes('Algenib') ||
                             selectedVoice.includes('Achird') ||
                             selectedVoice.includes('Algieba') ||
                             selectedVoice.includes('Alnilam') ||
                             selectedVoice.includes('Autonoe') ||
                             selectedVoice.includes('Callirrhoe') ||
                             selectedVoice.includes('Charon') ||
                             selectedVoice.includes('Despina') ||
                             selectedVoice.includes('Enceladus') ||
                             selectedVoice.includes('Erinome') ||
                             selectedVoice.includes('Fenrir') ||
                             selectedVoice.includes('Gacrux') ||
                             selectedVoice.includes('Iapetus') ||
                             selectedVoice.includes('Kore') ||
                             selectedVoice.includes('Laomedeia') ||
                             selectedVoice.includes('Leda') ||
                             selectedVoice.includes('Orus') ||
                             selectedVoice.includes('Puck') ||
                             selectedVoice.includes('Pulcherrima') ||
                             selectedVoice.includes('Rasalgethi') ||
                             selectedVoice.includes('Sadachbia') ||
                             selectedVoice.includes('Sadaltager') ||
                             selectedVoice.includes('Schedar') ||
                             selectedVoice.includes('Sulafat') ||
                             selectedVoice.includes('Umbriel') ||
                             selectedVoice.includes('Vindemiatrix') ||
                             selectedVoice.includes('Zephyr') ||
                             selectedVoice.includes('Zubenelgenubi') ||
                             selectedVoice.includes('Achernar');
        
        if (isUnsafeVoice) {
          logger.info({ 
            providedVoice: selectedVoice, 
            reason: 'Voice requires model name' 
          }, 'Rejecting unsafe voice, will auto-select safe voice');
          selectedVoice = undefined; // Force auto-selection
        }
      }
      
      if (!selectedVoice) {
        // Default voice selection logic
        const availableVoices = voices.voices?.filter(v => v.languageCodes?.includes(languageCode)) || [];
        
        logger.info({ 
          availableVoicesCount: availableVoices.length,
          languageCode 
        }, 'Filtered available voices');

        // Look for safe voices that don't require model names
        const safeVoices = availableVoices.filter(v => 
          v.name?.includes('Wavenet') && 
          !v.name?.includes('Neural2') && 
          !v.name?.includes('Chirp') &&
          !v.name?.includes('Aoede') &&
          !v.name?.includes('Echo') &&
          !v.name?.includes('Fable') &&
          !v.name?.includes('Nova') &&
          !v.name?.includes('Phoenix') &&
          !v.name?.includes('Sage') &&
          !v.name?.includes('Shimmer') &&
          !v.name?.includes('Studio') &&
          !v.name?.includes('Algenib') &&
          !v.name?.includes('Achird') &&
          !v.name?.includes('Algieba') &&
          !v.name?.includes('Alnilam') &&
          !v.name?.includes('Autonoe') &&
          !v.name?.includes('Callirrhoe') &&
          !v.name?.includes('Charon') &&
          !v.name?.includes('Despina') &&
          !v.name?.includes('Enceladus') &&
          !v.name?.includes('Erinome') &&
          !v.name?.includes('Fenrir') &&
          !v.name?.includes('Gacrux') &&
          !v.name?.includes('Iapetus') &&
          !v.name?.includes('Kore') &&
          !v.name?.includes('Laomedeia') &&
          !v.name?.includes('Leda') &&
          !v.name?.includes('Orus') &&
          !v.name?.includes('Puck') &&
          !v.name?.includes('Pulcherrima') &&
          !v.name?.includes('Rasalgethi') &&
          !v.name?.includes('Sadachbia') &&
          !v.name?.includes('Sadaltager') &&
          !v.name?.includes('Schedar') &&
          !v.name?.includes('Sulafat') &&
          !v.name?.includes('Umbriel') &&
          !v.name?.includes('Vindemiatrix') &&
          !v.name?.includes('Zephyr') &&
          !v.name?.includes('Zubenelgenubi') &&
          !v.name?.includes('Achernar')
        );
        
        logger.info({ safeVoicesCount: safeVoices.length }, 'Found safe voices');
        
        if (safeVoices.length > 0) {
          selectedVoice = safeVoices[0].name || undefined;
          logger.info({ selectedVoice }, 'Selected safe voice');
        } else {
          // Fallback to any available voice
          const fallbackVoices = availableVoices.filter(v => 
            !v.name?.includes('Neural2') && 
            !v.name?.includes('Chirp') &&
            !v.name?.includes('Aoede') &&
            !v.name?.includes('Echo') &&
            !v.name?.includes('Fable') &&
            !v.name?.includes('Nova') &&
            !v.name?.includes('Phoenix') &&
            !v.name?.includes('Sage') &&
            !v.name?.includes('Shimmer') &&
            !v.name?.includes('Studio') &&
            !v.name?.includes('Algenib') &&
            !v.name?.includes('Achird') &&
            !v.name?.includes('Algieba') &&
            !v.name?.includes('Alnilam') &&
            !v.name?.includes('Autonoe') &&
            !v.name?.includes('Callirrhoe') &&
            !v.name?.includes('Charon') &&
            !v.name?.includes('Despina') &&
            !v.name?.includes('Enceladus') &&
            !v.name?.includes('Erinome') &&
            !v.name?.includes('Fenrir') &&
            !v.name?.includes('Gacrux') &&
            !v.name?.includes('Iapetus') &&
            !v.name?.includes('Kore') &&
            !v.name?.includes('Laomedeia') &&
            !v.name?.includes('Leda') &&
            !v.name?.includes('Orus') &&
            !v.name?.includes('Puck') &&
            !v.name?.includes('Pulcherrima') &&
            !v.name?.includes('Rasalgethi') &&
            !v.name?.includes('Sadachbia') &&
            !v.name?.includes('Sadaltager') &&
            !v.name?.includes('Schedar') &&
            !v.name?.includes('Sulafat') &&
            !v.name?.includes('Umbriel') &&
            !v.name?.includes('Vindemiatrix') &&
            !v.name?.includes('Zephyr') &&
            !v.name?.includes('Zubenelgenubi') &&
            !v.name?.includes('Achernar')
          );
          
          if (fallbackVoices.length > 0) {
            selectedVoice = fallbackVoices[0].name || undefined;
            logger.info({ selectedVoice }, 'Selected fallback voice');
          } else if (availableVoices.length > 0) {
            selectedVoice = availableVoices[0].name || undefined;
            logger.info({ selectedVoice }, 'Selected first available voice');
          }
        }
      }

      // Validate that the selected voice exists and doesn't require a model
      const availableVoices = voices.voices?.filter(v => v.languageCodes?.includes(languageCode)) || [];
      const voiceExists = availableVoices.some(v => v.name === selectedVoice);
      
      logger.info({ 
        selectedVoice, 
        voiceExists,
        availableVoicesCount: availableVoices.length 
      }, 'Voice validation');

      if (!voiceExists || !selectedVoice) {
        // Fallback to a safe voice
        const safeVoices = availableVoices.filter(v => 
          v.name?.includes('Wavenet') && 
          !v.name?.includes('Neural2') && 
          !v.name?.includes('Chirp') &&
          !v.name?.includes('Aoede') &&
          !v.name?.includes('Echo') &&
          !v.name?.includes('Fable') &&
          !v.name?.includes('Nova') &&
          !v.name?.includes('Phoenix') &&
          !v.name?.includes('Sage') &&
          !v.name?.includes('Shimmer') &&
          !v.name?.includes('Studio') &&
          !v.name?.includes('Algenib') &&
          !v.name?.includes('Achird') &&
          !v.name?.includes('Algieba') &&
          !v.name?.includes('Alnilam') &&
          !v.name?.includes('Autonoe') &&
          !v.name?.includes('Callirrhoe') &&
          !v.name?.includes('Charon') &&
          !v.name?.includes('Despina') &&
          !v.name?.includes('Enceladus') &&
          !v.name?.includes('Erinome') &&
          !v.name?.includes('Fenrir') &&
          !v.name?.includes('Gacrux') &&
          !v.name?.includes('Iapetus') &&
          !v.name?.includes('Kore') &&
          !v.name?.includes('Laomedeia') &&
          !v.name?.includes('Leda') &&
          !v.name?.includes('Orus') &&
          !v.name?.includes('Puck') &&
          !v.name?.includes('Pulcherrima') &&
          !v.name?.includes('Rasalgethi') &&
          !v.name?.includes('Sadachbia') &&
          !v.name?.includes('Sadaltager') &&
          !v.name?.includes('Schedar') &&
          !v.name?.includes('Sulafat') &&
          !v.name?.includes('Umbriel') &&
          !v.name?.includes('Vindemiatrix') &&
          !v.name?.includes('Zephyr') &&
          !v.name?.includes('Zubenelgenubi') &&
          !v.name?.includes('Achernar')
        );
        
        logger.info({ safeVoicesCount: safeVoices.length }, 'Found safe voices for fallback');
        
        if (safeVoices.length > 0) {
          selectedVoice = safeVoices[0].name || undefined;
          logger.info({ selectedVoice }, 'Selected safe fallback voice');
        } else if (availableVoices.length > 0) {
          selectedVoice = availableVoices[0].name || undefined;
          logger.info({ selectedVoice }, 'Selected first available fallback voice');
        } else {
          throw new Error('No voices available for language: ' + languageCode);
        }
      }

      logger.info({ 
        textLength: text.length, 
        languageCode, 
        selectedVoice 
      }, 'Starting text-to-speech conversion');

      const request = {
        input: { text: text },
        voice: {
          languageCode: languageCode,
          name: selectedVoice,
          ssmlGender: 'NEUTRAL' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
          pitch: 0.0,
        },
      };

      logger.info({ request }, 'TTS request details');

      const [response] = await this.ttsClient.synthesizeSpeech(request);
      
      logger.info({ 
        hasAudioContent: !!response.audioContent,
        audioSize: response.audioContent?.length || 0
      }, 'TTS response received');
      
      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      logger.info({ 
        audioSize: response.audioContent.length,
        languageCode,
        selectedVoice
      }, 'Text-to-speech conversion successful');

      return Buffer.from(response.audioContent);

    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        languageCode, 
        voiceName,
        errorType: error.constructor.name 
      }, 'Error in text-to-speech');
      throw new Error(`Failed to convert text to speech: ${error.message}`);
    }
  }

  /**
   * Get available voices for a language
   */
  async getAvailableVoices(languageCode: string): Promise<Array<{name: string, gender: string, languageCode: string}>> {
    try {
      const [voices] = await this.ttsClient.listVoices({
        languageCode: languageCode
      });

      const availableVoices = voices.voices?.map(voice => ({
        name: voice.name || '',
        gender: String(voice.ssmlGender || 'NEUTRAL'),
        languageCode: voice.languageCodes?.[0] || languageCode
      })) || [];

      logger.info({ languageCode, voiceCount: availableVoices.length }, 'Retrieved available voices');
      return availableVoices;

    } catch (error) {
      logger.error({ error, languageCode }, 'Error getting available voices');
      throw new Error('Failed to get available voices');
    }
  }

  /**
   * Complete translation pipeline: Hausa text → target language text → audio
   */
  async translateAndSpeak(
    hausaText: string, 
    targetLanguage: string, 
    voiceName?: string
  ): Promise<{
    translatedText: string;
    audioBuffer: Buffer;
    languageCode: string;
    voiceUsed: string;
  }> {
    try {
      logger.info({ hausaText: hausaText.substring(0, 50), targetLanguage, voiceName }, 'Starting translate and speak pipeline');
      
      // Step 1: Translate text
      const translatedText = await this.translateText(hausaText, targetLanguage);
      logger.info({ translatedText: translatedText.substring(0, 50) }, 'Translation completed');
      
      // Step 2: Convert to speech
      const languageCode = this.getLanguageCode(targetLanguage);
      const audioBuffer = await this.textToSpeech(translatedText, languageCode, voiceName);
      logger.info({ audioSize: audioBuffer.length }, 'TTS completed');
      
      // Get the voice name that was actually used
      const voices = await this.getAvailableVoices(languageCode);
      const usedVoice = voiceName || voices[0]?.name || 'auto-selected';

      logger.info({ usedVoice, languageCode }, 'Translate and speak pipeline completed successfully');

      return {
        translatedText,
        audioBuffer,
        languageCode,
        voiceUsed: usedVoice
      };

    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        hausaText: hausaText.substring(0, 100), 
        targetLanguage, 
        voiceName,
        errorType: error.constructor.name 
      }, 'Error in translate and speak pipeline');
      throw new Error(`Failed to complete translation pipeline: ${error.message}`);
    }
  }

  /**
   * Get TTS language code from target language
   */
  private getLanguageCode(targetLanguage: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'en-US',
      'fr': 'fr-FR', 
      'ar': 'ar-XA'
    };
    
    return languageMap[targetLanguage] || 'en-US';
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode: string): string {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'fr': 'French',
      'ar': 'Arabic',
      'ha': 'Hausa',
      'yo': 'Yoruba',
      'ig': 'Igbo'
    };
    
    return languageNames[languageCode] || 'English';
  }
}

// Create a singleton instance
const translationService = new TranslationService();

// Export standalone function for easy importing
export async function translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<{ translatedText: string }> {
  return translationService.translateTextFromTo(text, sourceLanguage, targetLanguage);
}
