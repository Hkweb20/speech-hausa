import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger';

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }

  /**
   * Summarize Hausa text using Gemini AI
   */
  async summarizeText(text: string): Promise<string> {
    try {
      const prompt = `Summarize this Hausa text in 2-3 sentences, keeping it in Hausa language. Make it concise and clear:

Text: "${text}"

Summary:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      logger.info({ textLength: text.length, summaryLength: summary.length }, 'Text summarized successfully');
      return summary.trim();

    } catch (error) {
      logger.error({ error, text: text.substring(0, 100) }, 'Error summarizing text');
      throw new Error('Failed to summarize text');
    }
  }

  /**
   * Format Hausa text for different social media platforms
   */
  async formatForSocialMedia(text: string, platform: 'facebook' | 'whatsapp' | 'x' | 'instagram' | 'telegram'): Promise<string> {
    try {
      const platformInstructions = {
        facebook: 'Format for Facebook post with emojis and hashtags, keep it in Hausa',
        whatsapp: 'Format for WhatsApp status/message, keep it short and personal in Hausa',
        x: 'Format for X (Twitter) with hashtags, keep it under 280 characters, in Hausa',
        instagram: 'Format for Instagram caption with emojis and hashtags, keep it in Hausa',
        telegram: 'Format for Telegram message, clean and readable in Hausa'
      };

      const prompt = `Format this Hausa text for ${platform.toUpperCase()} platform. ${platformInstructions[platform]}:

Text: "${text}"

Formatted text:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const formattedText = response.text();

      logger.info({ platform, textLength: text.length, formattedLength: formattedText.length }, 'Text formatted for social media');
      return formattedText.trim();

    } catch (error) {
      logger.error({ error, platform, text: text.substring(0, 100) }, 'Error formatting text for social media');
      throw new Error(`Failed to format text for ${platform}`);
    }
  }

  /**
   * Format text for all social media platforms at once
   */
  async formatForAllPlatforms(text: string): Promise<{
    facebook: string;
    whatsapp: string;
    x: string;
    instagram: string;
    telegram: string;
  }> {
    try {
      const prompt = `Format this Hausa text for all social media platforms. Return the result in JSON format with keys: facebook, whatsapp, x, instagram, telegram. Each platform should have appropriate formatting, emojis, and hashtags in Hausa language:

Text: "${text}"

Return only the JSON object, no additional text.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const formattedText = response.text();

      // Try to parse the JSON response
      const jsonMatch = formattedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const formatted = JSON.parse(jsonStr);
        
        logger.info({ textLength: text.length }, 'Text formatted for all platforms');
        return formatted;
      } else {
        // Fallback: format individually
        const [facebook, whatsapp, x, instagram, telegram] = await Promise.all([
          this.formatForSocialMedia(text, 'facebook'),
          this.formatForSocialMedia(text, 'whatsapp'),
          this.formatForSocialMedia(text, 'x'),
          this.formatForSocialMedia(text, 'instagram'),
          this.formatForSocialMedia(text, 'telegram')
        ]);

        return { facebook, whatsapp, x, instagram, telegram };
      }

    } catch (error) {
      logger.error({ error, text: text.substring(0, 100) }, 'Error formatting text for all platforms');
      throw new Error('Failed to format text for social media platforms');
    }
  }
}


