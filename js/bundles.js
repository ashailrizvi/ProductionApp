// Bundles Management

// Load bundles view
async function loadBundlesView() {
    try {
        showLoading();
        
        // Load bundles data
        const bundlesResponse = await fetch('tables/bundles');
        const bundlesData = await bundlesResponse.json();
        let bundles = bundlesData.data || [];
        
        // Load bundle items
        const itemsResponse = await fetch('tables/bundle_items');
        const itemsData = await itemsResponse.json();
        const bundleItems = itemsData.data || [];
        
        // Load services for reference
        const servicesResponse = await fetch('tables/services');
        const servicesData = await servicesResponse.json();
        const services = servicesData.data || [];
        
        const container = document.getElementById('bundles-container');
        // Initialize search input once
        try {
            const searchEl = document.getElementById('bundles-search');
            if (searchEl && !searchEl.hasAttribute('data-listener-added')) {
                searchEl.addEventListener('input', () => { try { loadBundlesView(); } catch {} });
                searchEl.setAttribute('data-listener-added', 'true');
            }
            const q = (searchEl?.value || '').trim().toLowerCase();
            if (q) {
                bundles = bundles.filter(b => (b.name || '').toLowerCase().includes(q));
            }
        } catch {}
        container.innerHTML = '';
        
        if (bundles.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-box text-4xl text-gray-500 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-400 mb-2">No bundles found</h3>
                    <p class="text-gray-500">Bundles will appear here when created</p>
                </div>
            `;
            return;
        }
        
        bundles.forEach(bundle => {
            const items = (bundleItems || []).filter(item => item.bundleId === bundle.id)
                .filter(item => {
                    // Backward-compatible include logic:
                    // - Required when isOptional is false
                    // - Optional included by default when defaultSelected is true
                    // - Fallback to legacy 'include' when new fields are missing
                    const isOptional = typeof item.isOptional === 'boolean' ? item.isOptional : false;
                    const defaultSelected = typeof item.defaultSelected === 'boolean' ? item.defaultSelected : (item.include !== false);
                    return !isOptional || defaultSelected;
                });
            const parentService = null; // parent service removed
            
            // Calculate bundle cost
            let totalBundleCost = 0;
            const itemsHtml = items.map(item => {
                const availableServices = window.services || services || [];
                const childService = availableServices.find(s => s.id === item.childServiceId);
                if (!childService) return '';
                
                const itemCost = (childService.baseRate || 0) * (item.childQty || 1);
                totalBundleCost += itemCost;
                
                return `
                    <tr class="border-b border-gray-600">
                        <td class="px-4 py-2">
                            <div class="text-sm font-medium text-white">${childService.serviceCode}</div>
                            <div class="text-xs text-gray-400">${childService.name}</div>
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-300">${item.childQty || 1}</td>
                        <td class="px-4 py-2 text-sm text-gray-300">${formatCurrency(childService.baseRate, childService.currency)}</td>
                        <td class="px-4 py-2 text-sm text-white font-medium">${formatCurrency(itemCost, childService.currency)}</td>
                        <td class="px-4 py-2 text-xs text-gray-400">${item.notes || '-'}</td>
                    </tr>
                `;
            }).join('');
            
            const bundleCard = document.createElement('div');
            bundleCard.className = 'bg-gray-800 rounded-lg border border-gray-700 mb-6';
            bundleCard.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-semibold text-white mb-2">
                                <i class="fas fa-box mr-2 text-green-500"></i>
                                ${bundle.name}
                            </h3>
                            <div class="flex items-center space-x-4 text-sm text-gray-400">
                                <span><strong>Bundle Code:</strong> ${bundle.bundleCode}</span>
                                
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-400">Total Bundle Cost</div>
                            <div class="text-lg font-bold text-white">${formatCurrency(totalBundleCost, 'PKR')}</div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h4 class="text-lg font-medium text-white mb-3">
                            <i class="fas fa-list mr-2"></i>Bundle Items
                        </h4>
                        
                        ${items.length > 0 ? `
                            <div class="overflow-x-auto">
                                <table class="min-w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Service</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Qty</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Base Rate</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsHtml}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="text-center py-6">
                                <i class="fas fa-inbox text-2xl text-gray-500 mb-2"></i>
                                <p class="text-gray-400">No items in this bundle</p>
                            </div>
                        `}
                        
                        ${bundle.description ? `
                        <div class="mt-4 p-3 bg-gray-800 rounded border">
                            <div class="text-sm text-gray-400 mb-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                Description:
                            </div>
                            <div class="text-sm text-gray-300">
                                ${bundle.description}
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="mt-4 flex justify-end space-x-3">
                            <button onclick="editBundle('${bundle.id}')" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-edit mr-1"></i>Edit
                            </button>
                            <button onclick="deleteBundle('${bundle.id}')" 
                                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-trash mr-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(bundleCard);
        });
        
    } catch (error) {
        console.error('Failed to load bundles:', error);
        showToast('Failed to load bundles', 'error');
        document.getElementById('bundles-container').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-400 mb-2">Failed to load bundles</h3>
                <p class="text-gray-500">Please try refreshing the page</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Get bundle cost for a service
async function getBundleCost(serviceId) {
    try {
        // Find a bundle by id or legacy parentServiceId
        const availableBundles = window.bundles || bundles || [];
        const bundle = availableBundles.find(b => b.id === serviceId || b.parentServiceId === serviceId);
        if (!bundle) return 0;
        
        // Get bundle items
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundle.id}`);
        const itemsData = await itemsResponse.json();
        const items = (itemsData.data || []).filter(it => it.bundleId === bundle.id);
        
        let totalCost = 0;
        
        for (const item of items) {
            const isOptional = typeof item.isOptional === 'boolean' ? item.isOptional : false;
            const defaultSelected = typeof item.defaultSelected === 'boolean' ? item.defaultSelected : (item.include !== false);
            if (!isOptional || defaultSelected) {
                const availableServices = window.services || services || [];
                const childService = availableServices.find(s => s.id === item.childServiceId);
                if (childService && childService.baseRate) {
                    totalCost += childService.baseRate * (item.childQty || 1);
                }
            }
        }
        
        return totalCost;
    } catch (error) {
        console.error('Failed to calculate bundle cost:', error);
        return 0;
    }
}

// Expand bundle into individual items
async function expandBundle(serviceId, expandBundles = false) {
    if (!expandBundles) {
        // Return the original service with bundle cost
        const service = services.find(s => s.id === serviceId);
        if (!service) return [];
        
        const bundleCost = await getBundleCost(serviceId);
        
        return [{
            id: service.id,
            serviceCode: service.serviceCode,
            name: service.name,
            category: service.category,
            rate: service.baseRate || 0,
            bundleCost: bundleCost,
            unit: service.unit,
            // Service-level optional removed; bundles control optionality
            currency: service.currency
        }];
    }
    
    try {
        // Find bundle for this service
        const availableBundles = window.bundles || bundles || [];
        const bundle = availableBundles.find(b => b.id === serviceId || b.parentServiceId === serviceId);
        if (!bundle) {
            // Not a bundle, return original service
            const availableServices = window.services || services || [];
            const service = availableServices.find(s => s.id === serviceId);
            if (!service) return [];
            
            return [{
                id: service.id,
                serviceCode: service.serviceCode,
                name: service.name,
                category: service.category,
                rate: service.baseRate || 0,
                bundleCost: 0,
                unit: service.unit,
                // Service-level optional removed
                currency: service.currency
            }];
        }
        
        // Get bundle items
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundle.id}`);
        const itemsData = await itemsResponse.json();
        const items = (itemsData.data || []).filter(it => it.bundleId === bundle.id);
        
        const expandedItems = [];
        
        for (const item of items) {
            const isOptional = typeof item.isOptional === 'boolean' ? item.isOptional : false;
            const defaultSelected = typeof item.defaultSelected === 'boolean' ? item.defaultSelected : (item.include !== false);
            if (!isOptional || defaultSelected) {
                const availableServices = window.services || services || [];
                const childService = availableServices.find(s => s.id === item.childServiceId);
                if (childService) {
                    // Create expanded item for each quantity
                    for (let i = 0; i < (item.childQty || 1); i++) {
                        expandedItems.push({
                            id: childService.id,
                            serviceCode: childService.serviceCode,
                            name: childService.name,
                            category: childService.category,
                            rate: childService.baseRate || 0,
                            bundleCost: 0,
                            unit: childService.unit,
                            // Service-level optional removed
                            currency: childService.currency,
                            fromBundle: bundle.name,
                            bundleNote: item.notes
                        });
                    }
                }
            }
        }
        
        return expandedItems;
        
    } catch (error) {
        console.error('Failed to expand bundle:', error);
        return [];
    }
}

// Check if service is a bundle parent
function isBundle(serviceId) {
    const availableBundles = window.bundles || bundles || [];
    return availableBundles.some(b => b.id === serviceId || b.parentServiceId === serviceId);
}

// Removed parent service concept

// Bundle Builder Variables
let bundleItems = [];
let currentBundleId = null;

// Show bundle builder
async function showBundleBuilder() {
    document.getElementById('bundles-list').classList.add('hidden');
    document.getElementById('bundle-builder').classList.remove('hidden');
    
    // Initialize form listeners
    initializeBundleFormListeners();
    
    // Initialize new bundle
    currentBundleId = null;
    bundleItems = [];
    
    // Clear form
    document.getElementById('bundle-code').value = '';
    document.getElementById('bundle-name').value = '';
    // parent service removed
    document.getElementById('bundle-description').value = '';
    await populateBundleUnitSelect();
    
    // Load parent service dropdown
    // parent service removed
    
    // Add default first item
    addBundleItem();
    
    // Update UI
    setTimeout(() => {
        updateBundleItemsTable();
        updateBundleSummary();
    }, 100);
}

// Hide bundle builder
function hideBundleBuilder() {
    document.getElementById('bundle-builder').classList.add('hidden');
    document.getElementById('bundles-list').classList.remove('hidden');
}

// Populate Bundle Unit select (shared by create/edit)
async function populateBundleUnitSelect(selectedValue = '') {
    try {
        const sel = document.getElementById('bundle-unit');
        if (!sel) return;
        // Ensure units are loaded
        if (!window.units || window.units.length === 0) {
            try {
                if (typeof loadUnits === 'function') {
                    await loadUnits();
                } else if (typeof window.loadUnits === 'function') {
                    await window.loadUnits();
                }
            } catch {}
        }
        const list = window.units || [];
        const current = sel.value;
        sel.innerHTML = '<option value="">Select unit</option>' + list.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        // Prefer explicit selectedValue, else keep existing, else empty
        sel.value = selectedValue || current || '';
        // Default to 'per day' if still empty and available
        if (!sel.value || sel.value.trim() === '') {
            const opt = Array.from(sel.options).find(o => (o.value || '').toLowerCase() === 'per day');
            if (opt) sel.value = opt.value;
        }
    } catch (e) {
        console.warn('populateBundleUnitSelect failed', e?.message || e);
    }
}

// loadParentServiceDropdown removed

// Add bundle item
function addBundleItem() {
    const newItem = {
        id: Date.now() + Math.random(),
        serviceId: '',
        serviceName: '',
        serviceCode: '',
        quantity: 1,
        baseRate: 0,
        totalCost: 0,
        // Bundle-level optional control
        isOptional: false,
        defaultSelected: true,
        include: true,
        notes: ''
    };
    
    bundleItems.push(newItem);
    updateBundleItemsTable();
}

// Update bundle items table
function updateBundleItemsTable() {
    const tbody = document.getElementById('bundle-items-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    bundleItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-600';
        
        // Create service dropdown options
        let serviceOptions = '<option value="">Select Service...</option>';
        const availableServices = window.services || services || [];
        
        if (availableServices && availableServices.length > 0) {
            availableServices.forEach(service => {
                const selected = service.id === item.serviceId ? 'selected' : '';
                serviceOptions += `<option value="${service.id}" ${selected}>${service.serviceCode} - ${service.name}</option>`;
            });
        }
        
        row.innerHTML = `
            <td class="px-4 py-2">
                <select onchange="selectBundleService(${index}, this.value)" 
                        class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm">
                    ${serviceOptions}
                </select>
            </td>
            <td class="px-4 py-2">
                <input type="number" value="${item.quantity}" min="1" step="1"
                       onchange="updateBundleItemQuantity(${index}, parseInt(this.value))"
                       class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <span class="text-white text-sm">${formatCurrency(item.baseRate, 'PKR')}</span>
            </td>
            <td class="px-4 py-2">
                <span class="text-white font-medium text-sm">${formatCurrency(item.totalCost, 'PKR')}</span>
            </td>
            <td class="px-4 py-2">
                <label class="flex items-center space-x-2 text-sm text-gray-200">
                    <input type="checkbox" ${item.isOptional ? 'checked' : ''}
                           onchange="updateBundleItemOptional(${index}, this.checked)"
                           class="w-4 h-4 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500">
                    <span>Optional</span>
                </label>
            </td>
            <td class="px-4 py-2">
                <label class="flex items-center space-x-2 text-sm text-gray-200">
                    <input type="checkbox" ${item.defaultSelected ? 'checked' : ''}
                           ${!item.isOptional ? 'disabled' : ''}
                           onchange="updateBundleItemDefaultSelected(${index}, this.checked)"
                           class="w-4 h-4 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500">
                    <span>Included</span>
                </label>
            </td>
            <td class="px-4 py-2">
                <input type="text" value="${item.notes}" 
                       onchange="updateBundleItemNotes(${index}, this.value)"
                       placeholder="Notes..."
                       class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm">
            </td>
            <td class="px-4 py-2">
                <button onclick="removeBundleItem(${index})" 
                        class="text-red-400 hover:text-red-300" title="Remove Item">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateBundleSummary();
}

// Service selection and item management functions
function selectBundleService(index, serviceId) {
    const availableServices = window.services || services || [];
    const service = availableServices.find(s => s.id === serviceId);
    
    if (service) {
        bundleItems[index].serviceId = serviceId;
        bundleItems[index].serviceName = service.name;
        bundleItems[index].serviceCode = service.serviceCode;
        bundleItems[index].baseRate = service.baseRate || 0;
        calculateBundleItemTotal(index);
        updateBundleItemsTable();
    }
}

function updateBundleItemQuantity(index, quantity) {
    bundleItems[index].quantity = quantity || 1;
    calculateBundleItemTotal(index);
    updateBundleItemsTable();
}

function updateBundleItemOptional(index, isOptional) {
    bundleItems[index].isOptional = !!isOptional;
    if (!bundleItems[index].isOptional) {
        // Required items are always included by default
        bundleItems[index].defaultSelected = true;
    }
    updateBundleItemsTable();
}

function updateBundleItemDefaultSelected(index, defSel) {
    bundleItems[index].defaultSelected = !!defSel;
    updateBundleItemsTable();
}

function updateBundleItemNotes(index, notes) {
    bundleItems[index].notes = notes;
}

function removeBundleItem(index) {
    bundleItems.splice(index, 1);
    updateBundleItemsTable();
}

// Calculate bundle item total cost
function calculateBundleItemTotal(index) {
    const item = bundleItems[index];
    item.totalCost = (item.baseRate || 0) * (item.quantity || 1);
}

// Update bundle summary
function updateBundleSummary() {
    const totalItems = bundleItems.length;
    const includedItems = bundleItems.filter(item => !item.isOptional || item.defaultSelected).length;
    
    const totalCost = bundleItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const includedCost = bundleItems
        .filter(item => !item.isOptional || item.defaultSelected)
        .reduce((sum, item) => sum + (item.totalCost || 0), 0);
    
    document.getElementById('bundle-total-items').textContent = totalItems;
    document.getElementById('bundle-included-items').textContent = includedItems;
    document.getElementById('bundle-total-cost').textContent = formatCurrency(totalCost, 'PKR');
    document.getElementById('bundle-included-cost').textContent = formatCurrency(includedCost, 'PKR');
}

// Refresh service dropdowns
async function refreshBundleServiceDropdowns() {

    
    // Try to reload services if needed
    if ((!services || services.length === 0) && (!window.services || window.services.length === 0)) {
        try {
            const response = await fetch('tables/services');
            if (response.ok) {
                const data = await response.json();
                services = data.data || [];
                window.services = services;
            }
        } catch (error) {
            console.error('Failed to reload services:', error);
        }
    }
    
    // parent service removed
    updateBundleItemsTable();
}

// Save bundle as draft
async function saveBundleAsDraft() {
    // Implementation for saving as draft
    showToast('Draft save functionality will be implemented', 'info');
}

// Initialize bundle form event listeners
function initializeBundleFormListeners() {
    const bundleForm = document.getElementById('bundle-form');
    if (bundleForm && !bundleForm.hasAttribute('data-listener-added')) {
        bundleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveBundle();
        });
        bundleForm.setAttribute('data-listener-added', 'true');
    }
}

// Save bundle function
async function saveBundle() {
    try {
        // Validate required fields
        const bundleCode = document.getElementById('bundle-code').value.trim();
        const bundleName = document.getElementById('bundle-name').value.trim();
        
        if (!bundleCode) {
            showToast('Bundle code is required', 'error');
            return;
        }
        
        if (!bundleName) {
            showToast('Bundle name is required', 'error');
            return;
        }
        
        if (bundleItems.length === 0) {
            showToast('At least one bundle item is required', 'error');
            return;
        }
        
        // Prepare bundle data
        const bundleData = {
            bundleCode: bundleCode,
            name: bundleName,
            // parentServiceId removed
            description: document.getElementById('bundle-description').value.trim(),
            unit: (document.getElementById('bundle-unit')?.value || '').trim()
        };
        
        let bundleResponse;
        if (currentBundleId) {
            // Update existing bundle
            bundleResponse = await fetch(`tables/bundles/${currentBundleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundleData)
            });
        } else {
            // Create new bundle
            bundleResponse = await fetch('tables/bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundleData)
            });
        }
        
        if (!bundleResponse.ok) {
            throw new Error('Failed to save bundle');
        }
        
        const savedBundle = await bundleResponse.json();
        
        // Save bundle items
        if (currentBundleId) {
            // Delete existing items and create new ones
            const existingItemsResponse = await fetch(`tables/bundle_items?search=${currentBundleId}`);
            const existingItemsData = await existingItemsResponse.json();
            const existingItems = existingItemsData.data || [];
            
            for (const item of existingItems) {
                await fetch(`tables/bundle_items/${item.id}`, { method: 'DELETE' });
            }
        }
        
        // Create new bundle items
        for (const item of bundleItems) {
            if (item.serviceId) {  // Only save items with selected services
                const itemData = {
                    bundleId: savedBundle.id,
                    childServiceId: item.serviceId,
                    childQty: item.quantity,
                    // Store both new and legacy fields for compatibility
                    isOptional: !!item.isOptional,
                    defaultSelected: item.isOptional ? !!item.defaultSelected : true,
                    include: item.isOptional ? !!item.defaultSelected : true,
                    notes: item.notes
                };
                
                await fetch('tables/bundle_items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            }
        }
        
        showToast(currentBundleId ? 'Bundle updated successfully' : 'Bundle saved successfully', 'success');
        // Refresh global bundles cache so other pages (e.g., quotations) see the new/updated bundle
        try {
            if (typeof loadBundles === 'function') {
                await loadBundles();
            } else if (typeof window.loadBundles === 'function') {
                await window.loadBundles();
            } else {
                const res = await fetch('tables/bundles');
                if (res.ok) {
                    const d = await res.json();
                    window.bundles = d.data || [];
                }
            }
        } catch {}

        // Reload bundles and return to list
        await loadBundlesView();
        hideBundleBuilder();
        
    } catch (error) {
        console.error('Error saving bundle:', error);
        showToast('Failed to save bundle', 'error');
    }
}

// Edit bundle
async function editBundle(bundleId) {
    try {
        // Load bundle data
        const bundleResponse = await fetch(`tables/bundles/${bundleId}`);
        const bundle = await bundleResponse.json();
        
        // Load bundle items
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundleId}`);
        const itemsData = await itemsResponse.json();
        const items = (itemsData.data || []).filter(it => it.bundleId === bundleId);
        
        // Set current bundle ID
        currentBundleId = bundleId;
        
        // Show bundle builder
        document.getElementById('bundles-list').classList.add('hidden');
        document.getElementById('bundle-builder').classList.remove('hidden');

        // Initialize form listeners
        initializeBundleFormListeners();

        // Populate form fields
        document.getElementById('bundle-code').value = bundle.bundleCode;
        document.getElementById('bundle-name').value = bundle.name;
        // parent service removed
        document.getElementById('bundle-description').value = bundle.description || '';

        // Populate units and set existing selection
        await populateBundleUnitSelect(bundle.unit || '');
        
        // parent service removed
        
        // Populate bundle items
        bundleItems = items.map(item => {
            const availableServices = window.services || services || [];
            const service = availableServices.find(s => s.id === item.childServiceId);
            
            return {
                id: item.id,
                serviceId: item.childServiceId,
                serviceName: service ? service.name : 'Unknown Service',
                serviceCode: service ? service.serviceCode : 'N/A',
                quantity: item.childQty || 1,
                baseRate: service ? service.baseRate || 0 : 0,
                totalCost: (service ? service.baseRate || 0 : 0) * (item.childQty || 1),
                isOptional: typeof item.isOptional === 'boolean' ? item.isOptional : false,
                defaultSelected: typeof item.defaultSelected === 'boolean' ? item.defaultSelected : (item.include !== false),
                include: typeof item.include === 'boolean' ? item.include : true,
                notes: item.notes || ''
            };
        });
        
        // Update UI
        updateBundleItemsTable();
        updateBundleSummary();
        
    } catch (error) {
        console.error('Error loading bundle for editing:', error);
        showToast('Failed to load bundle', 'error');
    }
}

// Delete bundle
async function deleteBundle(bundleId) {
    if (!confirm('Are you sure you want to delete this bundle?')) {
        return;
    }
    
    try {
        // Delete bundle items first
        const itemsResponse = await fetch(`tables/bundle_items?search=${bundleId}`);
        const itemsData = await itemsResponse.json();
        const items = (itemsData.data || []).filter(it => it.bundleId === bundleId);
        
        for (const item of items) {
            await fetch(`tables/bundle_items/${item.id}`, { method: 'DELETE' });
        }
        
        // Delete bundle
        await fetch(`tables/bundles/${bundleId}`, { method: 'DELETE' });
        
        // Refresh global bundles cache after delete
        try {
            if (typeof loadBundles === 'function') {
                await loadBundles();
            } else if (typeof window.loadBundles === 'function') {
                await window.loadBundles();
            } else {
                const res = await fetch('tables/bundles');
                if (res.ok) {
                    const d = await res.json();
                    window.bundles = d.data || [];
                }
            }
        } catch {}

        showToast('Bundle deleted successfully', 'success');
        loadBundlesView();
        
    } catch (error) {
        console.error('Error deleting bundle:', error);
        showToast('Failed to delete bundle', 'error');
    }
}

// Sample data helper removed

// Import bundles from Excel
function importBundlesFromExcel() {
    document.getElementById('bundles-list').classList.add('hidden');
    document.getElementById('bundle-import-section').classList.remove('hidden');
}

// Hide bundle import
function hideBundleImport() {
    document.getElementById('bundle-import-section').classList.add('hidden');
    document.getElementById('bundles-list').classList.remove('hidden');
}

// Process bundle Excel file
async function processBundleExcelFile(file) {
    if (!file) return;
    
    try {
        showLoading();
        
        // Read Excel file
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                console.log('Excel workbook loaded:', workbook.SheetNames);
                
                // Process each sheet
                let importedCount = 0;
                let errorCount = 0;
                
                for (const sheetName of workbook.SheetNames) {
                    try {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        
                        console.log(`Processing sheet: ${sheetName}`, jsonData);
                        
                        // Expected columns (case-insensitive):
                        //   Bundle Code, Bundle Name, Service Code, Service Name, Quantity, Optional, Include/Included by Default, Notes
                        const bundleGroups = {};
                        const parseYesNo = (val, def=false) => {
                            if (typeof val === 'boolean') return val;
                            if (val === undefined || val === null || String(val).trim() === '') return def;
                            const s = String(val).trim().toLowerCase();
                            return s === 'y' || s === 'yes' || s === 'true' || s === '1';
                        };
                        
                        // Group by bundle
                        for (const row of jsonData) {
                            const bundleCode = row['Bundle Code'] || row['BundleCode'] || row['bundle_code'];
                            const bundleName = row['Bundle Name'] || row['BundleName'] || row['bundle_name'];
                            
                            if (!bundleCode || !bundleName) continue;
                            
                            if (!bundleGroups[bundleCode]) {
                                bundleGroups[bundleCode] = {
                                    bundleCode: bundleCode,
                                    name: bundleName,
                                    description: row['Description'] || row['description'] || '',
                                    items: []
                                };
                            }
                            
                            // Add service item
                            const serviceCode = row['Service Code'] || row['ServiceCode'] || row['service_code'];
                            const serviceName = row['Service Name'] || row['ServiceName'] || row['service_name'];
                            const quantity = parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || 1);
                            // Optional and Included by Default parsing
                            const optRaw = row['Optional'] ?? row['Is Optional'] ?? row['Is Optional (Y/N)'] ?? row['optional'];
                            const incRaw = row['Included by Default'] ?? row['Included'] ?? row['Include'] ?? row['include'];
                            let isOptional = parseYesNo(optRaw, false);
                            let includedByDefault = parseYesNo(incRaw, true);
                            // Fallback: if Optional is missing but Include is explicitly No, treat as optional not included
                            if ((optRaw === undefined || optRaw === null || String(optRaw).trim() === '') && includedByDefault === false) {
                                isOptional = true;
                            }
                            // For required items, always included by default
                            if (!isOptional) includedByDefault = true;
                            const notes = row['Notes'] || row['notes'] || '';
                            
                            if (serviceCode || serviceName) {
                                bundleGroups[bundleCode].items.push({
                                    serviceCode: serviceCode,
                                    serviceName: serviceName,
                                    quantity: quantity,
                                    isOptional: isOptional,
                                    defaultSelected: includedByDefault,
                                    include: isOptional ? includedByDefault : true,
                                    notes: notes
                                });
                            }
                        }
                        
                        // Import bundles
                        for (const [bundleCode, bundleData] of Object.entries(bundleGroups)) {
                            try {
                                await importSingleBundle(bundleData);
                                importedCount++;
                            } catch (error) {
                                console.error(`Failed to import bundle ${bundleCode}:`, error);
                                errorCount++;
                            }
                        }
                        
                    } catch (sheetError) {
                        console.error(`Error processing sheet ${sheetName}:`, sheetError);
                        errorCount++;
                    }
                }
                
                if (importedCount > 0) {
                    showToast(`Successfully imported ${importedCount} bundles${errorCount > 0 ? ` (${errorCount} errors)` : ''}`, 'success');
                    await loadBundlesView();
                    hideBundleImport();
                } else {
                    showToast('No valid bundles found in Excel file', 'warning');
                }
                
            } catch (error) {
                console.error('Error reading Excel file:', error);
                showToast('Failed to read Excel file format', 'error');
            } finally {
                hideLoading();
            }
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error('Error processing Excel file:', error);
        showToast('Failed to process Excel file', 'error');
        hideLoading();
    }
}

// Import single bundle from Excel data (idempotent by bundleCode)
async function importSingleBundle(bundleData) {
    try {
        // Get available services for mapping
        const servicesResponse = await fetch('tables/services');
        const servicesApiData = await servicesResponse.json();
        const availableServices = servicesApiData.data || [];
        
        // Find existing bundle by bundleCode (case-insensitive)
        let existingBundle = null;
        try {
            const bRes = await fetch('tables/bundles');
            const bData = await bRes.json();
            const list = bData.data || [];
            existingBundle = list.find(b => (b.bundleCode || '').toLowerCase() === (bundleData.bundleCode || '').toLowerCase());
        } catch {}
        
        let savedBundle = existingBundle;
        if (existingBundle) {
            // Update existing bundle metadata
            const updatePayload = {
                name: bundleData.name,
                description: bundleData.description
            };
            const putRes = await fetch(`tables/bundles/${existingBundle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            if (!putRes.ok) throw new Error('Failed to update existing bundle');
            savedBundle = await putRes.json();
            // Remove existing items to make import idempotent
            try {
                const itemsResponse = await fetch(`tables/bundle_items?search=${savedBundle.id}`);
                const itemsData = await itemsResponse.json();
                const items = (itemsData.data || []).filter(it => it.bundleId === savedBundle.id);
                for (const it of items) {
                    await fetch(`tables/bundle_items/${it.id}`, { method: 'DELETE' });
                }
            } catch {}
        } else {
            // Create bundle
            const bundlePayload = {
                bundleCode: bundleData.bundleCode,
                name: bundleData.name,
                parentServiceId: null,
                description: bundleData.description
            };
            const bundleResponse = await fetch('tables/bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundlePayload)
            });
            if (!bundleResponse.ok) {
                throw new Error(`Failed to create bundle: ${bundleResponse.statusText}`);
            }
            savedBundle = await bundleResponse.json();
        }
        
        // Create bundle items
        for (const item of bundleData.items) {
            try {
                // Find matching service by code or name
                let matchingService = null;
                
                if (item.serviceCode) {
                    matchingService = availableServices.find(s => 
                        s.serviceCode && s.serviceCode.toLowerCase() === item.serviceCode.toLowerCase()
                    );
                }
                
                if (!matchingService && item.serviceName) {
                    matchingService = availableServices.find(s => 
                        s.name && s.name.toLowerCase().includes(item.serviceName.toLowerCase())
                    );
                }
                
                if (matchingService) {
                    const itemPayload = {
                        bundleId: savedBundle.id,
                        childServiceId: matchingService.id,
                        childQty: item.quantity || 1,
                        // Bundle-level optionality
                        isOptional: !!item.isOptional,
                        defaultSelected: item.isOptional ? !!item.defaultSelected : true,
                        // Legacy field kept for readers that still expect it
                        include: item.isOptional ? !!item.defaultSelected : true,
                        notes: item.notes || ''
                    };
                    await fetch('tables/bundle_items', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(itemPayload)
                    });
                } else {
                    console.warn(`Service not found: ${item.serviceCode || item.serviceName}`);
                }
                
            } catch (itemError) {
                console.error('Error creating bundle item:', itemError);
            }
        }
        
        return savedBundle;
        
    } catch (error) {
        console.error('Error importing bundle:', error);
        throw error;
    }
}

// Export bundles report
async function exportBundlesReport() {
    try {
        showLoading();
        
        const response = await fetch('tables/bundles');
        const data = await response.json();
        const bundles = data.data || [];
        
        if (bundles.length === 0) {
            showToast('No bundles to export', 'warning');
            return;
        }
        
        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        
        // Prepare data for export
        const exportData = [];
        
        for (const bundle of bundles) {
            const itemsResponse = await fetch(`tables/bundle_items?search=${bundle.id}`);
            const itemsData = await itemsResponse.json();
            // Strictly limit to this bundle's items (search returns fuzzy matches)
            const items = (itemsData.data || []).filter(it => it.bundleId === bundle.id);

            // Ensure services are available
            let availableServices = window.services || services || [];
            if (!availableServices || availableServices.length === 0) {
                try {
                    const svcRes = await fetch('tables/services');
                    if (svcRes.ok) {
                        const svcData = await svcRes.json();
                        availableServices = svcData.data || [];
                        window.services = availableServices;
                    }
                } catch {}
            }

            items.forEach(item => {
                const service = availableServices.find(s => s.id === item.childServiceId);
                const isOptional = typeof item.isOptional === 'boolean' ? item.isOptional : false;
                const includedByDefault = isOptional
                    ? (typeof item.defaultSelected === 'boolean' ? item.defaultSelected : (item.include !== false))
                    : true; // required items always included
                exportData.push({
                    'Bundle Code': bundle.bundleCode,
                    'Bundle Name': bundle.name,
                    'Service Code': service ? service.serviceCode : 'N/A',
                    'Service Name': service ? service.name : 'Unknown',
                    'Quantity': item.childQty || 1,
                    'Base Rate': service ? service.baseRate || 0 : 0,
                    'Total Cost': (service ? service.baseRate || 0 : 0) * (item.childQty || 1),
                    'Optional': isOptional ? 'Yes' : 'No',
                    'Include': includedByDefault ? 'Yes' : 'No',
                    'Notes': item.notes || ''
                });
            });
        }
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Bundles');
        
        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Bundles_Export_${dateStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Bundles exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export bundles:', error);
        showToast('Failed to export bundles', 'error');
    } finally {
        hideLoading();
    }
}

// Debug function to analyze Excel file structure
window.analyzeBundleExcel = function(file) {
    if (!file) {
        console.log('Please provide a file. Usage: analyzeBundleExcel(fileInput.files[0])');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('Excel Workbook Analysis:');
            console.log('Sheet Names:', workbook.SheetNames);
            
            workbook.SheetNames.forEach(sheetName => {
                console.log(`\n--- Sheet: ${sheetName} ---`);
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log('Data:', jsonData);
                console.log('Sample row:', jsonData[0]);
            });
        } catch (error) {
            console.error('Error reading Excel file:', error);
        }
    };
    reader.readAsArrayBuffer(file);
};
