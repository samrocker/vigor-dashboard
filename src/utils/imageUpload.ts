// Utility functions for image upload validation and handling

export const validateImageFile = (file: File): boolean => {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return false;
  }
  
  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
};

export const validateImageFiles = (files: File[]): { valid: File[], invalid: File[] } => {
  const valid: File[] = [];
  const invalid: File[] = [];
  
  files.forEach(file => {
    if (validateImageFile(file)) {
      valid.push(file);
    } else {
      invalid.push(file);
    }
  });
  
  return { valid, invalid };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};