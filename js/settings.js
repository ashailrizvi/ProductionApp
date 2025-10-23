// Settings Management

// Load settings form
async function loadSettingsForm() {
    try {
        const response = await fetch('tables/settings');
        const data = await response.json();
        const settings = data.data && data.data.length > 0 ? data.data[0] : null;
        
        if (settings) {
            document.getElementById('settings-default-currency').value = settings.defaultCurrency || 'PKR';
            document.getElementById('settings-base-currency').value = settings.baseCurrency || 'PKR';
            document.getElementById('settings-tax-rate').value = (settings.taxRate * 100) || 9;
            document.getElementById('settings-discount-type').value = settings.discountType || 'None';
            document.getElementById('settings-discount-value').value = settings.discountValue || 0;
            document.getElementById('settings-header-buffer').value = (settings.headerBuffer * 100) || 0;
            document.getElementById('settings-quotation-terms').value = settings.quotationTerms || '';
            document.getElementById('settings-invoice-terms').value = settings.invoiceTerms || '';
            document.getElementById('settings-quotation-notes').value = settings.quotationNotes || '';
            document.getElementById('settings-invoice-notes').value = settings.invoiceNotes || '';
        }
        
        // Load company templates - this should populate the table
        await loadCompanyTemplates();
        
        // Ensure the templates table is populated (in case templates were loaded before page was shown)
        if (window.companyTemplates && window.companyTemplates.length > 0) {
            populateTemplatesTable();
        }
        
        // Load current template selection
        await loadCurrentTemplateSelector();
        
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Failed to load settings', 'error');
    }
}

// Handle settings form submission
const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const settingsData = {
        id: '1', // Settings is a singleton
        defaultCurrency: document.getElementById('settings-default-currency').value,
        baseCurrency: document.getElementById('settings-base-currency').value,
        taxRate: parseFloat(document.getElementById('settings-tax-rate').value) / 100 || 0.09,
        discountType: document.getElementById('settings-discount-type').value,
        discountValue: parseFloat(document.getElementById('settings-discount-value').value) || 0,
        headerBuffer: parseFloat(document.getElementById('settings-header-buffer').value) / 100 || 0,
        quotationTerms: document.getElementById('settings-quotation-terms').value.trim(),
        invoiceTerms: document.getElementById('settings-invoice-terms').value.trim(),
        quotationNotes: document.getElementById('settings-quotation-notes').value.trim(),
        invoiceNotes: document.getElementById('settings-invoice-notes').value.trim()
    };
    
    try {
        showLoading();
        
        // Try to update existing settings first
        let response = await fetch('tables/settings/1', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });
        
        // If update fails, try to create new settings
        if (!response.ok) {
            response = await fetch('tables/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });
        }
        
        if (response.ok) {
            showToast('Settings saved successfully', 'success');
            await loadSettings(); // Reload global settings
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('Failed to save settings', 'error');
    } finally {
        hideLoading();
    }
    });
}

// Load currency rates table
async function loadCurrencyRatesTable() {
    try {
        const response = await fetch('tables/currency_rates');
        const data = await response.json();
        const rates = data.data || [];
        
        const tbody = document.getElementById('currency-rates-table');
        tbody.innerHTML = '';
        
        if (rates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-exchange-alt text-3xl mb-3"></i>
                        <div>No currency rates found</div>
                        <div class="text-sm">Add exchange rates to enable currency conversion</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        rates.forEach(rate => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${rate.fromCur}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${rate.toCur}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white font-mono">${parseFloat(rate.rate).toFixed(4)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-400">${rate.notes || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editCurrencyRate('${rate.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCurrencyRate('${rate.id}')" 
                            class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load currency rates:', error);
        showToast('Failed to load currency rates', 'error');
    }
}

// Show currency rate form
function showCurrencyRateForm() {
    document.getElementById('currency-rate-form').classList.remove('hidden');
    document.getElementById('currency-rate-form-element').reset();
    editingCurrencyRateId = null;
}

// Hide currency rate form
function hideCurrencyRateForm() {
    document.getElementById('currency-rate-form').classList.add('hidden');
    document.getElementById('currency-rate-form-element').reset();
    editingCurrencyRateId = null;
}

let editingCurrencyRateId = null;

// Edit currency rate
async function editCurrencyRate(rateId) {
    try {
        const response = await fetch(`tables/currency_rates/${rateId}`);
        const rate = await response.json();
        
        if (rate) {
            editingCurrencyRateId = rateId;
            document.getElementById('currency-rate-form').classList.remove('hidden');
            
            document.getElementById('from-currency').value = rate.fromCur;
            document.getElementById('to-currency').value = rate.toCur;
            document.getElementById('exchange-rate').value = rate.rate;
            document.getElementById('rate-notes').value = rate.notes || '';
        }
    } catch (error) {
        console.error('Failed to load currency rate for editing:', error);
        showToast('Failed to load currency rate', 'error');
    }
}

// Delete currency rate
async function deleteCurrencyRate(rateId) {
    if (!confirm('Are you sure you want to delete this currency rate?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`tables/currency_rates/${rateId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Currency rate deleted successfully', 'success');
            await loadCurrencyRates();
            loadCurrencyRatesTable();
        } else {
            showToast('Failed to delete currency rate', 'error');
        }
    } catch (error) {
        console.error('Failed to delete currency rate:', error);
        showToast('Failed to delete currency rate', 'error');
    } finally {
        hideLoading();
    }
}

// Handle currency rate form submission
const currencyRateForm = document.getElementById('currency-rate-form-element');
if (currencyRateForm) {
    currencyRateForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fromCur = document.getElementById('from-currency').value;
    const toCur = document.getElementById('to-currency').value;
    const rate = parseFloat(document.getElementById('exchange-rate').value);
    const notes = document.getElementById('rate-notes').value.trim();
    
    if (fromCur === toCur) {
        showToast('From and To currencies cannot be the same', 'error');
        return;
    }
    
    if (!rate || rate <= 0) {
        showToast('Exchange rate must be a positive number', 'error');
        return;
    }
    
    const rateData = {
        fromCur: fromCur,
        toCur: toCur,
        rate: rate,
        notes: notes
    };
    
    try {
        showLoading();
        let response;
        
        if (editingCurrencyRateId) {
            // Update existing rate
            response = await fetch(`tables/currency_rates/${editingCurrencyRateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rateData)
            });
        } else {
            // Check if rate already exists
            const existingRate = currencyRates.find(r => r.fromCur === fromCur && r.toCur === toCur);
            if (existingRate) {
                showToast('A rate for this currency pair already exists', 'error');
                return;
            }
            
            // Create new rate
            rateData.id = generateId();
            response = await fetch('tables/currency_rates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rateData)
            });
        }
        
        if (response.ok) {
            showToast(editingCurrencyRateId ? 'Currency rate updated successfully' : 'Currency rate created successfully', 'success');
            hideCurrencyRateForm();
            await loadCurrencyRates();
            loadCurrencyRatesTable();
        } else {
            showToast('Failed to save currency rate', 'error');
        }
    } catch (error) {
        console.error('Failed to save currency rate:', error);
        showToast('Failed to save currency rate', 'error');
    } finally {
        hideLoading();
    }
    });
}

// Currency conversion utility
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    
    const rate = getCurrencyRate(fromCurrency, toCurrency);
    if (rate === null) {
        showToast(`No exchange rate found for ${fromCurrency} to ${toCurrency}`, 'warning');
        return amount;
    }
    
    return amount * rate;
}

// Get exchange rate with automatic reverse lookup
function getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    // Direct rate
    let rate = currencyRates.find(r => r.fromCur === fromCurrency && r.toCur === toCurrency);
    if (rate) return parseFloat(rate.rate);
    
    // Reverse rate (1 / rate)
    rate = currencyRates.find(r => r.fromCur === toCurrency && r.toCur === fromCurrency);
    if (rate) return 1 / parseFloat(rate.rate);
    
    return null;
}

// Validate currency rates
function validateCurrencyRates() {
    const issues = [];
    
    // Check for duplicate pairs
    const pairs = {};
    currencyRates.forEach(rate => {
        const pairKey = `${rate.fromCur}-${rate.toCur}`;
        if (pairs[pairKey]) {
            issues.push(`Duplicate rate found: ${rate.fromCur} to ${rate.toCur}`);
        } else {
            pairs[pairKey] = true;
        }
    });
    
    // Check for zero or negative rates
    currencyRates.forEach(rate => {
        if (!rate.rate || rate.rate <= 0) {
            issues.push(`Invalid rate for ${rate.fromCur} to ${rate.toCur}: ${rate.rate}`);
        }
    });
    
    return issues;
}

// Export currency rates
async function exportCurrencyRates() {
    try {
        showLoading();
        
        const response = await fetch('tables/currency_rates');
        const data = await response.json();
        const rates = data.data || [];
        
        const excelData = rates.map(rate => ({
            'From Currency': rate.fromCur,
            'To Currency': rate.toCur,
            'Exchange Rate': rate.rate,
            'Notes': rate.notes || ''
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        XLSX.utils.book_append_sheet(wb, ws, 'Currency Rates');
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Currency_Rates_${dateStr}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        showToast('Currency rates exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export currency rates:', error);
        showToast('Failed to export currency rates', 'error');
    } finally {
        hideLoading();
    }
}

// Auto-update dependent fields when base currency changes
document.addEventListener('DOMContentLoaded', function() {
    const baseCurrencySelect = document.getElementById('settings-base-currency');
    
    if (baseCurrencySelect) {
        baseCurrencySelect.addEventListener('change', function() {
            const newBaseCurrency = this.value;
            
            if (newBaseCurrency !== settings.baseCurrency) {
                showToast(`Changing base currency to ${newBaseCurrency}. Make sure to update exchange rates accordingly.`, 'warning');
            }
        });
    }
});

// Company Templates Management
let editingTemplateId = null;
let companyTemplates = [];

// Load company templates
async function loadCompanyTemplates() {
    try {
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        companyTemplates = data.data || [];
        
        // Store globally for access by current template selector
        window.companyTemplates = companyTemplates;
        
        // Try to populate the templates table if it exists
        populateTemplatesTable();
        
    } catch (error) {
        console.error('Failed to load company templates:', error);
        showToast('Failed to load company templates', 'error');
    }
}

// Separate function to populate the templates table
function populateTemplatesTable() {
    const tbody = document.getElementById('templates-table');
    if (!tbody) {
        // Table not found, likely not on settings page
        return;
    }
    
    tbody.innerHTML = '';
        
    if (!companyTemplates || companyTemplates.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-building text-3xl mb-3"></i>
                    <div>No company templates found</div>
                    <div class="text-sm">Create your first template to get started</div>
                </td>
            </tr>
        `;
        return;
    }
    
    companyTemplates.forEach(template => {
        const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            row.innerHTML = `
                <td class="px-4 py-3">
                    <div class="text-sm font-medium text-white">${template.name}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-white">${template.companyName}</div>
                    <div class="text-xs text-gray-400">${template.companyEmail || ''}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-white">${template.defaultCurrency}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm">
                        ${template.isDefault ? '<span class="bg-green-600 text-white px-2 py-1 rounded text-xs">Default</span>' : '-'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm">
                        <span class="bg-${template.isActive ? 'green' : 'red'}-600 text-white px-2 py-1 rounded text-xs">
                            ${template.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium">
                    <button onclick="editTemplate('${template.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="duplicateTemplate('${template.id}')" 
                            class="text-green-400 hover:text-green-300 mr-3" title="Duplicate">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${!template.isDefault ? `<button onclick="setDefaultTemplate('${template.id}')" 
                            class="text-yellow-400 hover:text-yellow-300 mr-3" title="Set as Default">
                        <i class="fas fa-star"></i>
                    </button>` : ''}
                    <button onclick="deleteTemplate('${template.id}')" 
                            class="text-red-400 hover:text-red-300" title="Delete"
                            ${template.isDefault ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        tbody.appendChild(row);
    });
}

// Show template form
async function showTemplateForm() {
    document.getElementById('template-form-modal').classList.remove('hidden');
    document.getElementById('template-form').reset();
    document.getElementById('template-form-title').textContent = 'Add Company Template';
    editingTemplateId = null;
    
    try {
        // Load current application settings to use as defaults
        const response = await fetch('tables/settings');
        const data = await response.json();
        const settings = data.data && data.data.length > 0 ? data.data[0] : null;
        
        if (settings) {
            // Set default values from application settings
            document.getElementById('template-currency').value = settings.defaultCurrency || 'PKR';
            document.getElementById('template-tax-rate').value = ((settings.taxRate || 0.09) * 100).toFixed(2);
            document.getElementById('template-header-buffer').value = ((settings.headerBuffer || 0.15) * 100).toFixed(2);
            document.getElementById('template-discount-type').value = settings.discountType || 'None';
            document.getElementById('template-discount-value').value = settings.discountValue || '0';
            
            // Pre-populate terms and notes from application settings
            document.getElementById('template-quotation-terms').value = settings.quotationTerms || '';
            document.getElementById('template-invoice-terms').value = settings.invoiceTerms || '';
            document.getElementById('template-quotation-notes').value = settings.quotationNotes || '';
            document.getElementById('template-invoice-notes').value = settings.invoiceNotes || '';
        } else {
            // Fallback default values if no settings found
            document.getElementById('template-currency').value = 'PKR';
            document.getElementById('template-tax-rate').value = '9.00';
            document.getElementById('template-header-buffer').value = '15.00';
            document.getElementById('template-discount-type').value = 'None';
            document.getElementById('template-discount-value').value = '0';
        }
    } catch (error) {
        console.error('Failed to load settings for template defaults:', error);
        // Use fallback defaults
        document.getElementById('template-currency').value = 'PKR';
        document.getElementById('template-tax-rate').value = '9.00';
        document.getElementById('template-header-buffer').value = '15.00';
        document.getElementById('template-discount-type').value = 'None';
        document.getElementById('template-discount-value').value = '0';
    }
}

// Close template form
function closeTemplateForm() {
    document.getElementById('template-form-modal').classList.add('hidden');
}

// Edit template
async function editTemplate(templateId) {
    try {
        const response = await fetch(`tables/company_templates/${templateId}`);
        const template = await response.json();
        
        if (!template) {
            showToast('Template not found', 'error');
            return;
        }
        
        document.getElementById('template-form-modal').classList.remove('hidden');
        document.getElementById('template-form-title').textContent = 'Edit Company Template';
        editingTemplateId = templateId;
        
        // Populate form
        document.getElementById('template-id').value = template.id;
        document.getElementById('template-name').value = template.name;
        document.getElementById('template-default').checked = template.isDefault;
        document.getElementById('template-company-name').value = template.companyName;
        document.getElementById('template-company-phone').value = template.companyPhone || '';
        document.getElementById('template-company-email').value = template.companyEmail || '';
        document.getElementById('template-company-logo').value = template.companyLogo || '';
        document.getElementById('template-company-address').value = template.companyAddress || '';
        document.getElementById('template-currency').value = template.defaultCurrency;
        document.getElementById('template-tax-rate').value = (template.taxRate * 100).toFixed(2);
        document.getElementById('template-header-buffer').value = (template.headerBuffer * 100).toFixed(2);
        document.getElementById('template-discount-type').value = template.discountType;
        document.getElementById('template-discount-value').value = template.discountValue;
        document.getElementById('template-quotation-terms').value = template.quotationTerms || '';
        document.getElementById('template-invoice-terms').value = template.invoiceTerms || '';
        document.getElementById('template-quotation-notes').value = template.quotationNotes || '';
        document.getElementById('template-invoice-notes').value = template.invoiceNotes || '';
        
    } catch (error) {
        console.error('Failed to load template:', error);
        showToast('Failed to load template', 'error');
    }
}

// Duplicate template
async function duplicateTemplate(templateId) {
    try {
        const response = await fetch(`tables/company_templates/${templateId}`);
        const template = await response.json();
        
        if (!template) {
            showToast('Template not found', 'error');
            return;
        }
        
        document.getElementById('template-form-modal').classList.remove('hidden');
        document.getElementById('template-form-title').textContent = 'Duplicate Company Template';
        editingTemplateId = null;
        
        // Populate form with template data but clear ID and modify name
        document.getElementById('template-id').value = '';
        document.getElementById('template-name').value = template.name + ' (Copy)';
        document.getElementById('template-default').checked = false; // Copy can't be default
        document.getElementById('template-company-name').value = template.companyName;
        document.getElementById('template-company-phone').value = template.companyPhone || '';
        document.getElementById('template-company-email').value = template.companyEmail || '';
        document.getElementById('template-company-logo').value = template.companyLogo || '';
        document.getElementById('template-company-address').value = template.companyAddress || '';
        document.getElementById('template-currency').value = template.defaultCurrency;
        document.getElementById('template-tax-rate').value = (template.taxRate * 100).toFixed(2);
        document.getElementById('template-header-buffer').value = (template.headerBuffer * 100).toFixed(2);
        document.getElementById('template-discount-type').value = template.discountType;
        document.getElementById('template-discount-value').value = template.discountValue;
        document.getElementById('template-quotation-terms').value = template.quotationTerms || '';
        document.getElementById('template-invoice-terms').value = template.invoiceTerms || '';
        document.getElementById('template-quotation-notes').value = template.quotationNotes || '';
        document.getElementById('template-invoice-notes').value = template.invoiceNotes || '';
        
    } catch (error) {
        console.error('Failed to duplicate template:', error);
        showToast('Failed to duplicate template', 'error');
    }
}

// Set default template
async function setDefaultTemplate(templateId) {
    try {
        showLoading();
        
        // First, remove default flag from all templates
        for (const template of companyTemplates) {
            if (template.isDefault) {
                await fetch(`tables/company_templates/${template.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDefault: false })
                });
            }
        }
        
        // Set new default
        await fetch(`tables/company_templates/${templateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: true })
        });
        
        showToast('Default template updated successfully', 'success');
        loadCompanyTemplates();
        
    } catch (error) {
        console.error('Failed to set default template:', error);
        showToast('Failed to set default template', 'error');
    } finally {
        hideLoading();
    }
}

// Delete template
async function deleteTemplate(templateId) {
    const template = companyTemplates.find(t => t.id === templateId);
    
    if (template && template.isDefault) {
        showToast('Cannot delete the default template', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this template?')) {
        return;
    }
    
    try {
        showLoading();
        
        await fetch(`tables/company_templates/${templateId}`, {
            method: 'DELETE'
        });
        
        showToast('Template deleted successfully', 'success');
        loadCompanyTemplates();
        
    } catch (error) {
        console.error('Failed to delete template:', error);
        showToast('Failed to delete template', 'error');
    } finally {
        hideLoading();
    }
}

// Handle template form submission
document.addEventListener('DOMContentLoaded', function() {
    const templateForm = document.getElementById('template-form');
    if (templateForm) {
        templateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const templateData = {
                name: document.getElementById('template-name').value.trim(),
                companyName: document.getElementById('template-company-name').value.trim(),
                companyPhone: document.getElementById('template-company-phone').value.trim(),
                companyEmail: document.getElementById('template-company-email').value.trim(),
                companyLogo: document.getElementById('template-company-logo').value.trim(),
                companyAddress: document.getElementById('template-company-address').value.trim(),
                defaultCurrency: document.getElementById('template-currency').value,
                taxRate: parseFloat(document.getElementById('template-tax-rate').value) / 100 || 0,
                headerBuffer: parseFloat(document.getElementById('template-header-buffer').value) / 100 || 0,
                discountType: document.getElementById('template-discount-type').value,
                discountValue: parseFloat(document.getElementById('template-discount-value').value) || 0,
                quotationTerms: document.getElementById('template-quotation-terms').value.trim(),
                invoiceTerms: document.getElementById('template-invoice-terms').value.trim(),
                quotationNotes: document.getElementById('template-quotation-notes').value.trim(),
                invoiceNotes: document.getElementById('template-invoice-notes').value.trim(),
                isDefault: document.getElementById('template-default').checked,
                isActive: true
            };
            
            if (!templateData.name || !templateData.companyName) {
                showToast('Please fill in required fields', 'error');
                return;
            }
            
            try {
                showLoading();
                
                // If setting as default, remove default from others first
                if (templateData.isDefault) {
                    for (const template of companyTemplates) {
                        if (template.isDefault && template.id !== editingTemplateId) {
                            await fetch(`tables/company_templates/${template.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isDefault: false })
                            });
                        }
                    }
                }
                
                let response;
                if (editingTemplateId) {
                    // Update existing template
                    response = await fetch(`tables/company_templates/${editingTemplateId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(templateData)
                    });
                } else {
                    // Create new template
                    response = await fetch('tables/company_templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(templateData)
                    });
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                showToast(`Template ${editingTemplateId ? 'updated' : 'created'} successfully`, 'success');
                closeTemplateForm();
                loadCompanyTemplates();
                
            } catch (error) {
                console.error('Failed to save template:', error);
                showToast('Failed to save template', 'error');
            } finally {
                hideLoading();
            }
        });
    }
});

// Current Template Selection Management

// Load current template selector
async function loadCurrentTemplateSelector() {
    try {
        // Load templates for dropdown
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        const templates = data.data || [];

        const selector = document.getElementById('current-template-selector');
        if (!selector) return;

        // Clear existing options except the first one
        selector.innerHTML = '<option value="">No template selected</option>';
        
        // Add templates to dropdown
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} - ${template.companyName}`;
            if (template.isDefault) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        // Update template info display
        updateCurrentTemplateInfo();

        // Add event listener for template selection changes
        selector.addEventListener('change', updateCurrentTemplateInfo);

    } catch (error) {
        console.error('Failed to load current template selector:', error);
        showToast('Failed to load template selector', 'error');
    }
}

// Update current template info display
function updateCurrentTemplateInfo() {
    const selector = document.getElementById('current-template-selector');
    const infoDiv = document.getElementById('current-template-info');
    const companyNameDiv = document.getElementById('current-template-company-name');
    const detailsDiv = document.getElementById('current-template-details');

    if (!selector.value) {
        infoDiv.classList.add('hidden');
        return;
    }

    // Find the selected template
    const selectedTemplateId = selector.value;
    
    // Get template data from global templates array (loaded in loadCompanyTemplates)
    if (window.companyTemplates) {
        const template = window.companyTemplates.find(t => t.id === selectedTemplateId);
        if (template) {
            companyNameDiv.textContent = template.companyName;
            detailsDiv.innerHTML = `
                <div class="text-xs">${template.companyEmail || ''}</div>
                <div class="text-xs">${template.companyPhone || ''}</div>
                <div class="text-xs mt-1">Currency: ${template.defaultCurrency}, Tax: ${(template.taxRate * 100).toFixed(1)}%</div>
            `;
            infoDiv.classList.remove('hidden');
        }
    }
}

// Save current template selection
document.getElementById('save-current-template')?.addEventListener('click', async function() {
    try {
        const selectedTemplateId = document.getElementById('current-template-selector').value;
        
        if (!selectedTemplateId) {
            showToast('Please select a template first', 'warning');
            return;
        }

        showLoading();

        // First, set all templates to not default
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        const templates = data.data || [];

        // Update all templates to remove default status
        const updatePromises = templates.map(async (template) => {
            if (template.isDefault && template.id !== selectedTemplateId) {
                return fetch(`tables/company_templates/${template.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDefault: false })
                });
            }
        });

        await Promise.all(updatePromises.filter(Boolean));

        // Set selected template as default
        const updateResponse = await fetch(`tables/company_templates/${selectedTemplateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: true })
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update template default status');
        }

        // Store in localStorage for immediate use
        localStorage.setItem('currentTemplateId', selectedTemplateId);

        showToast('Current template updated successfully', 'success');
        loadCompanyTemplates(); // Refresh the templates display

    } catch (error) {
        console.error('Failed to save current template:', error);
        showToast('Failed to save current template selection', 'error');
    } finally {
        hideLoading();
    }
});

// Global function to get current template ID
function getCurrentTemplateId() {
    // First check localStorage
    const storedId = localStorage.getItem('currentTemplateId');
    if (storedId) return storedId;
    
    // Fallback to checking for default template
    if (window.companyTemplates) {
        const defaultTemplate = window.companyTemplates.find(t => t.isDefault);
        if (defaultTemplate) return defaultTemplate.id;
    }
    
    return null;
}
