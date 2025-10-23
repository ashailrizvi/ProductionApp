// Main Application JavaScript
let currentPage = 'dashboard';
let currentInvoiceId = null;
let services = [];
let bundles = [];
let invoices = [];
let quotations = [];
let customers = [];
let settings = {};
let currencyRates = [];

// Environment variable for access password
// In GenSpark, this would be read from environment variables
// For now, set this to enable password gate (empty string disables it)
const ACCESS_PASSWORD = (typeof process !== 'undefined' && process?.env?.ACCESS_PASSWORD) || ''; // Set this to enable password gate

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check for access password
    if (ACCESS_PASSWORD && ACCESS_PASSWORD.trim() !== '') {
        showPasswordGate();
    } else {
        initializeApp();
    }
});

// Show password gate
function showPasswordGate() {
    document.getElementById('password-gate').classList.remove('hidden');
    
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('access-password').value;
        
            if (password === ACCESS_PASSWORD) {
                document.getElementById('password-gate').classList.add('hidden');
                initializeApp();
            } else {
                document.getElementById('password-error').classList.remove('hidden');
                document.getElementById('access-password').value = '';
            }
        });
    }
}

// Initialize the application
async function initializeApp() {
    try {
        showLoading();
        
        // Load data efficiently with parallel loading where safe
        await loadSettings();
        
        // Load core data in parallel for better performance
        await Promise.all([
            loadServices(),
            loadBundles(),
            loadCustomers(),
            loadCompanyTemplates(),
            loadCurrencyRates()
        ]);
        
        // Load quotations and invoices after core data
        await Promise.all([
            loadInvoices(),
            loadQuotations()
        ]);
        
        // Make load functions globally available for dependencies
        window.loadServices = loadServices;
        window.loadBundles = loadBundles;
        window.loadCustomers = loadCustomers;
        window.loadSettings = loadSettings;
        window.loadCompanyTemplates = loadCompanyTemplates;
        
        // Setup navigation
        setupNavigation();
        
        // Show dashboard by default
        showPage('dashboard');
        
        hideLoading();
        
        showToast('Application initialized successfully', 'success');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showToast('Failed to initialize application. Check console for details.', 'error');
        hideLoading();
        
        // Still try to show dashboard even if data loading fails
        try {
            showPage('dashboard');
        } catch (navError) {
            console.error('Navigation also failed:', navError);
        }
    }
}

// Navigation setup
function setupNavigation() {
    // Desktop navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Mobile navigation
    document.querySelectorAll('.nav-link-mobile').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
            // Hide mobile menu
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        });
    });
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) {
                mobileMenu.classList.toggle('hidden');
            }
        });
    }
}

// Show specific page
function showPage(page, subPage = null) {

    
    // Hide all pages
    const allPages = document.querySelectorAll('.page-content');
    console.log('Found page elements:', allPages.length);
    allPages.forEach(pageEl => {
        pageEl.classList.add('hidden');
    });
    
    // Update navigation active state
    document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(link => {
        link.classList.remove('bg-gray-900', 'text-white');
        link.classList.add('text-gray-300');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`page-${page}`);
    console.log('Page element found:', pageElement ? 'yes' : 'no');
    
    if (pageElement) {
        pageElement.classList.remove('hidden');
        currentPage = page;
        
        // Update active navigation
        const activeLinks = document.querySelectorAll(`[data-page="${page}"]`);
        activeLinks.forEach(link => {
            link.classList.add('bg-gray-900', 'text-white');
            link.classList.remove('text-gray-300');
        });
        
        // Handle sub-pages
        console.log('Loading page content for:', page);
        switch (page) {
            case 'dashboard':
                if (typeof updateDashboardStats === 'function') {
                    updateDashboardStats();
                } else {
                    console.warn('updateDashboardStats function not found');
                }
                break;
            case 'services':
                if (typeof loadServicesTable === 'function') {
                    loadServicesTable();
                } else {
                    console.warn('loadServicesTable function not found');
                }
                break;
            case 'bundles':
                if (typeof loadBundlesView === 'function') {
                    loadBundlesView();
                } else {
                    console.warn('loadBundlesView function not found');
                }
                break;
            case 'customers':
                if (typeof loadCustomersTable === 'function') {
                    loadCustomersTable();
                } else {
                    console.warn('loadCustomersTable function not found');
                }
                break;
            case 'invoices':
                // Ensure any overlays/modals don't block the list
                try { hideLoading && hideLoading(); } catch {}
                try { document.getElementById('invoice-preview-modal')?.classList.add('hidden'); } catch {}
                try { window.__invoicesLoaded = false; } catch {}
                if (subPage === 'new') {
                    if (typeof showInvoiceBuilder === 'function') {
                        showInvoiceBuilder();
                    } else {
                        console.warn('showInvoiceBuilder function not found');
                    }
                } else {
                    if (typeof loadInvoicesTable === 'function') {
                        loadInvoicesTable(1);
                        // Fallback: if content is still empty after a short delay, try once more
                        setTimeout(() => {
                            const pageEl = document.getElementById('page-invoices');
                            const tbody = document.getElementById('invoices-table');
                            const empty = tbody && tbody.children && tbody.children.length === 0;
                            if (pageEl && !pageEl.classList.contains('hidden') && empty && !window.__invoicesLoaded) {
                                loadInvoicesTable(1);
                            }
                        }, 400);
                    } else {
                        console.warn('loadInvoicesTable function not found');
                    }
                }
                break;
            case 'quotations':
                if (subPage === 'new') {
                    if (typeof showQuotationBuilder === 'function') {
                        showQuotationBuilder();
                    } else {
                        console.warn('showQuotationBuilder function not found');
                    }
                } else {
                    if (typeof loadQuotationsTable === 'function') {
                        loadQuotationsTable(1);
                    } else {
                        console.warn('loadQuotationsTable function not found');
                    }
                }
                break;
            case 'settings':
                if (typeof loadSettingsForm === 'function') {
                    loadSettingsForm();
                } else {
                    console.warn('loadSettingsForm function not found');
                }
                if (typeof loadCurrencyRatesTable === 'function') {
                    loadCurrencyRatesTable();
                } else {
                    console.warn('loadCurrencyRatesTable function not found');
                }
                // Ensure company templates are loaded for the settings page
                if (typeof loadCompanyTemplates === 'function') {
                    loadCompanyTemplates();
                }
                break;
            default:
                console.warn('Unknown page:', page);
        }
    } else {
        console.error('Page element not found:', `page-${page}`);
    }
}

// Update dashboard statistics
async function updateDashboardStats() {
    try {
        const servicesData = await fetch('tables/services').then(r => r.json());
        const bundlesData = await fetch('tables/bundles').then(r => r.json());
        const customersData = await fetch('tables/customers').then(r => r.json());
        
        document.getElementById('stats-services').textContent = servicesData.total || 0;
        document.getElementById('stats-bundles').textContent = bundlesData.total || 0;
        document.getElementById('stats-customers').textContent = customersData.total || 0;
    } catch (error) {
        console.error('Failed to update dashboard stats:', error);
        // Set default values
        document.getElementById('stats-services').textContent = '0';
        document.getElementById('stats-bundles').textContent = '0';
        document.getElementById('stats-customers').textContent = '0';
        document.getElementById('stats-currencies').textContent = '0';
    }
}

// Load application data
async function loadSettings() {
    try {
        console.log('Loading settings...');
        const response = await fetch('tables/settings');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            settings = data.data[0];
            console.log('Settings loaded from database');
        } else {
            // Use default settings
            settings = {
                id: '1',
                defaultCurrency: 'PKR',
                baseCurrency: 'PKR',
                taxRate: 0.09,
                discountType: 'None',
                discountValue: 0,
                headerBuffer: 0
            };
            console.log('Using default settings');
        }
    } catch (error) {
        console.warn('Failed to load settings from database, using defaults:', error.message);
        settings = {
            id: '1',
            defaultCurrency: 'PKR',
            baseCurrency: 'PKR',
            taxRate: 0.09,
            discountType: 'None',
            discountValue: 0,
            headerBuffer: 0
        };
    }
}

async function loadServices() {
    try {
        console.log('Loading services...');
        const response = await fetch('tables/services');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        services = data.data || [];
        window.services = services; // Make globally available
        console.log(`Loaded ${services.length} services`);
    } catch (error) {
        console.warn('Failed to load services:', error.message);
        services = [];
        window.services = [];
    }
}

async function loadBundles() {
    try {
        console.log('Loading bundles...');
        const response = await fetch('tables/bundles');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        bundles = data.data || [];
        window.bundles = bundles; // Make globally available
        console.log(`Loaded ${bundles.length} bundles`);
    } catch (error) {
        console.warn('Failed to load bundles:', error.message);
        bundles = [];
        window.bundles = [];
    }
}

async function loadCustomers() {
    try {
        console.log('Loading customers...');
        const response = await fetch('tables/customers');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        customers = data.data || [];
        window.customers = customers; // Make globally available
        console.log(`Loaded ${customers.length} customers`);
    } catch (error) {
        console.warn('Failed to load customers:', error.message);
        customers = [];
        window.customers = [];
    }
}

async function loadInvoices() {
    try {
        const response = await fetch('tables/invoices');
        const data = await response.json();
        invoices = data.data || [];
    } catch (error) {
        console.error('Failed to load invoices:', error);
        invoices = [];
    }
}

async function loadQuotations() {
    try {
        const response = await fetch('tables/quotations');
        const data = await response.json();
        quotations = data.data || [];
        window.quotations = quotations; // Make globally available
    } catch (error) {
        console.error('Failed to load quotations:', error);
        quotations = [];
        window.quotations = [];
    }
}

async function loadCurrencyRates() {
    try {
        const response = await fetch('tables/currency_rates');
        const data = await response.json();
        currencyRates = data.data || [];
    } catch (error) {
        console.error('Failed to load currency rates:', error);
        currencyRates = [];
    }
}

async function loadCompanyTemplates() {
    try {
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        companyTemplates = data.data || [];
        window.companyTemplates = companyTemplates; // Make globally available
        console.log(`Loaded ${companyTemplates.length} company templates`);
    } catch (error) {
        console.error('Failed to load company templates:', error);
        companyTemplates = [];
        window.companyTemplates = [];
    }
}

// Utility functions
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    } else {
        console.log('⚠️ Loading overlay element not found, skipping loading indicator');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    } else {
        console.log('⚠️ Loading overlay element not found, skipping hide loading');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast max-w-sm w-full bg-gray-800 shadow-lg rounded-lg pointer-events-auto border-l-4 ${
        type === 'success' ? 'border-green-500' : 
        type === 'error' ? 'border-red-500' : 
        type === 'warning' ? 'border-yellow-500' : 'border-blue-500'
    }`;
    
    const icon = type === 'success' ? 'fa-check-circle text-green-500' :
                type === 'error' ? 'fa-exclamation-circle text-red-500' :
                type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' : 'fa-info-circle text-blue-500';
    
    toast.innerHTML = `
        <div class="p-4">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="ml-3 w-0 flex-1">
                    <p class="text-sm font-medium text-gray-100">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button class="bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">
                        <span class="sr-only">Close</span>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    } else {
        console.log(`TOAST [${type}]: ${message}`);
    }
}

// Format currency
function formatCurrency(amount, currency = 'PKR') {
    if (amount === null || amount === undefined || amount === '') {
        return 'TBD';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    try {
        return formatter.format(amount);
    } catch (error) {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }
}

// Format number
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    return parseFloat(value).toFixed(decimals);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Pricing calculation functions
function calculateAdjustedRate(rate, bundleCost = 0, headerBuffer = 0, lineBuffer = 0) {
    const baseRate = (parseFloat(rate) || 0) + (parseFloat(bundleCost) || 0);
    const headerMultiplier = 1 + (parseFloat(headerBuffer) || 0) / 100;
    const lineMultiplier = 1 + (parseFloat(lineBuffer) || 0) / 100;
    
    return baseRate * headerMultiplier * lineMultiplier;
}

function calculateLineTotal(adjustedRate, quantity) {
    return (parseFloat(adjustedRate) || 0) * (parseFloat(quantity) || 1);
}

// Get currency exchange rate
function getCurrencyRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    const rate = currencyRates.find(r => r.fromCur === fromCurrency && r.toCur === toCurrency);
    return rate ? parseFloat(rate.rate) : null;
}

// Get service by ID
function getServiceById(serviceId) {
    return services.find(s => s.id === serviceId);
}

// Get service by code
function getServiceByCode(serviceCode) {
    return services.find(s => s.serviceCode === serviceCode);
}

// Make navigation function globally available
window._actualShowPage = showPage;
window.showPage = showPage;

// Make services globally accessible for invoices
window.getServices = function() {
    return window.services || services || [];
};

// Handle any pending page navigation
if (window._pendingPage) {
    setTimeout(() => {
        showPage(window._pendingPage.page, window._pendingPage.subPage);
        window._pendingPage = null;
    }, 100);
}

// Export functions for use in other modules
window.app = {
    showPage,
    showToast,
    showLoading,
    hideLoading,
    formatCurrency,
    formatDate,
    formatNumber,
    generateId,
    calculateAdjustedRate,
    calculateLineTotal,
    getCurrencyRate,
    getServiceById,
    getServiceByCode,
    loadServices,
    loadBundles,
    loadCustomers,
    loadInvoices,
    loadSettings,
    loadCurrencyRates
};

// CRITICAL FIX: Make key functions globally accessible for invoice preview
// These functions are called by invoice rendering code and must be available globally
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.generateId = generateId;
window.calculateAdjustedRate = calculateAdjustedRate;
window.calculateLineTotal = calculateLineTotal;
window.getCurrencyRate = getCurrencyRate;

// Backup navigation setup in case the main one doesn't work
setTimeout(() => {
    console.log('Running backup navigation setup...');
    
    // Ensure navigation is set up after all scripts have loaded
    document.querySelectorAll('a[data-page]').forEach(link => {
        if (!link.hasAttribute('data-nav-setup')) {
            link.setAttribute('data-nav-setup', 'true');
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                console.log('Backup nav clicked:', page);
                showPage(page);
            });
        }
    });
    
    // Also set up onclick handlers for dashboard quick actions
    document.querySelectorAll('[onclick^="showPage"]').forEach(element => {
        const onclickValue = element.getAttribute('onclick');
        element.removeAttribute('onclick');
        element.addEventListener('click', function(e) {
            e.preventDefault();
            try {
                // Wrap in function to handle return statements
                new Function(onclickValue)();
            } catch (error) {
                console.warn('Error executing onclick:', onclickValue, error);
                // Fallback: extract showPage call
                const match = onclickValue.match(/showPage\(['"]([^'"]+)['"]\)/);
                if (match) {
                    showPage(match[1]);
                }
            }
            return false;
        });
    });
    
}, 2000);
