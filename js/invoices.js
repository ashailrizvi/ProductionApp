// Invoices Management
let invoiceLines = [];
let currentInvoice = {};

// Pagination state for invoices
let invoicesCurrentPage = 1;
let invoicesPerPage = 5;
let invoicesTotalPages = 1;
let invoicesTotalItems = 0;

// Loading protection flag
let isLoadingInvoices = false;

// Show invoice builder
async function showInvoiceBuilder() {
    document.getElementById('invoices-list').classList.add('hidden');
    document.getElementById('invoice-builder').classList.remove('hidden');
    
    // Initialize form listeners
    initializeInvoiceFormListeners();
    
    // Initialize new invoice
    currentInvoice = {};
    invoiceLines = [];
    currentInvoiceId = null;
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('issue-date').value = today;
    
    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('due-date').value = dueDate.toISOString().split('T')[0];
    
    // Set defaults from settings
    document.getElementById('invoice-currency').value = settings.defaultCurrency || 'PKR';
    document.getElementById('header-buffer').value = (settings.headerBuffer * 100) || 0;
    document.getElementById('tax-rate').value = (settings.taxRate * 100) || 9;
    document.getElementById('discount-type').value = settings.discountType || 'None';
    document.getElementById('discount-value').value = settings.discountValue || 0;
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    document.getElementById('invoice-number').value = invoiceNumber;
    
    // Clear client fields
    document.getElementById('client-name').value = '';
    document.getElementById('client-contact-person').value = '';
    document.getElementById('client-address').value = '';
    
    // Load customer dropdown
    if (typeof loadCustomerDropdown === 'function') {
        await loadCustomerDropdown();
    }
    
    // Ensure services are loaded
    if (!services || services.length === 0) {
        if (typeof loadServices === 'function') {
            await loadServices();
        }
    }
    
    // Add default first line item
    addInvoiceLine();
    
    // Update tables and totals (delay to ensure services are available)
    setTimeout(() => {
        updateInvoiceLinesTable();
        refreshServiceDropdowns();
        updateInvoiceTotals();
    }, 200);
}

// Generate invoice number
function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
}

// Load invoices table
async function loadInvoicesTable(page = 1) {
    // Prevent multiple simultaneous loads
    if (isLoadingInvoices) {
        return;
    }
    
    isLoadingInvoices = true;
    
    try {
        // Ensure all required data is loaded first
        if (!window.services || window.services.length === 0) {
            if (typeof loadServices === 'function') {
                await loadServices();
                window.services = services;
            }
        }
        
        if (!window.bundles || window.bundles.length === 0) {
            if (typeof loadBundles === 'function') {
                await loadBundles();
                window.bundles = bundles;
            }
        }
        
        if (!window.customers || window.customers.length === 0) {
            if (typeof loadCustomers === 'function') {
                await loadCustomers();
                window.customers = customers;
            }
        }
        
        // Ensure invoice functions are globally accessible
        window.previewInvoice = previewInvoice;
        window.closeInvoicePreview = closeInvoicePreview;
        window.exportInvoicesReport = exportInvoicesReport;
        window.deleteInvoice = deleteInvoice;
        
        // Ensure PDF and Excel functions are accessible (from other modules)
        if (typeof exportInvoicePDF === 'function') {
            window.exportInvoicePDF = exportInvoicePDF;
        }
        if (typeof exportInvoiceExcel === 'function') {
            window.exportInvoiceExcel = exportInvoiceExcel;
        }
        
        document.getElementById('invoice-builder').classList.add('hidden');
        document.getElementById('invoices-list').classList.remove('hidden');
        
        // Show loading state for first page
        const tbody = document.getElementById('invoices-table');
        if (page === 1) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <div>Loading invoices...</div>
                    </td>
                </tr>
            `;
        }
        
        // Fetch full list once, then filter and slice locally for pagination
        const response = await fetch('tables/invoices');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        let data;
        try { data = await response.json(); }
        catch {
            const raw = await response.text();
            try { data = JSON.parse(raw); } catch { data = { data: [] }; }
        }
        const allInvoices = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

        // Load persisted filter values and sync inputs
        const saved = JSON.parse(localStorage.getItem('invoiceFilters') || '{}');
        const searchInput = document.getElementById('invoice-search');
        const statusFilterSel = document.getElementById('invoice-status-filter');
        const clientFilterSel = document.getElementById('invoice-client-filter');
        if (searchInput && saved.search != null) searchInput.value = saved.search;
        if (statusFilterSel && saved.status != null) statusFilterSel.value = saved.status;
        if (clientFilterSel && saved.client != null) clientFilterSel.value = saved.client;

        // Apply filters across all pages
        const searchFilter = (searchInput?.value || '').toLowerCase();
        const statusFilter = (statusFilterSel?.value || '').toLowerCase();
        const clientFilter = (clientFilterSel?.value || '').toLowerCase();
        const filteredInvoices = allInvoices.filter(inv => {
            const status = (inv.status || 'Pending').toLowerCase();
            const client = (inv.clientName || '').toLowerCase();
            const rowText = [inv.number, inv.clientName, inv.projectPo, inv.currency]
                .map(v => (v || '').toString().toLowerCase()).join(' ');
            const statusMatch = !statusFilter || status.includes(statusFilter);
            const clientMatch = !clientFilter || client.includes(clientFilter);
            const searchMatch = !searchFilter || rowText.includes(searchFilter);
            return statusMatch && clientMatch && searchMatch;
        });

        // Sort: most recent first; Cleared/Cancelled moved to bottom
        const sortedInvoices = filteredInvoices.slice().sort((a, b) => {
            const aCleared = ['cleared', 'cancelled'].includes((a.status || '').toLowerCase());
            const bCleared = ['cleared', 'cancelled'].includes((b.status || '').toLowerCase());
            if (aCleared !== bCleared) return aCleared ? 1 : -1; // non-cleared first
            const da = new Date(a.issueDate || a.dueDate || 0).getTime();
            const db = new Date(b.issueDate || b.dueDate || 0).getTime();
            return db - da; // recent first within group
        });

        // Update pagination state using local slice
        invoicesTotalItems = sortedInvoices.length;
        invoicesTotalPages = Math.max(1, Math.ceil(invoicesTotalItems / invoicesPerPage));
        invoicesCurrentPage = Math.min(page, invoicesTotalPages);
        const start = (invoicesCurrentPage - 1) * invoicesPerPage;
        const invoices = sortedInvoices.slice(start, start + invoicesPerPage);
        tbody.innerHTML = '';
        
        if (invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-file-invoice text-4xl mb-4"></i>
                        <div>No invoices found</div>
                        <div class="text-sm">Create your first invoice to get started</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Load all invoice lines once for efficiency
        let allLines = [];
        try {
            const allLinesResponse = await fetch(`tables/invoice_lines`);
            if (allLinesResponse.ok) {
                const allLinesData = await allLinesResponse.json();
                allLines = allLinesData.data || [];
            }
        } catch {}

        // Local safe formatters in case globals aren't ready yet
        const fmtCurrency = (typeof window.formatCurrency === 'function')
            ? window.formatCurrency
            : (amount, currency = 'PKR') => {
                try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0); }
                catch { return `${currency} ${Number(amount || 0).toFixed(2)}`; }
            };
        const fmtDate = (typeof window.formatDate === 'function')
            ? window.formatDate
            : (dateString) => {
                if (!dateString) return '';
                const d = new Date(dateString);
                return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            };

        // Calculate totals for each invoice
        for (const invoice of invoices) {
            // Filter lines for this specific invoice and sort by order
            const lines = allLines
                .filter(line => line.invoiceId === invoice.id)
                .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
            
            // Invoice lines already have buffer-adjusted rates, don't double-apply
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const bufferedSubtotal = subtotal; // Already includes buffer
            const taxAmount = bufferedSubtotal * (invoice.taxRate || 0);
            
            let discountAmount = 0;
            if (invoice.discountType === 'Percent') {
                discountAmount = bufferedSubtotal * (invoice.discountValue || 0) / 100;
            } else if (invoice.discountType === 'Amount') {
                discountAmount = invoice.discountValue || 0;
            }
            
            const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            
            const statusVal = (invoice.status || 'Pending');
            const statusColor = statusVal === 'Cleared' ? 'bg-green-500' : (statusVal === 'Cancelled' ? 'bg-red-500' : 'bg-yellow-500');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${invoice.invoiceNumber || invoice.number}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${invoice.clientName}</div>
                    <div class="text-sm text-gray-400">${invoice.projectPo || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${fmtDate(invoice.issueDate)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${fmtDate(invoice.dueDate)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${fmtCurrency(grandTotal, invoice.currency)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="status-dot inline-block w-2.5 h-2.5 rounded-full ${statusColor}"></span>
                        <select class="bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1"
                                onchange="(function(sel){ updateInvoiceStatus('${invoice.id}', sel.value); try{updateInvoiceStatusDot(sel);}catch(e){} })(this)">
                            <option value="Pending" ${statusVal==='Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Cleared" ${statusVal==='Cleared' ? 'selected' : ''}>Cleared</option>
                            <option value="Cancelled" ${statusVal==='Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="preview-btn text-purple-400 hover:text-purple-300 mr-3" 
                            title="Preview Invoice" data-invoice-id="${invoice.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="export-btn text-green-400 hover:text-green-300 mr-3" 
                            title="Export Excel" data-invoice-id="${invoice.id}">
                        <i class="fas fa-file-excel"></i>
                    </button>
                    <button class="delete-btn text-red-400 hover:text-red-300" 
                            title="Delete Invoice" data-invoice-id="${invoice.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
        
        // Update pagination controls
        updateInvoicesPagination();

        // Wire up filters and update client filter options for current page
        try {
            updateInvoiceFilters(invoices);
            const searchInput = document.getElementById('invoice-search');
            const statusFilter = document.getElementById('invoice-status-filter');
            const clientFilter = document.getElementById('invoice-client-filter');
            if (searchInput && !searchInput.hasAttribute('data-listener-added')) {
                searchInput.addEventListener('input', () => {
                    const filters = {
                        search: document.getElementById('invoice-search')?.value || '',
                        status: document.getElementById('invoice-status-filter')?.value || '',
                        client: document.getElementById('invoice-client-filter')?.value || ''
                    };
                    localStorage.setItem('invoiceFilters', JSON.stringify(filters));
                    loadInvoicesTable(1);
                });
                searchInput.setAttribute('data-listener-added', 'true');
            }
            if (statusFilter && !statusFilter.hasAttribute('data-listener-added')) {
                statusFilter.addEventListener('change', () => {
                    const filters = {
                        search: document.getElementById('invoice-search')?.value || '',
                        status: document.getElementById('invoice-status-filter')?.value || '',
                        client: document.getElementById('invoice-client-filter')?.value || ''
                    };
                    localStorage.setItem('invoiceFilters', JSON.stringify(filters));
                    loadInvoicesTable(1);
                });
                statusFilter.setAttribute('data-listener-added', 'true');
            }
            if (clientFilter && !clientFilter.hasAttribute('data-listener-added')) {
                clientFilter.addEventListener('change', () => {
                    const filters = {
                        search: document.getElementById('invoice-search')?.value || '',
                        status: document.getElementById('invoice-status-filter')?.value || '',
                        client: document.getElementById('invoice-client-filter')?.value || ''
                    };
                    localStorage.setItem('invoiceFilters', JSON.stringify(filters));
                    loadInvoicesTable(1);
                });
                clientFilter.setAttribute('data-listener-added', 'true');
            }
            // No need to locally hide rows now; loadInvoicesTable applies filters across all pages
        } catch (e) {
            console.warn('Invoices filters setup warning:', e?.message || e);
        }
        
        // Add event listeners to invoice action buttons
        setTimeout(() => {
            // Preview buttons
            document.querySelectorAll('.preview-btn').forEach(button => {
                const invoiceId = button.getAttribute('data-invoice-id');
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await window.previewInvoice(invoiceId);
                    } catch (error) {
                        console.error('Preview failed:', error);
                        showToast('Failed to preview invoice', 'error');
                    }
                });
            });
            
            // Export buttons  
            document.querySelectorAll('.export-btn').forEach(button => {
                const invoiceId = button.getAttribute('data-invoice-id');
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof window.exportInvoiceExcel === 'function') {
                        await window.exportInvoiceExcel(invoiceId);
                    }
                });
            });
            
            // Delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                const invoiceId = button.getAttribute('data-invoice-id');
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof window.deleteInvoice === 'function') {
                        await window.deleteInvoice(invoiceId);
                    }
                });
            });
        }, 100);
        
    } catch (error) {
        console.error('Failed to load invoices:', error);
        try {
            const info = document.getElementById('invoices-info');
            if (info) info.textContent = `Failed to load invoices (${error.message || 'unknown error'})`;
        } catch {}
        try { showToast && showToast('Failed to load invoices', 'error'); } catch {}
        
        // Clear pagination on error
        document.getElementById('invoices-pagination').style.display = 'none';
    } finally {
        isLoadingInvoices = false;
        try { window.__invoicesLoaded = true; } catch {}
    }
}

// Add invoice line
function addInvoiceLine() {
    const line = {
        id: generateId(),
        serviceId: '',
        serviceCode: '',
        serviceName: '',
        category: '',
        rate: 0,
        bundleCost: 0,
        lineBuffer: 0,
        quantity: 1,
        unit: '',
        isOptional: false,
        adjustedRate: 0,
        lineTotal: 0
    };
    
    invoiceLines.push(line);
    updateInvoiceLinesTable();
}

// Remove invoice line
function removeInvoiceLine(lineId) {
    invoiceLines = invoiceLines.filter(line => line.id !== lineId);
    updateInvoiceLinesTable();
    updateInvoiceTotals();
}

// Update invoice lines table
function updateInvoiceLinesTable() {
    const tbody = document.getElementById('invoice-lines');
    if (!tbody) {
        console.error('Invoice lines table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Get services array (try both global and window)
    const availableServices = window.services || services || [];
    console.log('Available services for dropdown:', availableServices.length);
    
    if (availableServices.length === 0) {
        console.warn('No services available for dropdown. Attempting to reload...');
        // Try to reload services if none are available
        if (typeof loadServices === 'function') {
            loadServices().then(() => {
                console.log('Services reloaded, updating table again');
                updateInvoiceLinesTable();
            });
            return;
        }
    }
    
    invoiceLines.forEach((line, index) => {
        const row = document.createElement('tr');
        row.className = 'bg-gray-800';
        
        // Create service dropdown options
        const serviceOptions = availableServices.map(service => 
            `<option value="${service.id}" ${service.id === line.serviceId ? 'selected' : ''}>
                ${service.serviceCode} - ${service.name}
            </option>`
        ).join('');
        
        row.innerHTML = `
            <td class="px-4 py-2">
                <select class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        onchange="updateLineService(${index}, this.value)">
                    <option value="">Select Service</option>
                    ${serviceOptions}
                </select>
            </td>
            <td class="px-4 py-2">
                <input type="number" step="0.01" value="${line.rate}" 
                       class="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                       onchange="updateLineRate(${index}, this.value)">
            </td>
            <td class="px-4 py-2">
                <input type="number" step="0.01" value="${line.bundleCost}" readonly
                       class="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-300 text-sm">
            </td>
            <td class="px-4 py-2">
                <input type="number" step="0.01" value="${line.lineBuffer}" 
                       class="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                       onchange="updateLineBuffer(${index}, this.value)">
            </td>
            <td class="px-4 py-2">
                <input type="number" step="0.01" value="${line.adjustedRate}" readonly
                       class="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-300 text-sm">
            </td>
            <td class="px-4 py-2">
                <input type="number" step="1" min="1" value="${line.quantity}" 
                       class="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                       onchange="updateLineQuantity(${index}, this.value)">
            </td>
            <td class="px-4 py-2">
                <input type="number" step="0.01" value="${line.lineTotal}" readonly
                       class="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-300 text-sm font-semibold">
            </td>
            <td class="px-4 py-2">
                <button onclick="removeInvoiceLine('${line.id}')" 
                        class="text-red-400 hover:text-red-300">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update line service
async function updateLineService(index, serviceId) {
    const availableServices = window.services || services || [];
    const service = availableServices.find(s => s.id === serviceId);
    if (!service) {
        console.warn('Service not found:', serviceId);
        return;
    }
    
    const expandBundles = document.getElementById('expand-bundles').checked;
    
    if (expandBundles && isBundle(serviceId)) {
        // Remove current line and expand bundle
        invoiceLines.splice(index, 1);
        
        const expandedItems = await expandBundle(serviceId, true);
        
        // Add expanded items
        expandedItems.forEach(item => {
            const line = {
                id: generateId(),
                serviceId: item.id,
                serviceCode: item.serviceCode,
                serviceName: item.name,
                category: item.category,
                rate: item.rate,
                bundleCost: 0,
                lineBuffer: 0,
                quantity: 1,
                unit: item.unit,
                isOptional: false,
                adjustedRate: 0,
                lineTotal: 0
            };
            
            updateLineCalculations(line);
            invoiceLines.push(line);
        });
    } else {
        // Update current line
        const line = invoiceLines[index];
        line.serviceId = serviceId;
        line.serviceCode = service.serviceCode;
        line.serviceName = service.name;
        line.category = service.category;
        line.rate = service.baseRate || 0;
        line.unit = service.unit;
        line.isOptional = false;
        
        // Get bundle cost if applicable
        if (!expandBundles && isBundle(serviceId)) {
            line.bundleCost = await getBundleCost(serviceId);
        } else {
            line.bundleCost = 0;
        }
        
        updateLineCalculations(line);
    }
    
    updateInvoiceLinesTable();
    updateInvoiceTotals();
}

// Update line rate
function updateLineRate(index, rate) {
    const line = invoiceLines[index];
    line.rate = parseFloat(rate) || 0;
    updateLineCalculations(line);
    updateInvoiceLinesTable();
    updateInvoiceTotals();
}

// Update line buffer
function updateLineBuffer(index, buffer) {
    const line = invoiceLines[index];
    line.lineBuffer = parseFloat(buffer) || 0;
    updateLineCalculations(line);
    updateInvoiceLinesTable();
    updateInvoiceTotals();
}

// Update line quantity
function updateLineQuantity(index, quantity) {
    const line = invoiceLines[index];
    line.quantity = parseFloat(quantity) || 1;
    updateLineCalculations(line);
    updateInvoiceLinesTable();
    updateInvoiceTotals();
}

// Update line calculations
function updateLineCalculations(line) {
    const headerBuffer = parseFloat(document.getElementById('header-buffer').value) || 0;
    
    line.adjustedRate = calculateAdjustedRate(
        line.rate,
        line.bundleCost,
        headerBuffer,
        line.lineBuffer
    );
    
    line.lineTotal = calculateLineTotal(line.adjustedRate, line.quantity);
}

// Update invoice totals
function updateInvoiceTotals() {
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.lineTotal, 0);
    
    const taxRate = parseFloat(document.getElementById('tax-rate').value) / 100 || 0;
    const taxAmount = subtotal * taxRate;
    
    const discountType = document.getElementById('discount-type').value;
    const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;
    
    let discountAmount = 0;
    if (discountType === 'Percent') {
        discountAmount = subtotal * discountValue / 100;
    } else if (discountType === 'Amount') {
        discountAmount = discountValue;
    }
    
    const grandTotal = subtotal + taxAmount - discountAmount;
    
    document.getElementById('invoice-subtotal').textContent = formatCurrency(subtotal, document.getElementById('invoice-currency').value);
    document.getElementById('invoice-tax').textContent = formatCurrency(taxAmount, document.getElementById('invoice-currency').value);
    document.getElementById('invoice-discount').textContent = formatCurrency(discountAmount, document.getElementById('invoice-currency').value);
    document.getElementById('invoice-grand-total').textContent = formatCurrency(grandTotal, document.getElementById('invoice-currency').value);
}

// Initialize invoice form event listeners
function initializeInvoiceFormListeners() {
    const invoiceForm = document.getElementById('invoice-form');
    if (invoiceForm && !invoiceForm.hasAttribute('data-listener-added')) {
        invoiceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (invoiceLines.length === 0) {
        showToast('Please add at least one line item', 'error');
        return;
    }
    
    const invoiceData = {
        number: document.getElementById('invoice-number').value.trim(),
        issueDate: document.getElementById('issue-date').value,
        dueDate: document.getElementById('due-date').value,
        clientName: document.getElementById('client-name').value.trim(),
        contactPerson: document.getElementById('client-contact-person').value.trim(),
        clientAddress: document.getElementById('client-address').value.trim(),
        currency: document.getElementById('invoice-currency').value,
        taxRate: parseFloat(document.getElementById('tax-rate').value) / 100 || 0,
        discountType: document.getElementById('discount-type').value,
        discountValue: parseFloat(document.getElementById('discount-value').value) || 0,
        headerBuffer: parseFloat(document.getElementById('header-buffer').value) / 100 || 0,
        fxToBase: null // Will be auto-filled if needed
    };
    
    // Auto-fill FX rate if currency is different from base
    if (invoiceData.currency !== settings.baseCurrency) {
        const fxRate = getCurrencyRate(invoiceData.currency, settings.baseCurrency);
        if (fxRate) {
            invoiceData.fxToBase = fxRate;
        }
    }
    
    try {
        showLoading();
        
        let response;
        if (currentInvoiceId) {
            // Update existing invoice
            response = await fetch(`tables/invoices/${currentInvoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
        } else {
            // Create new invoice
            invoiceData.id = generateId();
            currentInvoiceId = invoiceData.id;
            // Default status for new invoice
            invoiceData.status = 'Pending';
            response = await fetch('tables/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to save invoice');
        }
        
        // Save invoice lines
        await saveInvoiceLines(currentInvoiceId);
        
        showToast('Invoice saved successfully', 'success');
        await loadInvoices();
        showPage('invoices');
        
    } catch (error) {
        console.error('Failed to save invoice:', error);
        showToast('Failed to save invoice', 'error');
    } finally {
        hideLoading();
    }
        });
        invoiceForm.setAttribute('data-listener-added', 'true');
    }
}

// Save invoice lines
async function saveInvoiceLines(invoiceId) {
    // Clear existing lines
    const existingLinesResponse = await fetch(`tables/invoice_lines?search=${invoiceId}`);
    const existingLinesData = await existingLinesResponse.json();
    const existingLines = existingLinesData.data || [];
    
    for (const line of existingLines) {
        await fetch(`tables/invoice_lines/${line.id}`, { method: 'DELETE' });
    }
    
    // Save new lines
    for (const line of invoiceLines) {
        const lineData = {
            id: generateId(),
            invoiceId: invoiceId,
            serviceId: line.serviceId,
            serviceCode: line.serviceCode,
            serviceName: line.serviceName,
            category: line.category,
            rate: line.rate,
            bundleCost: line.bundleCost,
            lineBuffer: line.lineBuffer,
            quantity: line.quantity,
            unit: line.unit,
            isOptional: line.isOptional,
            adjustedRate: line.adjustedRate,
            lineTotal: line.lineTotal
        };
        
        await fetch('tables/invoice_lines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lineData)
        });
    }
}

// Delete invoice
async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        showLoading();
        
        // Delete invoice lines first
        const linesResponse = await fetch(`tables/invoice_lines?search=${invoiceId}`);
        const linesData = await linesResponse.json();
        const lines = linesData.data || [];
        
        for (const line of lines) {
            await fetch(`tables/invoice_lines/${line.id}`, { method: 'DELETE' });
        }
        
        // Delete invoice
        const response = await fetch(`tables/invoices/${invoiceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Invoice deleted successfully', 'success');
            await loadInvoicesTable(1);
            loadInvoicesTable();
        } else {
            showToast('Failed to delete invoice', 'error');
        }
    } catch (error) {
        console.error('Failed to delete invoice:', error);
        showToast('Failed to delete invoice', 'error');
    } finally {
        hideLoading();
    }
}

// Update invoice status (Pending | Cleared | Cancelled)
async function updateInvoiceStatus(invoiceId, newStatus) {
    try {
        showLoading();
        // Load existing invoice to avoid overwriting fields
        const getRes = await fetch(`tables/invoices/${invoiceId}`);
        if (!getRes.ok) {
            showToast('Failed to load invoice for status update', 'error');
            return;
        }
        const existing = await getRes.json();
        const current = existing?.status || 'Pending';
        if (current === newStatus) {
            showToast('Status unchanged', 'info');
            return;
        }
        const payload = { ...existing, status: newStatus };
        const putRes = await fetch(`tables/invoices/${invoiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!putRes.ok) {
            showToast('Failed to update invoice status', 'error');
            return;
        }
        showToast('Invoice status updated', 'success');
        // Refresh current table page
        try { await loadInvoicesTable(invoicesCurrentPage || 1); } catch {}
        try { filterInvoices(); } catch {}
    } catch (err) {
        console.error('Status update failed:', err);
        showToast('Status update failed', 'error');
    } finally {
        hideLoading();
    }
}

// Edit invoice functionality removed - invoices should not be edited after generation

// Refresh service dropdowns in all line items
function refreshServiceDropdowns() {
    const availableServices = window.services || services || [];
    console.log('Refreshing service dropdowns with', availableServices.length, 'services');
    
    document.querySelectorAll('#invoice-lines select').forEach((select, index) => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Service</option>';
        
        availableServices.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.serviceCode} - ${service.name}`;
            if (service.id === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

// Make refresh function globally available
window.refreshServiceDropdowns = refreshServiceDropdowns;

// Add event listeners for real-time calculations
document.addEventListener('DOMContentLoaded', function() {
    const headerBufferInput = document.getElementById('header-buffer');
    const taxRateInput = document.getElementById('tax-rate');
    const discountTypeSelect = document.getElementById('discount-type');
    const discountValueInput = document.getElementById('discount-value');
    
    if (headerBufferInput) {
        headerBufferInput.addEventListener('input', function() {
            // Recalculate all lines
            invoiceLines.forEach(line => updateLineCalculations(line));
            updateInvoiceLinesTable();
            updateInvoiceTotals();
        });
    }
    
    if (taxRateInput) {
        taxRateInput.addEventListener('input', updateInvoiceTotals);
    }
    
    if (discountTypeSelect) {
        discountTypeSelect.addEventListener('change', updateInvoiceTotals);
    }
    
    if (discountValueInput) {
        discountValueInput.addEventListener('input', updateInvoiceTotals);
    }
});

// Preview invoice in a modal/popup view
async function previewInvoice(invoiceId) {
    try {
        showLoading();
        // Ensure dependencies are available if the invoices page was opened directly
        if ((!window.services || window.services.length === 0) && typeof loadServices === 'function') {
            try { await loadServices(); window.services = window.services || services || []; } catch {}
        }
        if ((!window.bundles || window.bundles.length === 0) && typeof loadBundles === 'function') {
            try { await loadBundles(); window.bundles = window.bundles || bundles || []; } catch {}
        }
        if ((!window.customers || window.customers.length === 0) && typeof loadCustomers === 'function') {
            try { await loadCustomers(); window.customers = window.customers || customers || []; } catch {}
        }
        if ((!window.companyTemplates || window.companyTemplates.length === 0) && typeof loadCompanyTemplates === 'function') {
            try { await loadCompanyTemplates(); } catch {}
        }
        
        // Load invoice data
        const invoiceResponse = await fetch(`tables/invoices/${invoiceId}`);
        if (!invoiceResponse.ok) {
            throw new Error(`Failed to fetch invoice: HTTP ${invoiceResponse.status}`);
        }
        
        const invoice = await invoiceResponse.json();
        
        if (!invoice || !invoice.id) {
            throw new Error('Invoice not found or invalid');
        }
        
        // Load company template for the invoice
        let template = null;
        let templateId = invoice.templateId;
        
        // If invoice has no templateId, try to get the current/default template
        if (!templateId && typeof getCurrentTemplateId === 'function') {
            templateId = getCurrentTemplateId();
        }
        
        if (templateId) {
            try {
                const templateResponse = await fetch(`tables/company_templates/${templateId}`);
                if (templateResponse.ok) {
                    template = await templateResponse.json();
                }
            } catch (error) {
                console.warn('Failed to load invoice template:', error);
            }
        }
        
        // Load invoice lines for this specific invoice
        let allLines = [];
        try {
            const linesResponse = await fetch(`tables/invoice_lines`);
            if (linesResponse.ok) {
                const allLinesData = await linesResponse.json();
                allLines = allLinesData.data || [];
            }
        } catch {}
        
        // Filter lines for this invoice specifically and sort by order
        const lines = allLines
            .filter(line => line.invoiceId === invoiceId)
            .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
        
        // Calculate totals (invoice lines already have buffer-adjusted rates)
        const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        const bufferedSubtotal = subtotal; // No need to add buffer, already included in line totals
        const taxAmount = bufferedSubtotal * (invoice.taxRate || 0);
        
        let discountAmount = 0;
        if (invoice.discountType === 'Percent') {
            discountAmount = bufferedSubtotal * (invoice.discountValue || 0) / 100;
        } else if (invoice.discountType === 'Amount') {
            discountAmount = invoice.discountValue || 0;
        }
        
        const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
        
        // Hide loader before showing modal
        if (typeof hideLoading === 'function') { try { hideLoading(); } catch {} }
        // Show preview modal
        showInvoicePreview(invoice, lines, {
            subtotal,
            headerBuffer: 0, // No separate buffer since it's already included
            bufferedSubtotal, 
            taxAmount,
            discountAmount,
            grandTotal
        }, template);
        
    } catch (error) {
        console.error('❌ Error loading invoice preview:', error);
        showToast('Failed to load invoice preview: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Show invoice preview modal
function showInvoicePreview(invoice, lines, totals, template = null) {
    let modal = document.getElementById('invoice-preview-modal');
    let content = document.getElementById('invoice-preview-content');
    // If the modal exists but is inside a hidden page container, re-parent it to body
    try {
        if (modal) {
            const hiddenAncestor = modal.closest('.page-content.hidden');
            if (hiddenAncestor) {
                document.body.appendChild(modal);
            }
        }
    } catch (e) {
        console.warn('Invoice preview modal re-parent check failed:', e?.message || e);
    }
    // Self-healing: create modal scaffold if missing
    if (!modal || !content) {
        try {
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            modal = document.createElement('div');
            modal.id = 'invoice-preview-modal';
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 hidden flex items-center justify-center p-4';
            modal.style.zIndex = 9999;
            const wrapper = document.createElement('div');
            wrapper.className = 'bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible';
            const header = document.createElement('div');
            header.className = 'p-8 print:p-0';
            header.innerHTML = `
                <div class="flex justify-between items-center mb-6 print:hidden">
                    <h3 class="text-xl font-semibold text-gray-800">Invoice Preview</h3>
                    <div class="flex space-x-3">
                        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center">
                            <i class="fas fa-print mr-2"></i>Print
                        </button>
                        <button onclick="closeInvoicePreview()" class="text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>`;
            content = document.createElement('div');
            content.id = 'invoice-preview-content';
            content.className = 'space-y-6';
            header.appendChild(content);
            wrapper.appendChild(header);
            modal.appendChild(wrapper);
            document.body.appendChild(modal);
        } catch (err) {
            console.error('Failed to create invoice preview modal scaffold:', err);
            return;
        }
    }
    
    if (!modal) {
        console.error('❌ Invoice preview modal not found in DOM');
        return;
    }
    
    if (!content) {
        console.error('❌ Invoice preview content container not found in DOM');
        return;
    }
    
    // Customer data is stored directly in invoice
    const customer = {
        name: invoice.clientName,
        contactPerson: invoice.contactPerson,
        address: invoice.clientAddress
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
    
    // Sort lines: bundles first, then add-ons, maintaining database order
    const sortedLines = [...lines];
    
    // Build line items table
    let lineItemsHtml = '';
    sortedLines.forEach((line, index) => {
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
        
        // Invoice lines already have adjusted rates, no need to apply buffer again
        const clientRate = line.rate || 0;
        const clientLineTotal = line.lineTotal || 0;

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
                <td class="py-3 text-right text-gray-900">${formatCurrency(clientRate, invoice.currency)}</td>
                <td class="py-3 text-right font-medium text-gray-900">${formatCurrency(clientLineTotal, invoice.currency)}</td>
            </tr>
        `;
    });
    
    if (!lines.length) {
        lineItemsHtml = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    No line items in this invoice
                </td>
            </tr>
        `;
    }
    
    // Build the complete preview HTML
    try {
        const previewHTML = `
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
            
            <!-- Invoice Header -->
            <div class="border-b border-gray-200 pb-6 mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800 mb-2">INVOICE</h1>
                        <div class="text-lg text-gray-800">
                            <div><strong>Number:</strong> ${invoice.number || 'N/A'}</div>
                            ${invoice.projectPo ? `<div><strong>PO:</strong> ${invoice.projectPo}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-800 space-y-1">
                            <div><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</div>
                            <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
                            <div><strong>Currency:</strong> ${invoice.currency || 'PKR'}</div>
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
                            <span class="font-medium text-gray-900">${formatCurrency(totals.bufferedSubtotal, invoice.currency)}</span>
                        </div>
                        
                        ${totals.discountAmount > 0 ? `
                            <div class="flex justify-between py-1 text-green-800">
                                <span>Discount ${invoice.discountType === 'Percent' ? `(${invoice.discountValue}%)` : ''}:</span>
                                <span class="font-medium">-${formatCurrency(totals.discountAmount, invoice.currency)}</span>
                            </div>
                        ` : ''}
                        
                        ${totals.taxAmount > 0 ? `
                            <div class="flex justify-between py-1">
                                <span class="text-gray-800">Tax (${((invoice.taxRate || 0) * 100).toFixed(1)}%):</span>
                                <span class="font-medium text-gray-900">${formatCurrency(totals.taxAmount, invoice.currency)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="border-t border-gray-300 pt-2">
                            <div class="flex justify-between py-2">
                                <span class="text-lg font-semibold text-gray-900">Total Amount:</span>
                                <span class="text-lg font-bold text-gray-900">${formatCurrency(totals.grandTotal, invoice.currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Terms & Notes -->
            ${(template?.invoiceTerms || invoice.terms || template?.invoiceNotes || invoice.notes) ? `
                <div class="border-t border-gray-200 pt-6 mt-6">
                    ${(template?.invoiceTerms || invoice.terms) ? `
                        <div class="mb-4">
                            <h4 class="font-semibold text-gray-900 mb-2">Terms & Conditions:</h4>
                            <div class="text-gray-800 whitespace-pre-wrap">${template?.invoiceTerms || invoice.terms}</div>
                        </div>
                    ` : ''}
                    ${(template?.invoiceNotes || invoice.notes) ? `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Notes:</h4>
                            <div class="text-gray-800 whitespace-pre-wrap">${template?.invoiceNotes || invoice.notes}</div>
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
        
        // Set the content
        content.innerHTML = previewHTML;
        
    } catch (templateError) {
        console.error('Error building invoice template:', templateError);
        
        // Fallback simple content
        const fallbackContent = `
            <div class="p-8 text-center">
                <h3 class="text-xl font-bold text-red-600 mb-4">Preview Error</h3>
                <p class="text-gray-600 mb-4">There was an error generating the invoice preview.</p>
                <p class="text-sm text-gray-500">Invoice: ${invoice.invoiceNumber || 'Unknown'}</p>
                <p class="text-sm text-gray-500">Client: ${invoice.clientName || 'Unknown'}</p>
                <p class="text-sm text-red-500 mt-4">Error: ${templateError.message}</p>
                <div class="mt-6">
                    <button onclick="closeInvoicePreview()" class="bg-blue-500 text-white px-4 py-2 rounded">
                        Close Preview
                    </button>
                </div>
            </div>
        `;
        
        try {
            content.innerHTML = fallbackContent;
        } catch (fallbackError) {
            console.error('Critical preview error:', fallbackError);
            content.innerHTML = '<div class="p-8 text-center"><h3>Critical Preview Error</h3></div>';
        }
    }
    
    // Show the modal
    try {
        modal.classList.remove('hidden');
    } catch (modalError) {
        console.error('Error showing modal:', modalError);
    }
}

// Close invoice preview modal
function closeInvoicePreview() {
    const modal = document.getElementById('invoice-preview-modal');
    modal.classList.add('hidden');
}

// Update status badge color next to select
function updateInvoiceStatusDot(selectEl) {
    try {
        const container = selectEl.closest('td');
        const dot = container ? container.querySelector('.status-dot') : null;
        if (!dot) return;
        dot.classList.remove('bg-green-500', 'bg-red-500', 'bg-yellow-500');
        const v = (selectEl.value || '').toLowerCase();
        if (v === 'cleared') dot.classList.add('bg-green-500');
        else if (v === 'cancelled') dot.classList.add('bg-red-500');
        else dot.classList.add('bg-yellow-500');
    } catch {}
}

// Update invoice filters (client dropdown)
function updateInvoiceFilters(invoices) {
    try {
        const clientFilter = document.getElementById('invoice-client-filter');
        if (!clientFilter) return;
        const uniqueClients = [...new Set((invoices || []).map(inv => inv.clientName).filter(Boolean))].sort((a,b) => a.localeCompare(b));
        const current = clientFilter.value || '';
        clientFilter.innerHTML = '<option value="">All Clients</option>';
        uniqueClients.forEach(client => {
            const opt = document.createElement('option');
            opt.value = client;
            opt.textContent = client;
            clientFilter.appendChild(opt);
        });
        // Try to retain previous selection
        if ([...clientFilter.options].some(o => o.value === current)) {
            clientFilter.value = current;
        }
    } catch (e) {
        console.warn('Failed updating invoice filters:', e?.message || e);
    }
}

// Apply filters to invoice rows
function filterInvoices() {
    const statusFilter = (document.getElementById('invoice-status-filter')?.value || '').toLowerCase();
    const clientFilter = (document.getElementById('invoice-client-filter')?.value || '').toLowerCase();
    const searchFilter = (document.getElementById('invoice-search')?.value || '').toLowerCase();

    const rows = document.querySelectorAll('#invoices-table tr');
    rows.forEach(row => {
        if (!row || row.children.length < 7) return;
        // Status is a select in column 6
        let status = '';
        try {
            const statusSel = row.querySelector('td:nth-child(6) select');
            status = (statusSel?.value || '').toLowerCase();
        } catch {}
        const clientText = (row.children[1]?.textContent || '').toLowerCase();
        const searchText = (row.textContent || '').toLowerCase();

        const statusMatch = !statusFilter || status.includes(statusFilter);
        const clientMatch = !clientFilter || clientText.includes(clientFilter);
        const searchMatch = !searchFilter || searchText.includes(searchFilter);

        row.style.display = (statusMatch && clientMatch && searchMatch) ? '' : 'none';
    });
}

// Preview functions made globally accessible in loadInvoicesTable

// Robust delegated handler: ensures preview works even if listeners were not bound yet
document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.preview-btn') : null;
    if (!btn) return;
    const invoiceId = btn.getAttribute && btn.getAttribute('data-invoice-id');
    if (!invoiceId) return;
    e.preventDefault();
    try { (window.previewInvoice || previewInvoice)(invoiceId); } catch (err) { console.error('Preview handler error:', err); }
});

// Export invoices report
async function exportInvoicesReport() {
    try {
        if (typeof generateInvoicesReport === 'function') {
            await generateInvoicesReport();
        } else {
            showToast('Excel report functionality not available', 'error');
        }
    } catch (error) {
        console.error('Error exporting invoices report:', error);
        showToast('Failed to export report', 'error');
    }
}

// Global function assignments moved to loadInvoicesTable for reliable access

// Pagination Functions for Invoices

// Update invoices pagination controls
function updateInvoicesPagination() {
    const infoElement = document.getElementById('invoices-info');
    const pagesContainer = document.getElementById('invoices-pages');
    const prevBtn = document.getElementById('invoices-prev-btn');
    const nextBtn = document.getElementById('invoices-next-btn');
    const paginationDiv = document.getElementById('invoices-pagination');
    

    
    // Always show pagination div for invoices (different behavior from quotations)
    paginationDiv.style.display = 'flex';
    
    // Update info text
    const startItem = ((invoicesCurrentPage - 1) * invoicesPerPage) + 1;
    const endItem = Math.min(invoicesCurrentPage * invoicesPerPage, invoicesTotalItems);
    infoElement.textContent = `Showing ${invoicesTotalItems > 0 ? startItem : 0}-${endItem} of ${invoicesTotalItems} invoices`;
    
    // Update button states
    prevBtn.disabled = invoicesCurrentPage <= 1;
    nextBtn.disabled = invoicesCurrentPage >= invoicesTotalPages || invoicesTotalItems === 0;
    
    // Generate page numbers (show max 5 pages)
    pagesContainer.innerHTML = '';
    
    if (invoicesTotalPages > 1) {
        const maxPages = 5;
        let startPage = Math.max(1, invoicesCurrentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(invoicesTotalPages, startPage + maxPages - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `px-3 py-2 text-sm rounded border ${
                i === invoicesCurrentPage 
                    ? 'bg-primary-600 text-white border-primary-600' 
                    : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border-gray-600'
            }`;
            button.textContent = i;
            button.onclick = () => goToInvoicesPage(i);
            pagesContainer.appendChild(button);
        }
    }
}

// Navigation functions for invoices
function previousInvoicesPage() {
    if (invoicesCurrentPage > 1) {
        loadInvoicesTable(invoicesCurrentPage - 1);
    }
}

function nextInvoicesPage() {
    if (invoicesCurrentPage < invoicesTotalPages) {
        loadInvoicesTable(invoicesCurrentPage + 1);
    }
}

function goToInvoicesPage(page) {
    if (page !== invoicesCurrentPage && page >= 1 && page <= invoicesTotalPages) {
        loadInvoicesTable(page);
    }
}

// Make invoice functions globally accessible
window.previewInvoice = previewInvoice;
window.closeInvoicePreview = closeInvoicePreview;
window.deleteInvoice = deleteInvoice;
window.showInvoicePreview = showInvoicePreview;
window.loadInvoicesTable = loadInvoicesTable;

// Delegated handler to ensure preview works even if listeners aren't bound yet
document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.preview-btn') : null;
    if (!btn) return;
    const invoiceId = btn.getAttribute && btn.getAttribute('data-invoice-id');
    if (!invoiceId) return;
    e.preventDefault();
    try { (window.previewInvoice || previewInvoice)(invoiceId); } catch (err) { console.error('Preview handler error:', err); }
});

