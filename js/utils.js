// Utility Functions

// Data validation utilities
const validators = {
    required: (value) => {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    email: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    serviceCode: (code) => {
        // Service codes should be SRV-* or RTL-*
        const codeRegex = /^(SRV|RTL)-[A-Z0-9-]+$/i;
        return codeRegex.test(code);
    },
    
    currency: (currency) => {
        const validCurrencies = ['PKR', 'USD', 'AED', 'EUR', 'GBP'];
        return validCurrencies.includes(currency);
    },
    
    positiveNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },
    
    nonNegativeNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    },
    
    percentage: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
    }
};

// Form validation helper
function validateForm(formData, rules) {
    const errors = [];
    
    Object.keys(rules).forEach(field => {
        const value = formData[field];
        const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
        
        fieldRules.forEach(rule => {
            if (typeof rule === 'string') {
                // Built-in validator
                if (!validators[rule](value)) {
                    errors.push(`${field} failed ${rule} validation`);
                }
            } else if (typeof rule === 'function') {
                // Custom validator
                const result = rule(value);
                if (result !== true) {
                    errors.push(result || `${field} validation failed`);
                }
            }
        });
    });
    
    return errors;
}

// Number formatting utilities
const formatters = {
    currency: (amount, currency = 'PKR', locale = 'en-US') => {
        if (amount === null || amount === undefined || amount === '') {
            return 'TBD';
        }
        
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            return `${currency} ${parseFloat(amount).toFixed(2)}`;
        }
    },
    
    number: (value, decimals = 2) => {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        return parseFloat(value).toFixed(decimals);
    },
    
    percentage: (value, decimals = 2) => {
        if (value === null || value === undefined || value === '') {
            return '0%';
        }
        return `${parseFloat(value).toFixed(decimals)}%`;
    }
};

// Date utilities
const dateUtils = {
    format: (dateString, format = 'short') => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        
        switch (format) {
            case 'short':
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            case 'long':
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'iso':
                return date.toISOString().split('T')[0];
            default:
                return date.toLocaleDateString();
        }
    },
    
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },
    
    isValid: (dateString) => {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    },
    
    today: () => {
        return new Date().toISOString().split('T')[0];
    },
    
    addBusinessDays: (date, days) => {
        const result = new Date(date);
        let addedDays = 0;
        
        while (addedDays < days) {
            result.setDate(result.getDate() + 1);
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (result.getDay() !== 0 && result.getDay() !== 6) {
                addedDays++;
            }
        }
        
        return result;
    }
};

// String utilities
const stringUtils = {
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    camelCase: (str) => {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    },
    
    kebabCase: (str) => {
        return str.toLowerCase().replace(/\s+/g, '-');
    },
    
    truncate: (str, length = 50, suffix = '...') => {
        if (str.length <= length) return str;
        return str.substring(0, length) + suffix;
    },
    
    clean: (str) => {
        return str.trim().replace(/\s+/g, ' ');
    }
};

// Array utilities
const arrayUtils = {
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },
    
    sortBy: (array, key, direction = 'asc') => {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    },
    
    unique: (array, key) => {
        if (!key) return [...new Set(array)];
        
        const seen = new Set();
        return array.filter(item => {
            const val = item[key];
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });
    },
    
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
};

// Local storage utilities
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
};

// Debounce utility
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle utility
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep clone utility
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
}

// Generate unique IDs
function generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`;
}

// Calculate percentage change
function percentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

// Sanitize HTML
function sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Check if object is empty
function isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
}

// Compare objects for equality
function isEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (Array.isArray(obj1)) {
        if (!Array.isArray(obj2) || obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => isEqual(item, obj2[index]));
    }
    
    if (typeof obj1 === 'object') {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        return keys1.every(key => isEqual(obj1[key], obj2[key]));
    }
    
    return obj1 === obj2;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file extension
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Validate file type
function validateFileType(file, allowedTypes) {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    return allowedTypes.some(type => {
        if (type.startsWith('.')) {
            return fileName.endsWith(type);
        }
        return fileType.includes(type);
    });
}

// Export utilities for global access
window.utils = {
    validators,
    validateForm,
    formatters,
    dateUtils,
    stringUtils,
    arrayUtils,
    storage,
    debounce,
    throttle,
    deepClone,
    generateUniqueId,
    percentageChange,
    sanitizeHtml,
    isEmpty,
    isEqual,
    formatFileSize,
    getFileExtension,
    validateFileType
};