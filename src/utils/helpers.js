import crypto from 'crypto';

export const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateLaborCode = () => {
  const prefix = 'LAB';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

export const generateSupplierCode = () => {
  const prefix = 'SUP';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const sanitizeUser = (user) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

export const paginateResults = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    data: data.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalItems: data.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < data.length,
      hasPrevPage: page > 1
    }
  };
  
  return results;
};

export const searchInArray = (array, searchTerm, fields) => {
  if (!searchTerm) return array;
  
  const term = searchTerm.toLowerCase();
  return array.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (!value) return false;
      return value.toString().toLowerCase().includes(term);
    });
  });
};

export const sortArray = (array, sortBy, sortOrder = 'asc') => {
  if (!sortBy) return array;
  
  return array.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';
    
    aValue = aValue.toString().toLowerCase();
    bValue = bValue.toString().toLowerCase();
    
    if (sortOrder === 'desc') {
      return bValue.localeCompare(aValue);
    }
    return aValue.localeCompare(bValue);
  });
};

export const filterArray = (array, filters) => {
  if (!filters || Object.keys(filters).length === 0) return array;
  
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined || value === '') return true;
      
      const itemValue = item[key];
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      return itemValue === value;
    });
  });
};

export const safeJsonParse = (jsonString, defaultValue = null) => {
  if (!jsonString || typeof jsonString !== 'string' || jsonString.trim() === '') {
    return defaultValue;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error.message);
    return defaultValue;
  }
};