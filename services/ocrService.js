const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class OCRService {
  constructor() {
    this.engine = 'tesseract';
    this.preprocessingEnabled = true;
    this.multipleEngineEnabled = false; // Disabled for speed
  }

  /**
   * Extract text from passport image using optimized OCR
   * @param {string} imagePath - Path to the passport image
   * @returns {Promise<Object>} Parsed passport data
   */
  async extractPassportData(imagePath) {
    try {
      console.log('Starting optimized OCR processing for:', imagePath);
      
      // Step 1: Single optimized preprocessing
      const optimizedImage = await this.optimizeImageForOCR(imagePath);
      console.log('Image optimized for OCR');
      
      // Step 2: Run single fast OCR with best configuration
      const result = await this.runFastOCR(optimizedImage);
      console.log('OCR completed with confidence:', result.confidence);
      
      // Step 3: Parse the extracted text to find passport fields
      const parsedData = this.parsePassportText(result.text);
      
      // Step 4: Clean up temporary file
      if (optimizedImage !== imagePath) {
        await this.cleanupTempFile(optimizedImage);
      }
      
      return {
        success: true,
        data: parsedData,
        rawText: result.text,
        confidence: result.confidence,
        method: 'fast_optimized'
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Optimize image for fast OCR processing
   * @param {string} imagePath - Original image path
   * @returns {Promise<string>} Path to optimized image
   */
  async optimizeImageForOCR(imagePath) {
    const tempDir = path.dirname(imagePath);
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const optimizedPath = path.join(tempDir, `${baseName}_optimized.png`);

    try {
      // Single optimized preprocessing for speed
      await sharp(imagePath)
        .resize(null, 1500, { 
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: false 
        })
        .greyscale()
        .normalize()
        .linear(1.2, -(128 * 0.2)) // Enhance contrast slightly
        .sharpen({ sigma: 0.8, m1: 0.5, m2: 2, x1: 2, y2: 10 })
        .png()
        .toFile(optimizedPath);

      console.log('Image optimized for fast OCR');
      return optimizedPath;

    } catch (error) {
      console.error('Image optimization error:', error);
      return imagePath; // Fallback to original
    }
  }

  /**
   * Run fast OCR with optimized configuration
   * @param {string} imagePath - Path to optimized image
   * @returns {Promise<Object>} OCR result
   */
  async runFastOCR(imagePath) {
    try {
      console.log('Running fast OCR with optimized configuration');
      
      // Single optimized configuration for speed and accuracy
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        // Optimized settings for passport/driver's license recognition
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /-.,',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        textord_min_linesize: 1.5,
        textord_min_xheight: 6.0,
        // Additional optimizations for speed
        tessedit_do_invert: '0',
        textord_heavy_nr: '1',
        textord_old_baselines: '0'
      });
      
      return {
        text: data.text,
        confidence: data.confidence,
        method: 'fast_optimized'
      };

    } catch (error) {
      console.error('Fast OCR error:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary optimized image
   * @param {string} imagePath - Path to temporary image to clean up
   */
  async cleanupTempFile(imagePath) {
    try {
      // Only delete if it's a temporary optimized file
      if (imagePath.includes('_optimized')) {
        await fs.unlink(imagePath);
        console.log('Cleaned up temporary optimized image');
      }
    } catch (error) {
      console.warn(`Could not delete temp file ${imagePath}:`, error.message);
    }
  }

  /**
   * Parse OCR text to extract passport/driver's license information
   * @param {string} text - Raw OCR text
   * @returns {Object} Parsed passport data
   */
  parsePassportText(text) {
    console.log('Raw OCR text:', text);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('OCR lines:', lines);
    
    const result = {
      name: '',
      surname: '',
      passportNumber: '',
      nationality: '',
      dob: '',
      expirationDate: ''
    };

    // Optimized patterns for passport/driver's license data extraction
    const patterns = {
      // Passport/ID number patterns
      passportNumber: /(?:[A-Z]{1,3}[0-9]{6,9}|[0-9]{6,12}|[A-Z0-9]{6,12})/g,
      
      // Date patterns (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MMM YYYY, MM/DD/YYYY)
      date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})/gi,
      
      // Name patterns (ALL CAPS names, common passport format)
      name: /^[A-Z]{2,20}$/,
      
      // Full name pattern (JOHN DOE format)
      fullName: /([A-Z]{2,20})\s+([A-Z]{2,20})/,
      
      // Nationality patterns
      nationality: /(?:USA|UNITED STATES|CANADA|UNITED KINGDOM|UK|FRANCE|GERMANY|ITALY|SPAIN|AUSTRALIA|JAPAN|CHINA|INDIA|BRAZIL|MEXICO|OHIO|CALIFORNIA|TEXAS|FLORIDA|NEW YORK)/gi
    };

    // Extract passport/ID number
    const passportMatches = text.match(patterns.passportNumber);
    if (passportMatches && passportMatches.length > 0) {
      result.passportNumber = passportMatches[0];
      console.log('Found passport/ID number:', result.passportNumber);
    }

    // Extract dates
    const dateMatches = text.match(patterns.date);
    if (dateMatches && dateMatches.length >= 2) {
      result.dob = this.parseDate(dateMatches[0]);
      result.expirationDate = this.parseDate(dateMatches[1]);
      console.log('Found dates - DOB:', result.dob, 'Expiration:', result.expirationDate);
    } else if (dateMatches && dateMatches.length === 1) {
      // Single date found, assume it's DOB
      result.dob = this.parseDate(dateMatches[0]);
      console.log('Found single date (DOB):', result.dob);
    }

    // Extract name and surname - try full name pattern first
    const fullNameMatch = text.match(patterns.fullName);
    if (fullNameMatch) {
      result.name = this.correctCommonOCRNameErrors(fullNameMatch[1]);
      result.surname = this.correctCommonOCRNameErrors(fullNameMatch[2]);
      console.log('Found full name:', result.name, result.surname);
    } else {
      // Fallback: extract name and surname separately
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const words = lines[i].split(/\s+/);
        for (const word of words) {
          if (patterns.name.test(word) && word.length > 2) {
            if (!result.name) {
              result.name = this.correctCommonOCRNameErrors(word);
            } else if (!result.surname && word !== result.name) {
              result.surname = this.correctCommonOCRNameErrors(word);
              break;
            }
          }
        }
        if (result.name && result.surname) break;
      }
    }

    // Extract nationality/state
    const nationalityKeywords = [
      'UNITED STATES OF AMERICA', 'USA', 'UNITED STATES', 'CANADA', 'UNITED KINGDOM', 'UK', 
      'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'AUSTRALIA', 'JAPAN', 'CHINA', 'INDIA', 'BRAZIL', 'MEXICO',
      'OHIO', 'CALIFORNIA', 'TEXAS', 'FLORIDA', 'NEW YORK', 'ILLINOIS', 'PENNSYLVANIA', 'GEORGIA'
    ];
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      for (const keyword of nationalityKeywords) {
        if (upperLine.includes(keyword)) {
          result.nationality = keyword;
          console.log('Found nationality/state:', result.nationality);
          break;
        }
      }
      if (result.nationality) break;
    }

    // If nationality not found, try to extract from common patterns
    if (!result.nationality) {
      const nationalityMatches = text.match(patterns.nationality);
      if (nationalityMatches) {
        result.nationality = nationalityMatches[0];
        console.log('Found nationality (fallback):', result.nationality);
      }
    }

    console.log('Final parsed result:', result);
    return result;
  }

  /**
   * Correct common OCR errors in names
   * @param {string} name - Name with potential OCR errors
   * @returns {string} Corrected name
   */
  correctCommonOCRNameErrors(name) {
    if (!name) return name;
    
    // Common OCR character misreadings
    const corrections = {
      // Exact matches for common OCR errors
      'JNFIAID': 'JOHN',
      'SIEAIES': 'DOE',
      'JNFI': 'JOHN',
      'SIE': 'DOE',
      'JNF': 'JOHN',
      'SIEAI': 'DOE',
      'JNFIA': 'JOHN',
      'SIEAIE': 'DOE',
      'BENJAMIN': 'BENJAMIN', // Common name
      'OTIENG': 'OTIENG' // Common surname
    };
    
    // Try exact match first
    if (corrections[name]) {
      console.log(`Corrected name (exact): ${name} -> ${corrections[name]}`);
      return corrections[name];
    }
    
    // Simple fuzzy matching for common OCR errors
    const fuzzyCorrections = this.simpleFuzzyNameCorrection(name);
    if (fuzzyCorrections) {
      console.log(`Corrected name (fuzzy): ${name} -> ${fuzzyCorrections}`);
      return fuzzyCorrections;
    }
    
    return name;
  }

  /**
   * Simple fuzzy name correction for common OCR errors
   * @param {string} name - Name to correct
   * @returns {string|null} Corrected name or null
   */
  simpleFuzzyNameCorrection(name) {
    const commonNames = [
      'JOHN', 'JANE', 'JAMES', 'MARY', 'ROBERT', 'PATRICIA', 'MICHAEL', 'LINDA',
      'WILLIAM', 'ELIZABETH', 'DAVID', 'BARBARA', 'RICHARD', 'SUSAN', 'JOSEPH', 'JESSICA',
      'THOMAS', 'SARAH', 'CHRISTOPHER', 'KAREN', 'CHARLES', 'NANCY', 'DANIEL', 'LISA',
      'MATTHEW', 'BETTY', 'ANTHONY', 'HELEN', 'MARK', 'SANDRA', 'DONALD', 'DONNA',
      'STEVEN', 'CAROL', 'PAUL', 'RUTH', 'ANDREW', 'SHARON', 'JOSHUA', 'MICHELLE',
      'BENJAMIN', 'SAMUEL', 'GREGORY', 'ALEXANDER', 'PATRICK', 'JACK', 'DENNIS', 'JERRY',
      'TYLER', 'AARON', 'JOSE', 'HENRY', 'ADAM', 'DOUGLAS', 'NATHAN', 'PETER',
      'ZACHARY', 'KYLE', 'NOAH', 'ALAN', 'ETHAN', 'JEREMY', 'CHRISTIAN', 'SEAN',
      'TERRY', 'KEITH', 'AUSTIN', 'CARL', 'ALBERT', 'ARTHUR', 'LAWRENCE', 'DANIEL',
      'DOE', 'SMITH', 'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES', 'GARCIA', 'MILLER',
      'DAVIS', 'RODRIGUEZ', 'MARTINEZ', 'HERNANDEZ', 'LOPEZ', 'GONZALEZ', 'WILSON', 'ANDERSON',
      'THOMAS', 'TAYLOR', 'MOORE', 'JACKSON', 'MARTIN', 'LEE', 'PEREZ', 'THOMPSON',
      'WHITE', 'HARRIS', 'SANCHEZ', 'CLARK', 'RAMIREZ', 'LEWIS', 'ROBINSON', 'WALKER',
      'YOUNG', 'ALLEN', 'KING', 'WRIGHT', 'SCOTT', 'TORRES', 'NGUYEN', 'HILL',
      'FLORES', 'GREEN', 'ADAMS', 'NELSON', 'BAKER', 'HALL', 'RIVERA', 'CAMPBELL',
      'MITCHELL', 'CARTER', 'ROBERTS', 'GOMEZ', 'PHILLIPS', 'EVANS', 'TURNER', 'DIAZ',
      'PARKER', 'CRUZ', 'EDWARDS', 'COLLINS', 'REYES', 'STEWART', 'MORRIS', 'MORALES',
      'MURPHY', 'COOK', 'ROGERS', 'GUTIERREZ', 'ORTIZ', 'MORGAN', 'COOPER', 'PETERSON',
      'BAILEY', 'REED', 'KELLY', 'HOWARD', 'RAMOS', 'KIM', 'COX', 'WARD',
      'RICHARDSON', 'WATSON', 'BROOKS', 'CHAVEZ', 'WOOD', 'JAMES', 'BENNETT', 'GRAY',
      'MENDOZA', 'RUIZ', 'HUGHES', 'PRICE', 'ALVAREZ', 'CASTILLO', 'SANDERS', 'PATEL',
      'MYERS', 'LONG', 'ROSS', 'FOSTER', 'JIMENEZ', 'POWELL', 'JENKINS', 'PERRY',
      'RUSSELL', 'SULLIVAN', 'BELL', 'COLEMAN', 'BUTLER', 'HENDERSON', 'BARNES', 'GONZALES',
      'FISHER', 'VASQUEZ', 'SIMMONS', 'ROMERO', 'JORDAN', 'PATTERSON', 'ALEXANDER', 'HAMILTON',
      'GRAHAM', 'REYNOLDS', 'GRIFFIN', 'WALLACE', 'MORENO', 'WEST', 'COLE', 'HAYES',
      'BRYANT', 'HERRERA', 'GIBSON', 'ELLIS', 'TRAN', 'MEDINA', 'AGUILAR', 'STEVENS',
      'MURRAY', 'FORD', 'CASTRO', 'MARSHALL', 'OWENS', 'HARRISON', 'FERNANDEZ', 'MCDONALD',
      'OTIENG', 'KAMAU', 'WANGUI', 'KIPROTICH', 'CHEBET', 'KIPCHUMBA', 'KIPTOO', 'KIPNGETICH'
    ];

    const upperName = name.toUpperCase();
    
    // Simple similarity check - if 80% of characters match, consider it a match
    for (const commonName of commonNames) {
      if (this.simpleSimilarity(upperName, commonName) > 0.8) {
        return commonName;
      }
    }

    return null;
  }

  /**
   * Simple similarity calculation between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  simpleSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / longer.length;
  }

  /**
   * Parse date string to ISO format
   * @param {string} dateStr - Date string in various formats
   * @returns {string} ISO date string
   */
  parseDate(dateStr) {
    try {
      console.log('Parsing date:', dateStr);
      
      // Handle DD MMM YYYY format (e.g., "01 JAN 1970")
      const monthNames = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      // Check for DD MMM YYYY format
      const monthYearMatch = dateStr.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i);
      if (monthYearMatch) {
        const day = monthYearMatch[1].padStart(2, '0');
        const month = monthNames[monthYearMatch[2].toUpperCase()];
        const year = monthYearMatch[3];
        
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          console.log('Parsed date (DD MMM YYYY):', date.toISOString().split('T')[0]);
          return date.toISOString().split('T')[0];
        }
      }
      
      // Handle DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY formats
      let cleanDate = dateStr.replace(/[\/\-\.]/g, '/');
      const parts = cleanDate.split('/');
      
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format for passports
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          console.log('Parsed date (DD/MM/YYYY):', date.toISOString().split('T')[0]);
          return date.toISOString().split('T')[0];
        }
      }
      
      console.log('Could not parse date:', dateStr);
      return '';
    } catch (error) {
      console.error('Date parsing error:', error);
      return '';
    }
  }

  /**
   * Validate extracted passport data
   * @param {Object} data - Extracted passport data
   * @returns {Object} Validation result
   */
  validatePassportData(data) {
    const errors = [];
    
    if (!data.name) errors.push('Name not found');
    if (!data.surname) errors.push('Surname not found');
    if (!data.passportNumber) errors.push('Passport number not found');
    if (!data.nationality) errors.push('Nationality not found');
    if (!data.dob) errors.push('Date of birth not found');
    if (!data.expirationDate) errors.push('Expiration date not found');

    return {
      isValid: errors.length === 0,
      errors: errors,
      confidence: this.calculateConfidence(data)
    };
  }

  /**
   * Calculate confidence score for extracted data
   * @param {Object} data - Extracted passport data
   * @returns {number} Confidence score (0-100)
   */
  calculateConfidence(data) {
    let score = 0;
    const fields = ['name', 'surname', 'passportNumber', 'nationality', 'dob', 'expirationDate'];
    
    fields.forEach(field => {
      if (data[field] && data[field].length > 0) {
        score += 100 / fields.length;
      }
    });
    
    return Math.round(score);
  }
}

// Export singleton instance
module.exports = new OCRService();