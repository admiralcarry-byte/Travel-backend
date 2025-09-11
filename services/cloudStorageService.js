const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudStorageService {
  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET;
    this.storageProvider = process.env.STORAGE_PROVIDER || 'local'; // 's3', 'cloudinary', 'local'
  }

  /**
   * Upload file to cloud storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Folder path in storage
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, folder = 'uploads', options = {}) {
    try {
      switch (this.storageProvider) {
        case 's3':
          return await this.uploadToS3(file, folder, options);
        case 'cloudinary':
          return await this.uploadToCloudinary(file, folder, options);
        default:
          return await this.uploadLocally(file, folder, options);
      }
    } catch (error) {
      console.error('Cloud storage upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file to AWS S3
   */
  async uploadToS3(file, folder, options = {}) {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const uploadParams = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: options.public ? 'public-read' : 'private',
      ...options.s3Options
    };

    const result = await s3.upload(uploadParams).promise();

    return {
      success: true,
      url: result.Location,
      key: key,
      fileName: fileName,
      provider: 's3',
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname
    };
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(file, folder, options = {}) {
    const uploadOptions = {
      folder: folder,
      public_id: uuidv4(),
      resource_type: 'auto',
      ...options.cloudinaryOptions
    };

    // Convert buffer to base64 for Cloudinary
    const base64String = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64String}`;

    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.public_id,
      provider: 'cloudinary',
      size: result.bytes,
      mimetype: result.format,
      originalName: file.originalname,
      width: result.width,
      height: result.height
    };
  }

  /**
   * Upload file locally (fallback)
   */
  async uploadLocally(file, folder, options = {}) {
    const uploadDir = path.join(__dirname, '..', 'uploads', folder);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    return {
      success: true,
      url: `/uploads/${folder}/${fileName}`,
      fileName: fileName,
      provider: 'local',
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
      localPath: filePath
    };
  }

  /**
   * Delete file from cloud storage
   * @param {string} identifier - File identifier (URL, key, or public_id)
   * @param {string} provider - Storage provider
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(identifier, provider = null) {
    try {
      const storageProvider = provider || this.storageProvider;

      switch (storageProvider) {
        case 's3':
          return await this.deleteFromS3(identifier);
        case 'cloudinary':
          return await this.deleteFromCloudinary(identifier);
        default:
          return await this.deleteLocally(identifier);
      }
    } catch (error) {
      console.error('Cloud storage delete error:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(key) {
    const deleteParams = {
      Bucket: this.bucketName,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();

    return {
      success: true,
      message: 'File deleted successfully',
      provider: 's3'
    };
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    const result = await cloudinary.uploader.destroy(publicId);

    return {
      success: result.result === 'ok',
      message: result.result === 'ok' ? 'File deleted successfully' : 'File not found',
      provider: 'cloudinary'
    };
  }

  /**
   * Delete local file
   */
  async deleteLocally(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: 'File deleted successfully',
          provider: 'local'
        };
      } else {
        return {
          success: false,
          message: 'File not found',
          provider: 'local'
        };
      }
    } catch (error) {
      throw new Error(`Local file deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file URL (for private files)
   * @param {string} key - File key/identifier
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      switch (this.storageProvider) {
        case 's3':
          return await this.getS3SignedUrl(key, expiresIn);
        case 'cloudinary':
          return await this.getCloudinarySignedUrl(key, expiresIn);
        default:
          return key; // For local files, return the path
      }
    } catch (error) {
      console.error('Get signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get S3 signed URL
   */
  async getS3SignedUrl(key, expiresIn) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn
    };

    return await s3.getSignedUrlPromise('getObject', params);
  }

  /**
   * Get Cloudinary signed URL
   */
  async getCloudinarySignedUrl(publicId, expiresIn) {
    return cloudinary.url(publicId, {
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
  }

  /**
   * Resize image using Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Resize options
   * @returns {string} Resized image URL
   */
  resizeImage(publicId, options = {}) {
    const defaultOptions = {
      width: 800,
      height: 600,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    };

    const resizeOptions = { ...defaultOptions, ...options };
    return cloudinary.url(publicId, resizeOptions);
  }

  /**
   * Generate thumbnail
   * @param {string} publicId - Cloudinary public ID
   * @param {number} size - Thumbnail size
   * @returns {string} Thumbnail URL
   */
  generateThumbnail(publicId, size = 150) {
    return cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of file objects
   * @param {string} folder - Folder path
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleFiles(files, folder = 'uploads', options = {}) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file, folder, options)
      );

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Multiple file upload error:', error);
      throw new Error(`Multiple file upload failed: ${error.message}`);
    }
  }

  /**
   * Get file info
   * @param {string} identifier - File identifier
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(identifier) {
    try {
      switch (this.storageProvider) {
        case 's3':
          return await this.getS3FileInfo(identifier);
        case 'cloudinary':
          return await this.getCloudinaryFileInfo(identifier);
        default:
          return await this.getLocalFileInfo(identifier);
      }
    } catch (error) {
      console.error('Get file info error:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Get S3 file info
   */
  async getS3FileInfo(key) {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    const result = await s3.headObject(params).promise();

    return {
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      etag: result.ETag
    };
  }

  /**
   * Get Cloudinary file info
   */
  async getCloudinaryFileInfo(publicId) {
    const result = await cloudinary.api.resource(publicId);

    return {
      size: result.bytes,
      lastModified: result.created_at,
      contentType: result.format,
      width: result.width,
      height: result.height,
      url: result.secure_url
    };
  }

  /**
   * Get local file info
   */
  async getLocalFileInfo(filePath) {
    const stats = fs.statSync(filePath);

    return {
      size: stats.size,
      lastModified: stats.mtime,
      contentType: 'application/octet-stream' // Would need to determine from extension
    };
  }

  /**
   * Validate file type
   * @param {Object} file - File object
   * @param {Array} allowedTypes - Allowed MIME types
   * @returns {boolean} Is valid
   */
  validateFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Validate file size
   * @param {Object} file - File object
   * @param {number} maxSize - Maximum size in bytes
   * @returns {boolean} Is valid
   */
  validateFileSize(file, maxSize = 5 * 1024 * 1024) { // 5MB default
    return file.size <= maxSize;
  }

  /**
   * Get storage provider info
   * @returns {Object} Provider information
   */
  getProviderInfo() {
    return {
      provider: this.storageProvider,
      bucketName: this.bucketName,
      region: process.env.AWS_REGION,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    };
  }
}

// Create singleton instance
const cloudStorageService = new CloudStorageService();

module.exports = cloudStorageService;