// utils/validation.js

// Validate Ethiopian phone number
function validatePhoneNumber(phone) {
  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Ethiopian phone patterns:
  // +251912345678 or 251912345678 or 0912345678
  const patterns = [
    /^\+251[97]\d{8}$/,  // +251 followed by 9 or 7, then 8 digits
    /^251[97]\d{8}$/,    // 251 followed by 9 or 7, then 8 digits
    /^0[97]\d{8}$/       // 0 followed by 9 or 7, then 8 digits
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

// Format phone number to standard format
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Convert to +251 format
  if (cleaned.startsWith('0')) {
    return '+251' + cleaned.substring(1);
  } else if (cleaned.startsWith('251')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+251')) {
    return cleaned;
  }
  
  return phone; // Return as is if doesn't match patterns
}

// Validate TIN (Tax Identification Number)
// Ethiopian TIN is typically 10 digits
function validateTIN(tin) {
  const cleaned = tin.replace(/[\s\-]/g, '');
  return /^\d{10}$/.test(cleaned);
}

// Validate company name (at least 2 characters)
function validateCompanyName(name) {
  return name && name.trim().length >= 2;
}

// Validate full name (at least 2 characters)
function validateFullName(name) {
  return name && name.trim().length >= 2;
}

// Check if message contains /submit command
function isSubmitCommand(text) {
  return text && text.trim().toLowerCase() === '/submit';
}

module.exports = {
  validatePhoneNumber,
  formatPhoneNumber,
  validateTIN,
  validateCompanyName,
  validateFullName,
  isSubmitCommand
};