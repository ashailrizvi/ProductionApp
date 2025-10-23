// Quotations Management
let quotationLines = [];
let currentQuotation = {};
let currentQuotationId = null;

// Pagination state
let quotationsCurrentPage = 1;
let quotationsPerPage = 5;
let quotationsTotalPages = 1;
let quotationsTotalItems = 0;

// Show quotation builder
async function showQuotationBuilder() {
    document.getElementById('quotations-list').classList.add('hidden');
    document.getElementById('quotation-builder').classList.remove('hidden');
    
    // Initialize form listeners
    initializeQuotationFormListeners();
    
    // Load company templates and apply default
    await loadQuotationTemplates();
    
    // Initialize new quotation - FORCE complete reset
    currentQuotation = null;
    currentQuotation = {};
    
    // Force clear quotation lines array
    quotationLines.splice(0, quotationLines.length); // Remove all elements
    
    currentQuotationId = null;
    
    // Clear the quotation lines table immediately and force refresh
    const quotationLinesTable = document.getElementById('quotation-lines');
    if (quotationLinesTable) {
        quotationLinesTable.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-4">No line items</td></tr>';
        setTimeout(() => {
            quotationLinesTable.innerHTML = '';
        }, 50);
    }
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('quote-issue-date').value = today;
    
    // Set valid until date to 30 days from now
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    document.getElementById('quote-valid-until').value = validDate.toISOString().split('T')[0];
    
    // Set defaults from settings
    document.getElementById('quotation-currency').value = settings.defaultCurrency || 'PKR';
    document.getElementById('quote-header-buffer').value = (settings.headerBuffer * 100) || 0;
    document.getElementById('quote-tax-rate').value = (settings.taxRate * 100) || 9;
    document.getElementById('quote-discount-type').value = settings.discountType || 'None';
    document.getElementById('quote-discount-value').value = settings.discountValue || 0;
    document.getElementById('quotation-status').value = 'Current';
    
    // Update status display
    const statusDisplay = document.getElementById('quotation-status-display');
    if (statusDisplay) {
        statusDisplay.textContent = 'Current';
    }
    
    // Generate quotation number
    const quotationNumber = generateQuotationNumber();
    document.getElementById('quotation-number').value = quotationNumber;
    
    // Clear client fields
    document.getElementById('quote-client-name').value = '';
    document.getElementById('quote-contact-person').value = '';
    document.getElementById('quote-project-title').value = '';
    document.getElementById('quote-client-address').value = '';
    document.getElementById('quotation-notes').value = '';
    
    // Load default quotation notes from settings
    if (settings.quotationNotes) {
        document.getElementById('quotation-notes').value = settings.quotationNotes;
    }
    
    // Load customer dropdown
    try {
        await loadQuoteCustomerDropdown();
    } catch (error) {
        console.error('Failed to load customer dropdown:', error);
    }
    
    // Ensure services are loaded
    
    if ((!services || services.length === 0) && (!window.services || window.services.length === 0)) {
        if (typeof loadServices === 'function') {
            await loadServices();
        } else {
            // Try loading services directly from API
            try {
                const response = await fetch('tables/services');
                if (response.ok) {
                    const data = await response.json();
                    services = data.data || [];
                    window.services = services;
                }
            } catch (error) {
                console.error('Failed to load services from API:', error);
            }
        }
    }
    
    // Ensure bundles are loaded
    if ((!bundles || bundles.length === 0) && (!window.bundles || window.bundles.length === 0)) {
        if (typeof loadBundles === 'function') {
            await loadBundles();
        } else {
            // Try loading bundles directly from API
            try {
                const response = await fetch('tables/bundles');
                if (response.ok) {
                    const data = await response.json();
                    bundles = data.data || [];
                    window.bundles = bundles;
                }
            } catch (error) {
                console.error('Failed to load bundles from API:', error);
            }
        }
    }
    
    // Add default first line item
    addQuotationLine();
    
    // Update tables and totals (delay to ensure services are available)
    setTimeout(async () => {
        updateQuotationLinesTable();
        refreshQuoteServiceDropdowns();
        updateQuotationTotals();
        
        // Try loading customer dropdown again with a delay
        try {
            await loadQuoteCustomerDropdown();
        } catch (error) {
            console.error('Delayed customer dropdown load failed:', error);
        }
    }, 200);
}

// Generate quotation number
function generateQuotationNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Use full timestamp + random component for uniqueness
    const timestamp = now.getTime().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uniquePart = (timestamp + random).slice(-8); // Last 8 digits for more uniqueness
    return `QUO-${year}${month}-${uniquePart}`;
}

// Generate revision number for edited quotations
function generateRevisionNumber(originalNumber) {
    // Extract parts: QUO-YYYYMM-XXXXXX
    const parts = originalNumber.split('-');
    if (parts.length === 3) {
        const prefix = parts[0]; // QUO
        const datePart = parts[1]; // YYYYMM
        const timestampPart = parts[2]; // XXXXXX
        
        // Increment the last digit of the timestamp part
        let timestamp = parseInt(timestampPart);
        timestamp += 1;
        const newTimestampPart = String(timestamp).padStart(6, '0');
        
        return `${prefix}-${datePart}-${newTimestampPart}`;
    }
    
    // Fallback: append revision indicator
    return originalNumber + '-R';
}

// Check and auto-expire quotations past their validUntil date
async function checkAndExpireQuotations(quotations) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const updatedQuotations = [];
    
    for (const quotation of quotations) {
        if (quotation.status === 'Current' && quotation.validUntil) {
            const validDate = new Date(quotation.validUntil);
            validDate.setHours(23, 59, 59, 999); // End of valid date
            
            if (today > validDate) {
                // Quotation has expired - update it
                try {
                    const updateData = { status: 'Expired' };
                    await fetch(`tables/quotations/${quotation.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    // Update the local copy
                    quotation.status = 'Expired';
                } catch (error) {
                    console.error('Failed to expire quotation:', error);
                }
            }
        }
        
        updatedQuotations.push(quotation);
    }
    
    return updatedQuotations;
}

// Load quotations table
let isLoadingQuotations = false; // Prevent concurrent calls
async function loadQuotationsTable(page = 1) {
    // Prevent concurrent loading
    if (isLoadingQuotations) {
        return;
    }
    
    isLoadingQuotations = true;
    
    try {

        document.getElementById('quotation-builder').classList.add('hidden');
        document.getElementById('quotations-list').classList.remove('hidden');
        
        // Update template status display
        updateQuotationTemplateStatus();
        
        // Show loading state
        const tbody = document.getElementById('quotations-table');
        
        if (page === 1) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-400">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <div>Loading quotations...</div>
                    </td>
                </tr>
            `;
        }
        
        // Fetch paginated quotations (sorted by most recent first)  
        const url = `tables/quotations?page=${page}&limit=${quotationsPerPage}`;
        const response = await fetch(url);
        const data = await response.json();
        let quotations = data.data || [];
        
        // Update pagination state
        quotationsCurrentPage = data.page || page;
        quotationsTotalItems = data.total || 0;
        quotationsTotalPages = Math.ceil(quotationsTotalItems / quotationsPerPage);
        
        
        // Auto-expire quotations that are past their validUntil date
        quotations = await checkAndExpireQuotations(quotations);
        
        // Clear table for fresh content
        tbody.innerHTML = '';
        
        if (quotations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-file-contract text-4xl mb-4"></i>
                        <div>${quotationsTotalItems === 0 ? 'No quotations found' : 'No quotations on this page'}</div>
                        <div class="text-sm">${quotationsTotalItems === 0 ? 'Create your first quotation to get started' : 'Try a different page'}</div>
                    </td>
                </tr>
            `;
            // Still update pagination even if no results on current page
            updateQuotationsPagination();
            return;
        }
        
        // Calculate totals for each quotation
        for (const quotation of quotations) {
            // Check if row already exists (duplicate prevention)
            const existingRow = tbody.querySelector(`tr[data-quotation-id="${quotation.id}"]`);
            if (existingRow) {
                continue;
            }
            // Get lines for this specific quotation only
            const linesResponse = await fetch(`tables/quotation_lines`);
            const allLinesData = await linesResponse.json();
            const allLines = allLinesData.data || [];
            
            // Filter lines for this quotation specifically
            const lines = allLines.filter(line => line.quotationId === quotation.id);
            
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const headerBuffer = subtotal * (quotation.headerBuffer || 0);
            const bufferedSubtotal = subtotal + headerBuffer;
            const taxAmount = bufferedSubtotal * (quotation.taxRate || 0);
            
            let discountAmount = 0;
            if (quotation.discountType === 'Percent') {
                discountAmount = bufferedSubtotal * (quotation.discountValue || 0) / 100;
            } else if (quotation.discountType === 'Amount') {
                discountAmount = quotation.discountValue || 0;
            }
            
            const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
            
            // Status badge styling
            const statusBadges = {
                'Current': 'bg-green-600 text-green-200',
                'Revised': 'bg-purple-600 text-purple-200',
                'Expired': 'bg-orange-600 text-orange-200'
            };
            
            const statusClass = statusBadges[quotation.status] || 'bg-gray-600 text-gray-200';
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            row.setAttribute('data-quotation-id', quotation.id);
            row.setAttribute('data-quotation-number', quotation.number);
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${quotation.number}</div>
                    ${quotation.version && quotation.version > 1 ? `<div class="text-xs text-gray-400">v${quotation.version}</div>` : ''}
                    ${quotation.parentQuoteNumber ? `<div class="text-xs text-purple-400"><i class="fas fa-code-branch mr-1"></i>Revision of quotation ${quotation.parentQuoteNumber}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${quotation.clientName}</div>
                    <div class="text-sm text-gray-400">${quotation.contactPerson || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${quotation.projectTitle || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${formatDate(quotation.issueDate)}</div>
                    <div class="text-sm text-gray-400">Valid: ${formatDate(quotation.validUntil)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass} ${quotation.status === 'Revised' ? 'line-through opacity-75' : ''}">${quotation.status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${formatCurrency(grandTotal, quotation.currency)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editQuotation('${quotation.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3" title="Edit Quotation">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="previewQuotation('${quotation.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3" title="Preview Quotation">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="viewClientHistory('${quotation.clientName}')" 
                            class="text-purple-400 hover:text-purple-300 mr-3" title="Client History">
                        <i class="fas fa-history"></i>
                    </button>
                    ${quotation.status === 'Current' ? `
                        <button onclick="generateInvoiceFromQuotation('${quotation.id}')" 
                                class="text-green-400 hover:text-green-300 mr-3" title="Generate Invoice">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                    ` : ''}

                    <button onclick="deleteQuotation('${quotation.id}')" 
                            class="text-red-400 hover:text-red-300" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
        
        // Update filter dropdowns
        updateQuotationFilters(quotations);
        
        // Update pagination controls
        updateQuotationsPagination();
        
    } catch (error) {
        console.error('Error loading quotations:', error);
        showToast('Failed to load quotations', 'error');
        
        // Clear pagination on error
        document.getElementById('quotations-pagination').style.display = 'none';
    } finally {
        isLoadingQuotations = false;
    }
}

// Update quotation filter dropdowns
function updateQuotationFilters(quotations) {
    // Update client filter
    const clientFilter = document.getElementById('client-filter');
    const uniqueClients = [...new Set(quotations.map(q => q.clientName))].sort();
    
    clientFilter.innerHTML = '<option value="">All Clients</option>';
    uniqueClients.forEach(client => {
        clientFilter.innerHTML += `<option value="${client}">${client}</option>`;
    });
}

// Filter quotations
function filterQuotations() {
    const statusFilter = document.getElementById('status-filter').value.toLowerCase();
    const clientFilter = document.getElementById('client-filter').value.toLowerCase();
    const searchFilter = document.getElementById('search-quotations').value.toLowerCase();
    
    const rows = document.querySelectorAll('#quotations-table tr');
    
    rows.forEach(row => {
        if (row.children.length < 7) return; // Skip empty row
        
        const status = row.children[4].textContent.toLowerCase();
        const client = row.children[1].textContent.toLowerCase();
        const searchText = row.textContent.toLowerCase();
        
        const statusMatch = !statusFilter || status.includes(statusFilter);
        const clientMatch = !clientFilter || client.includes(clientFilter);
        const searchMatch = !searchFilter || searchText.includes(searchFilter);
        
        if (statusMatch && clientMatch && searchMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Customer dropdown functions for quotations
async function loadQuoteCustomerDropdown() {
    try {
        console.log('Starting loadQuoteCustomerDropdown...');
        
        const dropdown = document.getElementById('quote-client-dropdown');
        if (!dropdown) {
            console.warn('Dropdown element quote-client-dropdown not found');
            return;
        }
        
        // Try multiple approaches to get customers data
        let customersList = window.customers || customers || [];
        
        // If no customers, try loading them
        if (!customersList || customersList.length === 0) {
            console.log('No customers found, attempting to load...');
            
            // Try calling loadCustomersData first
            if (typeof loadCustomersData === 'function') {
                console.log('Calling loadCustomersData...');
                await loadCustomersData();
                customersList = window.customers || customers || [];
            }
            
            // If still no customers, try loading from API directly
            if (!customersList || customersList.length === 0) {
                console.log('Still no customers, fetching from API...');
                try {
                    const response = await fetch('tables/customers');
                    if (response.ok) {
                        const data = await response.json();
                        customersList = data.data || [];
                        window.customers = customersList;
                        customers = customersList;
                    }
                } catch (apiError) {
                    console.error('Failed to fetch customers from API:', apiError);
                }
            }
        }
        
        console.log('Available customers:', customersList.length, customersList);
        
        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="">Select existing customer...</option>';
        
        if (customersList && customersList.length > 0) {
            // Filter active customers
            const activeCustomers = customersList.filter(c => c.isActive !== false);
            console.log('Active customers:', activeCustomers.length);
            
            activeCustomers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                // Use clientName field consistently with other parts of the app
                option.textContent = customer.clientName || customer.name || 'Unnamed Customer';
                dropdown.appendChild(option);
            });
            
            console.log('Customer dropdown populated with', activeCustomers.length, 'customers');
        } else {
            console.warn('No customers found to populate dropdown');
            // Add a message option to indicate no customers
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No customers found - Add customers first';
            option.disabled = true;
            dropdown.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading customer dropdown:', error);
    }
}

// Select customer for quotation
function selectQuoteCustomer() {
    const dropdown = document.getElementById('quote-client-dropdown');
    const selectedId = dropdown.value;
    
    if (selectedId) {
        // Use global customers array or window.customers as fallback
        const customersList = window.customers || customers || [];
        const customer = customersList.find(c => c.id === selectedId);
        
        if (customer) {
            document.getElementById('quote-client-name').value = customer.clientName || customer.name || '';
            document.getElementById('quote-contact-person').value = customer.contactPerson || '';
            document.getElementById('quote-client-address').value = customer.address || customer.clientAddress || '';
        }
    }
}

// Clear customer selection for quotation
function clearQuoteCustomerSelection() {
    document.getElementById('quote-client-dropdown').value = '';
    document.getElementById('quote-client-name').value = '';
    document.getElementById('quote-contact-person').value = '';
    document.getElementById('quote-client-address').value = '';
}

// Add quotation line item
function addQuotationLine() {
    const newLine = {
        id: Date.now() + Math.random(),
        serviceId: '',
        serviceName: '',
        description: '',
        rate: 0,
        bundleCost: 0,
        bufferPercent: 0,
        adjustedRate: 0,
        quantity: 1,
        lineTotal: 0,
        isBundle: false // Will be set to true only when a bundle is selected
    };
    
    quotationLines.push(newLine);
    updateQuotationLinesTable();
}

// Update quotation lines table
function updateQuotationLinesTable() {
    const tbody = document.getElementById('quotation-lines');
    
    if (!tbody) {
        // Retry after a short delay in case the page is still loading
        setTimeout(() => {
            const retryTbody = document.getElementById('quotation-lines');
            if (retryTbody) {
                updateQuotationLinesTableInternal(retryTbody);
            }
        }, 100);
        return;
    }
    
    updateQuotationLinesTableInternal(tbody);
}

// Internal function to update the table
function updateQuotationLinesTableInternal(tbody) {
    tbody.innerHTML = '';
    
    quotationLines.forEach((line, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-700';
        
        // Create dropdown options - bundles for first line, services for additional lines
        let dropdownOptions = '';
        
        if (index === 0 || line.isBundle) {
            // First line OR existing bundle lines: Show bundles
            dropdownOptions = '<option value="">Select Bundle Package...</option>';
            const availableBundles = window.bundles || bundles || [];

            
            if (availableBundles && availableBundles.length > 0) {
                availableBundles.forEach(bundle => {
                    const selected = bundle.id === line.serviceId ? 'selected' : '';
                    dropdownOptions += `<option value="${bundle.id}" ${selected} data-type="bundle">${bundle.bundleCode} - ${bundle.name}</option>`;
                });
            } else {
                console.warn('No bundles available for dropdown');
                dropdownOptions += '<option value="" disabled>No bundles available</option>';
            }
        } else {
            // Additional lines: Show individual services
            dropdownOptions = '<option value="">Select Additional Service...</option>';
            const availableServices = window.services || services || [];

            
            if (availableServices && availableServices.length > 0) {
                availableServices.forEach(service => {
                    const selected = service.id === line.serviceId ? 'selected' : '';
                    dropdownOptions += `<option value="${service.id}" ${selected} data-type="service">${service.serviceCode || service.name} - ${service.name}</option>`;
                });
            } else {
                console.warn('No services available for dropdown');
                dropdownOptions += '<option value="" disabled>No services available</option>';
            }
        }
        
        // Add bundle indicator styling
        const bundleIndicator = line.isBundle ? 
            '<span class="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full ml-2">BUNDLE</span>' : 
            line.fromBundle ? 
            '<span class="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full ml-2">FROM: ' + line.bundleCode + '</span>' : 
            '';
        
        row.innerHTML = `
            <td class="px-4 py-2">
                <select onchange="selectQuotationService(${index}, this.value)" 
                        class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                    ${dropdownOptions}
                </select>
                ${bundleIndicator}
                <input type="text" value="${line.description}" 
                       onchange="updateQuotationLineDescription(${index}, this.value)"
                       placeholder="Description..."
                       class="w-full px-2 py-1 mt-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <input type="number" value="${line.rate}" step="0.01"
                       onchange="updateQuotationLineRate(${index}, parseFloat(this.value))"
                       class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <input type="number" value="${line.bundleCost}" step="0.01"
                       onchange="updateQuotationLineBundleCost(${index}, parseFloat(this.value))"
                       class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <input type="number" value="${line.bufferPercent}" step="0.01"
                       onchange="updateQuotationLineBuffer(${index}, parseFloat(this.value))"
                       class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <span class="text-white font-medium">${formatNumber(line.adjustedRate)}</span>
            </td>
            <td class="px-4 py-2">
                <input type="number" value="${line.quantity}" min="0" step="0.01"
                       onchange="updateQuotationLineQuantity(${index}, parseFloat(this.value))"
                       class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <span class="text-white font-semibold">${formatNumber(line.lineTotal)}</span>
            </td>
            <td class="px-4 py-2">
                <button onclick="removeQuotationLine(${index})" 
                        class="text-red-400 hover:text-red-300" title="Remove Line">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateQuotationTotals();
}

// Service selection and line item management functions
function selectQuotationService(index, serviceId) {
    if (!serviceId) return; // Early return if no service selected
    
    // Check if this is a bundle by looking up the ID in bundles
    const availableBundles = window.bundles || bundles || [];
    const bundle = availableBundles.find(b => b.id === serviceId);
    
    if (bundle) {
        // This is a bundle selection
        const expandBundlesCheckbox = document.getElementById('quote-expand-bundles');
        const expandBundles = expandBundlesCheckbox ? expandBundlesCheckbox.checked : false;
        
        if (expandBundles) {
            // Expand bundle into individual line items
            expandBundleIntoQuotationLines(bundle, index);
        } else {
            // Show bundle as single line item (DEFAULT BEHAVIOR)
            quotationLines[index].serviceId = serviceId;
            quotationLines[index].serviceName = bundle.name;
            quotationLines[index].description = bundle.description || '';
            quotationLines[index].rate = 0; // Bundle uses bundleCost, not rate
            quotationLines[index].bundleCost = 0; // Will be calculated
            quotationLines[index].isBundle = true;
            quotationLines[index].bundleCode = bundle.bundleCode;
            
            // Calculate bundle cost and update table
            calculateBundleCostForQuotation(index, serviceId);
        }
    } else {
        // This is an individual service selection
        const availableServices = window.services || services || [];
        const service = availableServices.find(s => s.id === serviceId);
        if (service) {
            quotationLines[index].serviceId = serviceId;
            quotationLines[index].serviceName = service.name || service.serviceName;
            quotationLines[index].description = service.description || '';
            quotationLines[index].rate = service.baseRate || service.rate || 0;
            quotationLines[index].bundleCost = 0;
            quotationLines[index].isBundle = false;
            quotationLines[index].bundleCode = '';
            calculateQuotationLineTotal(index);
            updateQuotationLinesTable();
        }
    }
}

function updateQuotationLineDescription(index, description) {
    quotationLines[index].description = description;
}

function updateQuotationLineRate(index, rate) {
    quotationLines[index].rate = rate || 0;
    calculateQuotationLineTotal(index);
    updateQuotationLinesTable();
}

function updateQuotationLineBundleCost(index, bundleCost) {
    quotationLines[index].bundleCost = bundleCost || 0;
    calculateQuotationLineTotal(index);
    updateQuotationLinesTable();
}

function updateQuotationLineBuffer(index, bufferPercent) {
    quotationLines[index].bufferPercent = bufferPercent || 0;
    calculateQuotationLineTotal(index);
    updateQuotationLinesTable();
}

// Expand bundle into individual quotation lines
async function expandBundleIntoQuotationLines(bundle, startIndex) {
    try {
        // Get bundle items
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundle.id}`);
        const itemsData = await itemsResponse.json();
        const bundleItems = itemsData.data || [];
        
        const availableServices = window.services || services || [];
        
        // Remove existing line at startIndex if it exists
        if (quotationLines[startIndex]) {
            quotationLines.splice(startIndex, 1);
        }
        
        // Add individual lines for each bundle item
        let insertIndex = startIndex;
        for (const item of bundleItems) {
            if (item.include) {
                const service = availableServices.find(s => s.id === item.childServiceId);
                if (service) {
                    // Create individual line for each quantity
                    for (let qty = 0; qty < (item.childQty || 1); qty++) {
                        const newLine = {
                            id: Date.now() + Math.random() + qty,
                            serviceId: service.id,
                            serviceName: service.name || service.serviceName,
                            description: `${service.description || ''} ${item.notes ? `(${item.notes})` : ''}`.trim(),
                            rate: service.baseRate || service.rate || 0,
                            bundleCost: 0,
                            bufferPercent: 0,
                            adjustedRate: service.baseRate || service.rate || 0,
                            quantity: 1,
                            lineTotal: service.baseRate || service.rate || 0,
                            isBundle: false,
                            fromBundle: bundle.name,
                            bundleCode: bundle.bundleCode
                        };
                        
                        quotationLines.splice(insertIndex, 0, newLine);
                        insertIndex++;
                    }
                }
            }
        }
        
        updateQuotationLinesTable();
        updateQuotationTotals();
        
    } catch (error) {
        console.error('Failed to expand bundle:', error);
        // Fall back to showing bundle as single line
        quotationLines[startIndex] = {
            id: Date.now() + Math.random(),
            serviceId: bundle.id,
            serviceName: bundle.name,
            description: bundle.description || '',
            rate: 0,
            bundleCost: 0,
            bufferPercent: 0,
            adjustedRate: 0,
            quantity: 1,
            lineTotal: 0,
            isBundle: true,
            bundleCode: bundle.bundleCode
        };
        
        calculateBundleCostForQuotation(startIndex, bundle.id);
    }
}

// Calculate bundle cost for quotation line
async function calculateBundleCostForQuotation(index, bundleId) {
    try {
        // Get bundle items
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundleId}`);
        const itemsData = await itemsResponse.json();
        const bundleItems = itemsData.data || [];
        
        let totalBundleCost = 0;
        const availableServices = window.services || services || [];
        
        // Calculate total cost from bundle items
        for (const item of bundleItems) {
            if (item.include) {
                const service = availableServices.find(s => s.id === item.childServiceId);
                if (service && service.baseRate) {
                    totalBundleCost += service.baseRate * (item.childQty || 1);
                }
            }
        }
        
        // Update the quotation line with calculated bundle cost
        quotationLines[index].bundleCost = totalBundleCost;
        quotationLines[index].rate = 0; // Bundle uses bundleCost, not rate
        calculateQuotationLineTotal(index);
        updateQuotationLinesTable();
        
    } catch (error) {
        console.error('Failed to calculate bundle cost:', error);
        quotationLines[index].bundleCost = 0;
        updateQuotationLinesTable();
    }
}

function updateQuotationLineQuantity(index, quantity) {
    quotationLines[index].quantity = quantity || 0;
    calculateQuotationLineTotal(index);
    updateQuotationLinesTable();
}

function removeQuotationLine(index) {
    quotationLines.splice(index, 1);
    updateQuotationLinesTable();
}

// Calculate line total
function calculateQuotationLineTotal(index) {
    const line = quotationLines[index];
    const baseRate = (line.rate || 0) + (line.bundleCost || 0);
    const bufferAmount = baseRate * (line.bufferPercent || 0) / 100;
    line.adjustedRate = baseRate + bufferAmount;
    line.lineTotal = line.adjustedRate * (line.quantity || 0);
}

// Update quotation totals
function updateQuotationTotals() {
    const subtotal = quotationLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
    const headerBuffer = parseFloat(document.getElementById('quote-header-buffer').value) || 0;
    const taxRate = parseFloat(document.getElementById('quote-tax-rate').value) || 0;
    const discountType = document.getElementById('quote-discount-type').value;
    const discountValue = parseFloat(document.getElementById('quote-discount-value').value) || 0;
    
    // Apply header buffer
    const bufferedSubtotal = subtotal + (subtotal * headerBuffer / 100);
    
    // Calculate tax
    const taxAmount = bufferedSubtotal * (taxRate / 100);
    
    // Calculate discount
    let discountAmount = 0;
    if (discountType === 'Percent') {
        discountAmount = bufferedSubtotal * (discountValue / 100);
    } else if (discountType === 'Amount') {
        discountAmount = discountValue;
    }
    
    const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
    
    // Update display with currency formatting
    const currency = document.getElementById('quotation-currency').value || 'PKR';
    document.getElementById('quotation-subtotal').textContent = formatCurrency(bufferedSubtotal, currency);
    document.getElementById('quotation-tax').textContent = formatCurrency(taxAmount, currency);
    document.getElementById('quotation-discount').textContent = formatCurrency(discountAmount, currency);
    document.getElementById('quotation-grand-total').textContent = formatCurrency(grandTotal, currency);
}

// Refresh service dropdowns
async function refreshQuoteServiceDropdowns() {
    console.log('Refreshing quote service dropdowns...');
    
    // Try to reload services if needed
    if ((!services || services.length === 0) && (!window.services || window.services.length === 0)) {
        console.log('No services found, attempting to load...');
        try {
            const response = await fetch('tables/services');
            if (response.ok) {
                const data = await response.json();
                services = data.data || [];
                window.services = services;
                console.log('Reloaded services:', services.length);
            }
        } catch (error) {
            console.error('Failed to reload services:', error);
        }
    }
    
    // Try to reload bundles if needed
    if ((!bundles || bundles.length === 0) && (!window.bundles || window.bundles.length === 0)) {

        try {
            const response = await fetch('tables/bundles');
            if (response.ok) {
                const data = await response.json();
                bundles = data.data || [];
                window.bundles = bundles;

            }
        } catch (error) {
            console.error('Failed to reload bundles:', error);
        }
    }
    
    updateQuotationLinesTable();
}

// Handle expand bundles checkbox change
async function handleExpandBundlesChange() {
    const expandBundles = document.getElementById('quote-expand-bundles')?.checked || false;

    
    // Find bundle lines and re-process them
    const bundleLines = quotationLines.filter(line => line.isBundle || line.fromBundle);
    
    if (bundleLines.length > 0) {
        // Store current bundle selections
        const bundleSelections = [];
        quotationLines.forEach((line, index) => {
            if (line.isBundle) {
                bundleSelections.push({
                    index: index,
                    bundleId: line.serviceId,
                    quantity: line.quantity
                });
            }
        });
        
        // Remove all bundle-related lines
        quotationLines = quotationLines.filter(line => !line.isBundle && !line.fromBundle);
        
        // Re-add bundles based on new expand setting
        for (const selection of bundleSelections) {
            const availableBundles = window.bundles || bundles || [];
            const bundle = availableBundles.find(b => b.id === selection.bundleId);
            
            if (bundle) {
                if (expandBundles) {
                    // Add at the end since we removed the original positions
                    await expandBundleIntoQuotationLines(bundle, quotationLines.length);
                } else {
                    // Add as single bundle line
                    const bundleLine = {
                        id: Date.now() + Math.random(),
                        serviceId: bundle.id,
                        serviceName: bundle.name,
                        description: bundle.description || '',
                        rate: 0,
                        bundleCost: 0,
                        bufferPercent: 0,
                        adjustedRate: 0,
                        quantity: selection.quantity,
                        lineTotal: 0,
                        isBundle: true,
                        bundleCode: bundle.bundleCode
                    };
                    
                    quotationLines.push(bundleLine);
                    calculateBundleCostForQuotation(quotationLines.length - 1, bundle.id);
                }
            }
        }
        
        updateQuotationLinesTable();
        updateQuotationTotals();
    }
}

// Function no longer needed - status is now automated

// Initialize quotation form event listeners
function initializeQuotationFormListeners() {
    const quotationForm = document.getElementById('quotation-form');
    if (quotationForm && !quotationForm.hasAttribute('data-listener-added')) {
        console.log('🎯 Adding form submit listener for quotation form');
        quotationForm.addEventListener('submit', async function(e) {
            console.log('📝 Form submit event triggered');
            e.preventDefault();
            await saveQuotation();
        });
        quotationForm.setAttribute('data-listener-added', 'true');
        console.log('✅ Form listener added and marked');
    } else if (quotationForm) {
        console.log('⚠️ Form listener already exists, skipping');
    } else {
        console.log('❌ Quotation form element not found');
    }
    
    // Add event listener for expand bundles checkbox
    const expandBundlesCheckbox = document.getElementById('quote-expand-bundles');
    if (expandBundlesCheckbox && !expandBundlesCheckbox.hasAttribute('data-listener-added')) {
        expandBundlesCheckbox.addEventListener('change', function() {
            handleExpandBundlesChange();
        });
        expandBundlesCheckbox.setAttribute('data-listener-added', 'true');
    }
}

// Save quotation function
let isSaving = false; // Prevent duplicate saves
async function saveQuotation() {
    // Prevent duplicate save attempts
    if (isSaving) {
        console.log('⚠️ Save already in progress, ignoring duplicate call');
        return;
    }
    
    isSaving = true;
    const saveTimestamp = new Date().toISOString();
    console.log(`💾 [${saveTimestamp}] Starting quotation save process...`);
    console.log('📊 Save context:', {
        currentQuotationId: currentQuotationId,
        quotationLines: quotationLines.length,
        formData: {
            number: document.getElementById('quotation-number').value,
            clientName: document.getElementById('quote-client-name').value
        }
    });
    
    try {
        // Validate required fields
        const quotationNumber = document.getElementById('quotation-number').value.trim();
        const clientName = document.getElementById('quote-client-name').value.trim();
        
        if (!quotationNumber) {
            showToast('Quotation number is required', 'error');
            return;
        }
        
        if (!clientName) {
            showToast('Client name is required', 'error');
            return;
        }
        
        if (quotationLines.length === 0) {
            showToast('At least one line item is required', 'error');
            return;
        }
        
        // Check for duplicate quotation numbers (only for new quotations, not revisions)
        if (!currentQuotationId) {
            console.log('🔍 Checking for duplicate quotation number:', quotationNumber);
            try {
                const existingResponse = await fetch(`tables/quotations`);
                const existingData = await existingResponse.json();
                const existingQuotations = existingData.data || [];
                const duplicateNumber = existingQuotations.find(q => q.number === quotationNumber);
                
                console.log('📋 Existing quotations check:', {
                    totalExisting: existingQuotations.length,
                    searchingFor: quotationNumber,
                    found: !!duplicateNumber
                });
                
                if (duplicateNumber) {
                    console.error('❌ Duplicate quotation number found:', duplicateNumber);
                    showToast(`Quotation number "${quotationNumber}" already exists. Please use a different number.`, 'error');
                    return;
                }
            } catch (error) {
                console.warn('Could not check for duplicate quotation numbers:', error);
            }
        }
        
        // Calculate totals
        const subtotal = quotationLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        const headerBuffer = parseFloat(document.getElementById('quote-header-buffer').value) || 0;
        const bufferedSubtotal = subtotal + (subtotal * headerBuffer / 100);
        const taxRate = parseFloat(document.getElementById('quote-tax-rate').value) || 0;
        const taxAmount = bufferedSubtotal * (taxRate / 100);
        
        let discountAmount = 0;
        const discountType = document.getElementById('quote-discount-type').value;
        const discountValue = parseFloat(document.getElementById('quote-discount-value').value) || 0;
        
        if (discountType === 'Percent') {
            discountAmount = bufferedSubtotal * (discountValue / 100);
        } else if (discountType === 'Amount') {
            discountAmount = discountValue;
        }
        
        const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
        
        // Get the selected status from dropdown
        const selectedStatus = document.getElementById('quotation-status').value;
        
        // Prepare quotation data
        const quotationData = {
            number: quotationNumber,
            clientName: clientName,
            contactPerson: document.getElementById('quote-contact-person').value.trim(),
            projectTitle: document.getElementById('quote-project-title').value.trim(),
            currency: document.getElementById('quotation-currency').value,
            issueDate: document.getElementById('quote-issue-date').value,
            validUntil: document.getElementById('quote-valid-until').value,
            status: selectedStatus,
            templateId: document.getElementById('quotation-template').value || null,
            headerBuffer: headerBuffer / 100,
            taxRate: taxRate / 100,
            discountType: discountType,
            discountValue: discountValue,
            clientAddress: document.getElementById('quote-client-address').value.trim(),
            notes: document.getElementById('quotation-notes').value.trim(),
            subtotal: subtotal,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            grandTotal: grandTotal,
            version: 1,
            parentQuoteId: null,
            parentQuoteNumber: null,
            invoiceGenerated: false
        };
        
        let quotationResponse;
        if (currentQuotationId) {
            // When editing existing quotation, create revision instead of updating
            // First, get the original quotation data BEFORE updating it
            const originalQuotation = await fetch(`tables/quotations/${currentQuotationId}`).then(r => r.json());
            
            // Mark the original as "Revised" using PATCH to preserve all other data
            const originalUpdate = {
                status: 'Revised'
            };
            
            const updateResponse = await fetch(`tables/quotations/${currentQuotationId}`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(originalUpdate)
            });
            
            if (!updateResponse.ok) {
                throw new Error('Failed to mark original quotation as revised');
            }
            

            
            // Generate new revision number using original data
            quotationData.number = generateRevisionNumber(originalQuotation.number);
            quotationData.version = (originalQuotation.version || 1) + 1;
            quotationData.parentQuoteId = currentQuotationId;
            quotationData.parentQuoteNumber = originalQuotation.number;
            quotationData.status = 'Current';
            
            // Create new revision quotation
            quotationResponse = await fetch('tables/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationData)
            });
            

        } else {
            // Create new quotation
            quotationResponse = await fetch('tables/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationData)
            });
        }
        
        if (!quotationResponse.ok) {
            throw new Error('Failed to save quotation');
        }
        
        const savedQuotation = await quotationResponse.json();
        
        // Save quotation lines
        if (currentQuotationId) {
            // For revisions: Keep original lines intact, don't delete them
            // The original "Revised" quotation should maintain its lines and totals
            // We're creating a copy for the new revision, not moving the lines
            console.log('Creating revision - original quotation lines will be preserved');
        }
        
        // Create new lines
        for (let i = 0; i < quotationLines.length; i++) {
            const line = quotationLines[i];
            const lineData = {
                quotationId: savedQuotation.id,
                serviceId: line.serviceId,
                bundleId: line.bundleId || null,
                serviceName: line.serviceName,
                description: line.description,
                rate: line.rate,
                bundleCost: line.bundleCost,
                bufferPercent: line.bufferPercent,
                adjustedRate: line.adjustedRate,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
                isBundle: line.isBundle || false,
                fromBundle: line.fromBundle || null,
                notes: line.notes || '',
                lineOrder: i + 1  // Add sequence field to maintain order
            };
            
            await fetch('tables/quotation_lines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lineData)
            });
        }
        
        showToast(currentQuotationId ? 'Quotation revision created successfully' : 'Quotation saved successfully', 'success');
        
        // Small delay to ensure database updates are processed, then redirect
        setTimeout(() => {
            showPage('quotations');
        }, 500);
        
    } catch (error) {
        console.error('Error saving quotation:', error);
        showToast('Failed to save quotation', 'error');
    } finally {
        isSaving = false;
        console.log('💾 Quotation save process completed');
    }
}

// Edit quotation
async function editQuotation(quotationId) {
    try {
        // Load quotation data
        const quotationResponse = await fetch(`tables/quotations/${quotationId}`);
        const quotation = await quotationResponse.json();
        
        // Clear previous data completely FIRST
        currentQuotation = null;
        currentQuotation = {};
        
        // Force clear quotation lines array BEFORE loading new data
        quotationLines.splice(0, quotationLines.length); // Remove all elements
        
        currentQuotationId = quotationId;
        
        // NOW load quotation lines for this specific quotation
        const linesResponse = await fetch(`tables/quotation_lines`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this quotation specifically and sort by original order
        const lines = allLines
            .filter(line => line.quotationId === quotationId)
            .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
        
        // Clear the quotation lines table immediately
        const quotationLinesTable = document.getElementById('quotation-lines');
        if (quotationLinesTable) {
            quotationLinesTable.innerHTML = '';
        }
        
        // Show quotation builder
        document.getElementById('quotations-list').classList.add('hidden');
        document.getElementById('quotation-builder').classList.remove('hidden');
        
        // Populate form fields
        document.getElementById('quotation-number').value = quotation.number;
        document.getElementById('quote-client-name').value = quotation.clientName;
        document.getElementById('quote-contact-person').value = quotation.contactPerson || '';
        document.getElementById('quote-project-title').value = quotation.projectTitle || '';
        document.getElementById('quotation-currency').value = quotation.currency;
        document.getElementById('quote-issue-date').value = quotation.issueDate;
        document.getElementById('quote-valid-until').value = quotation.validUntil;
        document.getElementById('quotation-status').value = quotation.status;
        
        // Update status display
        const statusDisplay = document.getElementById('quotation-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = quotation.status;
        }
        document.getElementById('quote-header-buffer').value = (quotation.headerBuffer * 100) || 0;
        document.getElementById('quote-tax-rate').value = (quotation.taxRate * 100) || 0;
        document.getElementById('quote-discount-type').value = quotation.discountType || 'None';
        document.getElementById('quote-discount-value').value = quotation.discountValue || 0;
        document.getElementById('quote-client-address').value = quotation.clientAddress || '';
        document.getElementById('quotation-notes').value = quotation.notes || '';
        
        // Populate quotation lines with complete data including bundle fields
        quotationLines = lines.map(line => ({
            id: line.id,
            serviceId: line.serviceId,
            bundleId: line.bundleId,
            serviceName: line.serviceName,
            description: line.description,
            rate: line.rate,
            bundleCost: line.bundleCost,
            bufferPercent: line.bufferPercent,
            adjustedRate: line.adjustedRate,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
            isBundle: line.isBundle || false,
            fromBundle: line.fromBundle,
            notes: line.notes || '',
            lineOrder: line.lineOrder
        }));
        
        // Load customer dropdown
        if (typeof loadQuoteCustomerDropdown === 'function') {
            await loadQuoteCustomerDropdown();
        }
        
        // Load templates and restore selected template
        await loadQuotationTemplates();
        if (quotation.templateId) {
            document.getElementById('quotation-template').value = quotation.templateId;
            applyQuotationTemplate();
        }
        
        // Update UI
        updateQuotationLinesTable();
        refreshQuoteServiceDropdowns();
        updateQuotationTotals();
        
    } catch (error) {
        console.error('Error loading quotation for editing:', error);
        showToast('Failed to load quotation', 'error');
    }
}

// Delete quotation
async function deleteQuotation(quotationId) {
    if (!confirm('Are you sure you want to delete this quotation?')) {
        return;
    }
    
    try {
        // Delete quotation lines first
        const linesResponse = await fetch(`tables/quotation_lines`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this quotation specifically
        const lines = allLines.filter(line => line.quotationId === quotationId);
        
        for (const line of lines) {
            await fetch(`tables/quotation_lines/${line.id}`, { method: 'DELETE' });
        }
        
        // Delete quotation
        await fetch(`tables/quotations/${quotationId}`, { method: 'DELETE' });
        
        showToast('Quotation deleted successfully', 'success');
        loadQuotationsTable(1);
        
    } catch (error) {
        console.error('Error deleting quotation:', error);
        showToast('Failed to delete quotation', 'error');
    }
}

// Preview quotation in a modal/popup view
async function previewQuotation(quotationId) {
    try {
        showLoading();
        
        // Load quotation data
        const quotationResponse = await fetch(`tables/quotations/${quotationId}`);
        const quotation = await quotationResponse.json();
        
        if (!quotation) {
            showToast('Quotation not found', 'error');
            return;
        }
        
        // Load company template for the quotation
        let template = null;
        if (quotation.templateId) {
            try {
                const templateResponse = await fetch(`tables/company_templates/${quotation.templateId}`);
                if (templateResponse.ok) {
                    template = await templateResponse.json();
                }
            } catch (error) {
                console.warn('Failed to load quotation template:', error);
            }
        }
        
        // Load quotation lines for this specific quotation
        const linesResponse = await fetch(`tables/quotation_lines`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this quotation specifically and sort by order
        const lines = allLines
            .filter(line => line.quotationId === quotationId)
            .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
        
        // Calculate totals
        const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        const headerBuffer = subtotal * (quotation.headerBuffer || 0);
        const bufferedSubtotal = subtotal + headerBuffer;
        const taxAmount = bufferedSubtotal * (quotation.taxRate || 0);
        
        let discountAmount = 0;
        if (quotation.discountType === 'Percent') {
            discountAmount = bufferedSubtotal * (quotation.discountValue || 0) / 100;
        } else if (quotation.discountType === 'Amount') {
            discountAmount = quotation.discountValue || 0;
        }
        
        const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
        
        // Show preview modal
        showQuotationPreview(quotation, lines, {
            subtotal,
            headerBuffer,
            bufferedSubtotal, 
            taxAmount,
            discountAmount,
            grandTotal
        }, template);
        
    } catch (error) {
        console.error('Error loading quotation preview:', error);
        showToast('Failed to load quotation preview', 'error');
    } finally {
        hideLoading();
    }
}

// Show quotation preview modal
function showQuotationPreview(quotation, lines, totals, template = null) {
    const modal = document.getElementById('quotation-preview-modal');
    const content = document.getElementById('quotation-preview-content');
    
    // Customer data is stored directly in quotation, no need to lookup
    const customer = {
        name: quotation.clientName,
        contactPerson: quotation.contactPerson,
        address: quotation.clientAddress
    };
    
    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    // Format currency helper
    const formatCurrency = (amount, currency = 'PKR') => {
        const symbols = { PKR: '₨', USD: '$', EUR: '€', GBP: '£' };
        const symbol = symbols[currency] || currency;
        return `${symbol}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    // Get status badge styling
    const getStatusBadge = (status) => {
        const badges = {
            'Current': 'bg-green-100 text-green-800',
            'Revised': 'bg-yellow-100 text-yellow-800',
            'Expired': 'bg-red-100 text-red-800'
        };
        const badgeClass = badges[status] || 'bg-gray-100 text-gray-800';
        return `<span class="px-2 py-1 rounded-full text-xs font-medium ${badgeClass}">${status}</span>`;
    };
    
    // Build line items table - maintain original order as shown in quotation form
    let lineItemsHtml = '';
    lines.forEach((line, index) => {
        const service = window.services?.find(s => s.id === line.serviceId) || {};
        const bundle = window.bundles?.find(b => b.id === line.bundleId) || {};
        
        // For bundle items, use bundle name; for services, use service name
        let itemName, itemDescription;
        if (line.isBundle) {
            // This is a bundle line
            itemName = bundle.name || line.serviceName;
            itemDescription = bundle.description || line.description;
        } else if (line.bundleId || line.fromBundle) {
            // This is an add-on service from a bundle
            itemName = service.name || line.serviceName;
            itemDescription = service.description || line.description;
        } else {
            // This is a standalone service
            itemName = service.name || line.serviceName;
            itemDescription = service.description || line.description;
        }
        
        // Calculate client-facing rates (with header buffer included)
        // For bundles, use bundleCost; for services, use rate
        const baseRate = line.isBundle ? (line.bundleCost || 0) : (line.rate || 0);
        const bufferMultiplier = 1 + (quotation.headerBuffer || 0);
        const clientRate = baseRate * bufferMultiplier;
        const clientLineTotal = clientRate * (line.quantity || 0);

        lineItemsHtml += `
            <tr class="border-b border-gray-200">
                <td class="py-3 text-left">${index + 1}</td>
                <td class="py-3 text-left">
                    <div class="font-medium text-gray-900">${itemName || 'Unknown Item'}</div>
                    ${itemDescription ? `<div class="text-sm text-gray-800 mt-1">${itemDescription}</div>` : ''}
                    ${line.notes ? `<div class="text-sm text-gray-700 italic mt-1">${line.notes}</div>` : ''}
                    ${line.fromBundle ? `<div class="text-xs text-blue-700 mt-1">└ Add-on from: ${line.fromBundle}</div>` : ''}
                </td>
                <td class="py-3 text-center text-gray-900">${line.quantity || 0}</td>
                <td class="py-3 text-right text-gray-900">${formatCurrency(clientRate, quotation.currency)}</td>
                <td class="py-3 text-right font-medium text-gray-900">${formatCurrency(clientLineTotal, quotation.currency)}</td>
            </tr>
        `;
    });
    
    if (!lines.length) {
        lineItemsHtml = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    No line items in this quotation
                </td>
            </tr>
        `;
    }
    
    // Build the complete preview HTML
    content.innerHTML = `
        <div class="max-w-4xl mx-auto bg-white">
            <!-- Company Header -->
            ${template ? `
                <div class="border-b border-gray-200 pb-4 mb-6">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h2 class="text-2xl font-bold text-gray-900 mb-1">${template.companyName}</h2>
                            <div class="text-sm text-gray-700 space-y-1">
                                ${template.companyEmail ? `<div>${template.companyEmail}</div>` : ''}
                                ${template.companyPhone ? `<div>${template.companyPhone}</div>` : ''}
                                ${template.companyAddress ? `<div class="mt-1">${template.companyAddress}</div>` : ''}
                            </div>
                        </div>
                        ${template.companyLogo ? `
                            <div class="ml-4">
                                <img src="${template.companyLogo}" alt="Company Logo" class="h-16 w-auto object-contain">
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Quotation Header -->
            <div class="border-b border-gray-200 pb-6 mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800 mb-2">QUOTATION</h1>
                        <div class="text-lg text-gray-800">
                            <div><strong>Number:</strong> ${quotation.number || 'N/A'}</div>
                            ${quotation.projectTitle ? `<div><strong>Project:</strong> ${quotation.projectTitle}</div>` : ''}
                            ${quotation.projectPo ? `<div><strong>PO:</strong> ${quotation.projectPo}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-800 space-y-1">
                            <div><strong>Issue Date:</strong> ${formatDate(quotation.issueDate)}</div>
                            <div><strong>Valid Until:</strong> ${formatDate(quotation.validUntil)}</div>
                            <div><strong>Currency:</strong> ${quotation.currency || 'PKR'}</div>
                            <div class="mt-2">${getStatusBadge(quotation.status)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Customer Information -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Bill To:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="font-medium text-gray-900">${customer.name || 'Client Name Not Specified'}</div>
                    ${customer.contactPerson ? `<div class="text-gray-800 mt-1">Attn: ${customer.contactPerson}</div>` : ''}
                    ${customer.address ? `<div class="text-gray-800 mt-2">${customer.address}</div>` : ''}
                </div>
            </div>
            
            <!-- Line Items -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">Items & Services:</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-gray-300">
                                <th class="py-3 text-left text-sm font-semibold text-gray-800 w-12">#</th>
                                <th class="py-3 text-left text-sm font-semibold text-gray-800">Description</th>
                                <th class="py-3 text-center text-sm font-semibold text-gray-800 w-20">Qty</th>
                                <th class="py-3 text-right text-sm font-semibold text-gray-800 w-24">Rate</th>
                                <th class="py-3 text-right text-sm font-semibold text-gray-800 w-24">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineItemsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Totals -->
            <div class="border-t border-gray-200 pt-4">
                <div class="flex justify-end">
                    <div class="w-80 space-y-2">
                        <div class="flex justify-between py-1">
                            <span class="text-gray-800">Subtotal:</span>
                            <span class="font-medium text-gray-900">${formatCurrency(totals.bufferedSubtotal, quotation.currency)}</span>
                        </div>
                        
                        ${totals.discountAmount > 0 ? `
                            <div class="flex justify-between py-1 text-green-800">
                                <span>Discount ${quotation.discountType === 'Percent' ? `(${quotation.discountValue}%)` : ''}:</span>
                                <span class="font-medium">-${formatCurrency(totals.discountAmount, quotation.currency)}</span>
                            </div>
                        ` : ''}
                        
                        ${totals.taxAmount > 0 ? `
                            <div class="flex justify-between py-1">
                                <span class="text-gray-800">Tax (${((quotation.taxRate || 0) * 100).toFixed(1)}%):</span>
                                <span class="font-medium text-gray-900">${formatCurrency(totals.taxAmount, quotation.currency)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="border-t border-gray-300 pt-2">
                            <div class="flex justify-between py-2">
                                <span class="text-lg font-semibold text-gray-900">Grand Total:</span>
                                <span class="text-lg font-bold text-gray-900">${formatCurrency(totals.grandTotal, quotation.currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Terms & Notes -->
            ${(template?.quotationTerms || quotation.terms || template?.quotationNotes || quotation.notes) ? `
                <div class="border-t border-gray-200 pt-6 mt-6">
                    ${(template?.quotationTerms || quotation.terms) ? `
                        <div class="mb-4">
                            <h4 class="font-semibold text-gray-900 mb-2">Terms & Conditions:</h4>
                            <div class="text-gray-800 whitespace-pre-wrap">${template?.quotationTerms || quotation.terms}</div>
                        </div>
                    ` : ''}
                    ${(template?.quotationNotes || quotation.notes) ? `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Notes:</h4>
                            <div class="text-gray-800 whitespace-pre-wrap">${template?.quotationNotes || quotation.notes}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Company Footer -->
            ${template ? `
                <div class="border-t border-gray-300 pt-4 mt-8">
                    <div class="text-center text-sm text-gray-600">
                        <div class="font-medium">${template.companyName}</div>
                        ${(template.companyEmail || template.companyPhone) ? `
                            <div class="mt-1">
                                ${[template.companyEmail, template.companyPhone].filter(Boolean).join(' • ')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Show the modal
    modal.classList.remove('hidden');
}

// Close quotation preview modal
function closeQuotationPreview() {
    const modal = document.getElementById('quotation-preview-modal');
    modal.classList.add('hidden');
}

// View client history
async function viewClientHistory(clientName) {
    try {
        // Fetch all quotations for this client
        const response = await fetch('tables/quotations');
        const data = await response.json();
        const allQuotations = data.data || [];
        
        const clientQuotations = allQuotations
            .filter(q => q.clientName.toLowerCase() === clientName.toLowerCase())
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        
        // Show modal
        document.getElementById('client-history-modal').classList.remove('hidden');
        document.getElementById('history-client-name').textContent = `${clientName} - Quotation History`;
        
        const content = document.getElementById('client-history-content');
        content.innerHTML = '';
        
        if (clientQuotations.length === 0) {
            content.innerHTML = '<div class="text-gray-400 text-center">No quotation history found for this client.</div>';
            return;
        }
        
        // Build history timeline
        for (const quotation of clientQuotations) {
            // Calculate total for this specific quotation
            const linesResponse = await fetch(`tables/quotation_lines`);
            const allLinesData = await linesResponse.json();
            const allLines = allLinesData.data || [];
            
            // Filter lines for this quotation specifically
            const lines = allLines.filter(line => line.quotationId === quotation.id);
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const taxAmount = subtotal * (quotation.taxRate || 0);
            let discountAmount = 0;
            if (quotation.discountType === 'Percent') {
                discountAmount = subtotal * (quotation.discountValue || 0) / 100;
            } else if (quotation.discountType === 'Amount') {
                discountAmount = quotation.discountValue || 0;
            }
            const grandTotal = subtotal + taxAmount - discountAmount;
            
            const statusBadges = {
                'Draft': 'bg-gray-600 text-gray-200',
                'Sent': 'bg-blue-600 text-blue-200',
                'Under Review': 'bg-yellow-600 text-yellow-200',
                'Revised': 'bg-purple-600 text-purple-200',
                'Approved': 'bg-green-600 text-green-200',
                'Rejected': 'bg-red-600 text-red-200',
                'Expired': 'bg-orange-600 text-orange-200'
            };
            
            const statusClass = statusBadges[quotation.status] || 'bg-gray-600 text-gray-200';
            
            const historyItem = document.createElement('div');
            historyItem.className = 'bg-gray-700 rounded-lg p-4 border-l-4 border-primary-500';
            historyItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold text-white">${quotation.number}</h4>
                        <p class="text-sm text-gray-400">${quotation.projectTitle || 'No project title'}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${quotation.status}</span>
                        <div class="text-sm font-medium text-white mt-1">${formatCurrency(grandTotal, quotation.currency)}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-400">Issue Date:</span>
                        <span class="text-white ml-2">${formatDate(quotation.issueDate)}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Valid Until:</span>
                        <span class="text-white ml-2">${formatDate(quotation.validUntil)}</span>
                    </div>
                </div>
                <div class="mt-3 flex space-x-2">
                    <button onclick="editQuotation('${quotation.id}'); closeClientHistory();" 
                            class="text-blue-400 hover:text-blue-300 text-sm">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="exportQuotationPDF('${quotation.id}')" 
                            class="text-red-400 hover:text-red-300 text-sm">
                        <i class="fas fa-file-pdf mr-1"></i>PDF
                    </button>
                </div>
            `;
            content.appendChild(historyItem);
        }
        
    } catch (error) {
        console.error('Error loading client history:', error);
        showToast('Failed to load client history', 'error');
    }
}

// Close client history modal
function closeClientHistory() {
    document.getElementById('client-history-modal').classList.add('hidden');
}

// Debug functions (can be called from console)
window.debugRefreshCustomerDropdown = async function() {
    console.log('Manual customer dropdown refresh...');
    console.log('Current customers array:', window.customers || customers);
    await loadQuoteCustomerDropdown();
};

window.debugAddQuotationLine = function() {
    console.log('Manual add quotation line...');
    console.log('Current quotationLines:', quotationLines);
    console.log('Available services:', window.services || services);
    addQuotationLine();
};

window.debugQuotationLines = function() {
    console.log('Quotation lines debug info:');
    console.log('quotationLines array:', quotationLines);
    console.log('tbody element:', document.getElementById('quotation-lines'));
    console.log('services array:', window.services || services);
};

// Test function to force add a line and update
window.testAddQuotationLine = function() {
    console.log('TEST: Force adding quotation line...');
    
    // Ensure we're on the quotation page
    if (document.getElementById('quotation-builder').classList.contains('hidden')) {
        console.log('Quotation builder is hidden, showing it first...');
        showQuotationBuilder();
        
        // Wait a moment for the page to load then add line
        setTimeout(() => {
            console.log('Adding line after delay...');
            addQuotationLine();
        }, 500);
    } else {
        addQuotationLine();
    }
};

// Generate invoice from approved quotation
let isGeneratingInvoice = false; // Prevent duplicate invoice generation
async function generateInvoiceFromQuotation(quotationId) {
    // Prevent duplicate invoice generation attempts
    if (isGeneratingInvoice) {
        return;
    }
    
    isGeneratingInvoice = true;
    
    try {
        // Load quotation data
        const quotationResponse = await fetch(`tables/quotations/${quotationId}`);
        
        if (!quotationResponse.ok) {
            throw new Error(`Failed to load quotation: ${quotationResponse.status} ${quotationResponse.statusText}`);
        }
        
        const quotation = await quotationResponse.json();
        
        // Only allow invoice generation from current quotations
        if (quotation.status !== 'Current') {
            showToast('Can only generate invoices from current quotations. Revised or expired quotations cannot be used.', 'warning');
            return;
        }
        
        if (quotation.invoiceGenerated) {
            showToast('An invoice has already been generated for this quotation', 'info');
            return;
        }
        
        // Load quotation lines for this specific quotation
        const linesResponse = await fetch(`tables/quotation_lines`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this quotation specifically and maintain order
        const lines = allLines
            .filter(line => line.quotationId === quotationId)
            .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
        
        // Generate invoice number and ensure it's unique
        let invoiceNumber = generateInvoiceNumber();
        
        // Check for duplicate invoice numbers
        try {
            const existingInvoicesResponse = await fetch(`tables/invoices`);
            const existingInvoicesData = await existingInvoicesResponse.json();
            const existingInvoices = existingInvoicesData.data || [];
            
            // If number exists, generate a new one with additional timestamp
            let attempts = 0;
            while (existingInvoices.find(inv => inv.number === invoiceNumber) && attempts < 10) {
                attempts++;
                const now = new Date();
                const timestamp = (now.getTime() + attempts).toString().slice(-6);
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                invoiceNumber = `INV-${year}${month}-${timestamp}`;
            }
        } catch (error) {
            console.warn('Could not check for duplicate invoice numbers:', error);
        }
        
        // Set due date to 30 days from now
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Prepare invoice data (copying from quotation but with invoice-specific changes)
        const invoiceData = {
            number: invoiceNumber,
            clientName: quotation.clientName,
            contactPerson: quotation.contactPerson,
            projectPo: quotation.projectTitle, // Use project title as PO reference
            currency: quotation.currency,
            issueDate: today.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            templateId: quotation.templateId, // Inherit template from quotation
            headerBuffer: quotation.headerBuffer,
            taxRate: quotation.taxRate,
            discountType: quotation.discountType,
            discountValue: quotation.discountValue,
            clientAddress: quotation.clientAddress,
            subtotal: quotation.subtotal,
            taxAmount: quotation.taxAmount,
            discountAmount: quotation.discountAmount,
            grandTotal: quotation.grandTotal,
            quotationId: quotationId // Reference to original quotation
        };
        
        // Create invoice
        const invoiceResponse = await fetch('tables/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        });
        
        console.log('📋 Invoice creation response:', {
            ok: invoiceResponse.ok,
            status: invoiceResponse.status,
            statusText: invoiceResponse.statusText
        });
        
        if (!invoiceResponse.ok) {
            const errorText = await invoiceResponse.text();
            console.error('❌ Invoice creation failed:', errorText);
            throw new Error(`Failed to create invoice: ${invoiceResponse.status} - ${errorText}`);
        }
        
        const savedInvoice = await invoiceResponse.json();
        console.log('✅ Invoice created successfully:', savedInvoice);
        
        // Create invoice lines from quotation lines with buffer-adjusted rates
        console.log(`📋 Creating ${lines.length} invoice lines...`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Calculate final client rates (with header buffer included)
            // For bundles, use bundleCost; for services, use rate
            const baseRate = line.isBundle ? (line.bundleCost || 0) : (line.rate || 0);
            const bufferMultiplier = 1 + (quotation.headerBuffer || 0);
            const finalRate = baseRate * bufferMultiplier;
            const finalLineTotal = finalRate * (line.quantity || 0);
            
            const invoiceLineData = {
                invoiceId: savedInvoice.id,
                serviceId: line.serviceId,
                bundleId: line.bundleId,
                serviceName: line.serviceName,
                description: line.description,
                rate: finalRate,  // Store final rate, not base rate
                bundleCost: line.bundleCost,
                bufferPercent: line.bufferPercent,
                adjustedRate: finalRate,  // Also store as adjusted rate
                quantity: line.quantity,
                lineTotal: finalLineTotal,  // Store final total
                isBundle: line.isBundle || false,
                fromBundle: line.fromBundle,
                notes: line.notes || '',
                lineOrder: i + 1  // Maintain order in invoice
            };
            
            const lineResponse = await fetch('tables/invoice_lines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceLineData)
            });
            
            if (!lineResponse.ok) {
                const lineErrorText = await lineResponse.text();
                console.error(`❌ Failed to create invoice line ${i + 1}:`, lineErrorText);
                throw new Error(`Failed to create invoice line ${i + 1}: ${lineResponse.status} - ${lineErrorText}`);
            } else {
                console.log(`✅ Created invoice line ${i + 1}/${lines.length}`);
            }
        }
        
        // Mark quotation as having invoice generated
        await fetch(`tables/quotations/${quotationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceGenerated: true })
        });
        
        console.log('🎉 SUCCESS: Invoice generated successfully!', {
            invoiceNumber: invoiceNumber,
            invoiceId: savedInvoice.id,
            quotationId: quotationId
        });
        
        showToast(`✅ Invoice ${invoiceNumber} generated successfully!`, 'success');
        
        // Reload quotations table to update the UI
        loadQuotationsTable(1);
        
        // Ask user if they want to preview the new invoice
        if (confirm(`✅ SUCCESS!\n\nInvoice ${invoiceNumber} has been created successfully.\n\nWould you like to go to the invoices page to see it?`)) {
            // Navigate to invoices page instead of calling undefined function
            if (typeof showPage === 'function') {
                showPage('invoices');
            } else {
                window.location.hash = '#invoices';
            }
        }
        
    } catch (error) {
        console.error('❌ INVOICE GENERATION ERROR:', error);
        console.error('❌ Full error details:', {
            message: error.message,
            stack: error.stack,
            quotationId: quotationId
        });
        
        // Show more detailed error message to user
        const errorMessage = `Invoice generation failed: ${error.message}`;
        showToast(errorMessage, 'error');
        
        // Also alert with the error for immediate visibility
        alert(`❌ Invoice Generation Failed!\n\n${error.message}\n\nCheck the browser console (F12) for detailed logs.`);
    } finally {
        isGeneratingInvoice = false;
        console.log('📋 Invoice generation process completed');
    }
}

// Generate invoice number (helper function - similar to quotation number)
function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Use full timestamp + random component for uniqueness  
    const timestamp = now.getTime().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uniquePart = (timestamp + random).slice(-8); // Last 8 digits for more uniqueness
    return `INV-${year}${month}-${uniquePart}`;
}

// Company Templates Integration
let quotationTemplates = [];
let selectedTemplate = null;

// Load company templates for quotation form
async function loadQuotationTemplates() {
    try {
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        quotationTemplates = data.data?.filter(t => t.isActive) || [];
        
        const templateSelect = document.getElementById('quotation-template');
        if (templateSelect) {
            // Clear existing options except the first one
            templateSelect.innerHTML = '<option value="">Select a company template...</option>';
            
            if (quotationTemplates.length === 0) {
                // No templates available
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No templates available - Create one in Settings';
                option.disabled = true;
                templateSelect.appendChild(option);
                
                // Show warning
                showToast('No company templates found. Please create templates in Settings.', 'warning');
            } else {
                // Add active templates
                quotationTemplates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = template.name;
                    if (template.isDefault) {
                        option.selected = true;
                    }
                    templateSelect.appendChild(option);
                });
                
                // Apply current template (from getCurrentTemplateId or default)
                const currentTemplateId = getCurrentTemplateId ? getCurrentTemplateId() : null;
                let selectedTemplate = null;
                
                if (currentTemplateId) {
                    selectedTemplate = quotationTemplates.find(t => t.id === currentTemplateId);
                }
                
                // Fallback to default template if current template not found
                if (!selectedTemplate) {
                    selectedTemplate = quotationTemplates.find(t => t.isDefault);
                }
                
                if (selectedTemplate) {
                    templateSelect.value = selectedTemplate.id;
                    applyQuotationTemplate();
                }
            }
        }
        
    } catch (error) {
        console.error('Failed to load company templates:', error);
        showToast('Failed to load company templates. Using default settings.', 'error');
        
        // Fallback: populate with default option
        const templateSelect = document.getElementById('quotation-template');
        if (templateSelect) {
            templateSelect.innerHTML = '<option value="">Using default settings (templates unavailable)</option>';
        }
    }
}

// Apply selected template to quotation form
function applyQuotationTemplate() {
    const templateId = document.getElementById('quotation-template').value;
    selectedTemplate = quotationTemplates.find(t => t.id === templateId);
    
    const companyInfoDiv = document.getElementById('template-company-info');
    const companyNameDisplay = document.getElementById('template-company-name-display');
    const companyDetailsDisplay = document.getElementById('template-company-details-display');
    
    if (selectedTemplate) {
        // Show company info
        companyInfoDiv.classList.remove('hidden');
        companyNameDisplay.textContent = selectedTemplate.companyName;
        
        const details = [];
        if (selectedTemplate.companyPhone) details.push(selectedTemplate.companyPhone);
        if (selectedTemplate.companyEmail) details.push(selectedTemplate.companyEmail);
        companyDetailsDisplay.textContent = details.join(' • ');
        
        // Apply template settings to form (only if creating new quotation)
        if (!currentQuotationId) {
            document.getElementById('quotation-currency').value = selectedTemplate.defaultCurrency;
            document.getElementById('quote-header-buffer').value = (selectedTemplate.headerBuffer * 100).toFixed(2);
            document.getElementById('quote-tax-rate').value = (selectedTemplate.taxRate * 100).toFixed(2);
            document.getElementById('quote-discount-type').value = selectedTemplate.discountType;
            document.getElementById('quote-discount-value').value = selectedTemplate.discountValue;
            
            // Set notes if not already filled
            const notesField = document.getElementById('quote-notes');
            if (notesField && !notesField.value.trim()) {
                notesField.value = selectedTemplate.quotationNotes || '';
            }
        }
        
        // Update totals to reflect new template settings
        updateQuotationTotals();
        
    } else {
        // Hide company info
        companyInfoDiv.classList.add('hidden');
        
        // Reset to default settings if no template selected and creating new
        if (!currentQuotationId && settings) {
            document.getElementById('quotation-currency').value = settings.defaultCurrency || 'PKR';
            document.getElementById('quote-header-buffer').value = (settings.headerBuffer * 100) || 0;
            document.getElementById('quote-tax-rate').value = (settings.taxRate * 100) || 9;
            document.getElementById('quote-discount-type').value = settings.discountType || 'None';
            document.getElementById('quote-discount-value').value = settings.discountValue || 0;
        }
    }
}

// Export quotations report
async function exportQuotationsReport() {
    try {
        if (typeof generateQuotationsReport === 'function') {
            await generateQuotationsReport();
        } else {
            showToast('Excel report functionality not available', 'error');
        }
    } catch (error) {
        console.error('Error exporting quotations report:', error);
        showToast('Failed to export report', 'error');
    }
}

// Export quotation PDF
async function exportQuotationPDF(quotationId) {
    try {
        if (typeof exportDocumentPDF === 'function') {
            await exportDocumentPDF(quotationId, 'quotation');
        } else {
            showToast('PDF export functionality not available', 'error');
        }
    } catch (error) {
        console.error('Error exporting quotation PDF:', error);
        showToast('Failed to export PDF', 'error');
    }
}

// Initialize quotations module when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for quotation form fields that affect totals
    const fields = ['quote-header-buffer', 'quote-tax-rate', 'quote-discount-type', 'quote-discount-value'];
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', updateQuotationTotals);
            element.addEventListener('change', updateQuotationTotals);
        }
    });
    
    // Status is now automated - no manual dropdown changes needed
    
    // Initialize template status display
    updateQuotationTemplateStatus();
});

// Template Status and Change Functions

// Update quotation template status display
async function updateQuotationTemplateStatus() {
    try {
        const currentTemplateId = getCurrentTemplateId ? getCurrentTemplateId() : null;
        
        if (!currentTemplateId) {
            document.getElementById('current-template-name').textContent = 'No template selected';
            document.getElementById('current-template-details').textContent = 'Please select a template in Settings';
            return;
        }
        
        // Get template details
        const response = await fetch(`tables/company_templates/${currentTemplateId}`);
        if (response.ok) {
            const template = await response.json();
            document.getElementById('current-template-name').textContent = `${template.name} - ${template.companyName}`;
            document.getElementById('current-template-details').textContent = 
                `${template.companyEmail} • ${template.defaultCurrency} • Tax: ${(template.taxRate * 100).toFixed(1)}%`;
        }
    } catch (error) {
        console.error('Failed to update template status:', error);
        document.getElementById('current-template-name').textContent = 'Error loading template';
    }
}

// Show change template modal
async function showChangeTemplateModal() {
    try {
        // Load templates for modal
        const response = await fetch('tables/company_templates');
        const data = await response.json();
        const templates = data.data || [];
        
        const selector = document.getElementById('modal-template-selector');
        selector.innerHTML = '<option value="">Select a template...</option>';
        
        const currentTemplateId = getCurrentTemplateId ? getCurrentTemplateId() : null;
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} - ${template.companyName}`;
            if (template.id === currentTemplateId) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
        
        // Update modal info if template is pre-selected
        if (currentTemplateId) {
            updateModalTemplateInfo();
        }
        
        document.getElementById('change-template-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load templates for modal:', error);
        showToast('Failed to load templates', 'error');
    }
}

// Hide change template modal
function hideChangeTemplateModal() {
    document.getElementById('change-template-modal').classList.add('hidden');
}

// Update modal template info display
async function updateModalTemplateInfo() {
    const selector = document.getElementById('modal-template-selector');
    const infoDiv = document.getElementById('modal-template-info');
    const companyNameDiv = document.getElementById('modal-template-company-name');
    const detailsDiv = document.getElementById('modal-template-details');
    
    if (!selector.value) {
        infoDiv.classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`tables/company_templates/${selector.value}`);
        if (response.ok) {
            const template = await response.json();
            companyNameDiv.textContent = template.companyName;
            detailsDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Email:</strong> ${template.companyEmail || 'Not set'}</div>
                    <div><strong>Phone:</strong> ${template.companyPhone || 'Not set'}</div>
                    <div><strong>Currency:</strong> ${template.defaultCurrency}</div>
                    <div><strong>Tax Rate:</strong> ${(template.taxRate * 100).toFixed(1)}%</div>
                </div>
            `;
            infoDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load template details:', error);
    }
}

// Save template change
async function saveTemplateChange() {
    try {
        const selectedTemplateId = document.getElementById('modal-template-selector').value;
        
        if (!selectedTemplateId) {
            showToast('Please select a template', 'warning');
            return;
        }
        
        showLoading();
        
        // Use the same logic as in settings.js to set the template as default
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
        
        // Update the status display
        await updateQuotationTemplateStatus();
        
        // If there's a quotation form open, update its template selector
        const quotationTemplate = document.getElementById('quotation-template');
        if (quotationTemplate && !quotationTemplate.disabled) {
            quotationTemplate.value = selectedTemplateId;
            applyQuotationTemplate();
        }
        
        hideChangeTemplateModal();
        showToast('Template updated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to save template change:', error);
        showToast('Failed to update template', 'error');
    } finally {
        hideLoading();
    }
}

// Pagination Functions

// Update pagination controls
function updateQuotationsPagination() {
    const infoElement = document.getElementById('quotations-info');
    const pagesContainer = document.getElementById('quotations-pages');
    const prevBtn = document.getElementById('quotations-prev-btn');
    const nextBtn = document.getElementById('quotations-next-btn');
    const paginationDiv = document.getElementById('quotations-pagination');
    
    // Always show pagination div (similar to invoices behavior)
    paginationDiv.style.display = 'flex';
    
    // Update info text
    const startItem = ((quotationsCurrentPage - 1) * quotationsPerPage) + 1;
    const endItem = Math.min(quotationsCurrentPage * quotationsPerPage, quotationsTotalItems);
    infoElement.textContent = `Showing ${quotationsTotalItems > 0 ? startItem : 0}-${endItem} of ${quotationsTotalItems} quotations`;
    
    // Update button states
    prevBtn.disabled = quotationsCurrentPage <= 1;
    nextBtn.disabled = quotationsCurrentPage >= quotationsTotalPages || quotationsTotalItems === 0;
    
    // Generate page numbers (show max 5 pages)
    pagesContainer.innerHTML = '';
    const maxPages = 5;
    let startPage = Math.max(1, quotationsCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(quotationsTotalPages, startPage + maxPages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-2 text-sm rounded border ${
            i === quotationsCurrentPage 
                ? 'bg-primary-600 text-white border-primary-600' 
                : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border-gray-600'
        }`;
        button.textContent = i;
        button.onclick = () => goToQuotationsPage(i);
        pagesContainer.appendChild(button);
    }
}

// Navigation functions
function previousQuotationsPage() {
    if (quotationsCurrentPage > 1) {
        loadQuotationsTable(quotationsCurrentPage - 1);
    }
}

function nextQuotationsPage() {
    if (quotationsCurrentPage < quotationsTotalPages) {
        loadQuotationsTable(quotationsCurrentPage + 1);
    }
}

function goToQuotationsPage(page) {
    if (page !== quotationsCurrentPage && page >= 1 && page <= quotationsTotalPages) {
        loadQuotationsTable(page);
    }
}
