// Services Management
let editingServiceId = null;

// Load services table
async function loadServicesTable() {
    try {
        const response = await fetch('tables/services');
        const data = await response.json();
        const services = data.data || [];
        
        const tbody = document.getElementById('services-table');
        tbody.innerHTML = '';
        
        services.forEach(service => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            
            const flags = [];
            if (service.isOptional) flags.push('<span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">Optional</span>');
            if (service.isNegotiable) flags.push('<span class="px-2 py-1 bg-green-600 text-white text-xs rounded">Negotiable</span>');
            if (!service.baseRate) flags.push('<span class="px-2 py-1 bg-yellow-600 text-white text-xs rounded">TBD</span>');
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${service.serviceCode}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${service.name}</div>
                    <div class="text-sm text-gray-400">${service.category || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-400">${service.category || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${formatCurrency(service.baseRate, service.currency)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-400">${service.unit || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">${flags.join(' ')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editService('${service.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteService('${service.id}')" 
                            class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load services:', error);
        showToast('Failed to load services', 'error');
    }
}

// Show service form
function showServiceForm() {
    document.getElementById('service-form').classList.remove('hidden');
    document.getElementById('service-form-title').textContent = 'Add New Service';
    clearServiceForm();
    editingServiceId = null;
    initializeServiceFormListener();
}

// Hide service form
function hideServiceForm() {
    document.getElementById('service-form').classList.add('hidden');
    clearServiceForm();
    editingServiceId = null;
}

// Clear service form
function clearServiceForm() {
    document.getElementById('service-form-element').reset();
    document.getElementById('service-currency').value = settings.defaultCurrency || 'PKR';
}

// Edit service
async function editService(serviceId) {
    try {
        const response = await fetch(`tables/services/${serviceId}`);
        const service = await response.json();
        
        if (service) {
            editingServiceId = serviceId;
            document.getElementById('service-form-title').textContent = 'Edit Service';
            document.getElementById('service-form').classList.remove('hidden');
            
            // CRITICAL FIX: Initialize form listener for editing
            initializeServiceFormListener();
            
            // Populate form
            document.getElementById('service-code').value = service.serviceCode || '';
            document.getElementById('service-name').value = service.name || '';
            document.getElementById('service-category').value = service.category || '';
            document.getElementById('service-unit').value = service.unit || '';
            document.getElementById('service-rate').value = service.baseRate || '';
            document.getElementById('service-currency').value = service.currency || 'PKR';
            document.getElementById('service-min-qty').value = service.minQty || '';
            document.getElementById('service-max-qty').value = service.maxQty || '';
            document.getElementById('service-optional').checked = service.isOptional || false;
            document.getElementById('service-negotiable').checked = service.isNegotiable || false;
            document.getElementById('service-content-types').value = service.contentTypes || '';
            document.getElementById('service-team-roles').value = service.teamRoles || '';
            document.getElementById('service-includes').value = service.includes || '';
            document.getElementById('service-notes').value = service.notes || '';
        }
    } catch (error) {
        console.error('Failed to load service for editing:', error);
        showToast('Failed to load service', 'error');
    }
}

// Delete service
async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`tables/services/${serviceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Service deleted successfully', 'success');
            await loadServices();
            loadServicesTable();
        } else {
            showToast('Failed to delete service', 'error');
        }
    } catch (error) {
        console.error('Failed to delete service:', error);
        showToast('Failed to delete service', 'error');
    } finally {
        hideLoading();
    }
}

// Handle service form submission
function initializeServiceFormListener() {
    const serviceForm = document.getElementById('service-form-element');
    if (serviceForm && !serviceForm.hasAttribute('data-listener-added')) {
        serviceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form fields exist
            const requiredFields = ['service-code', 'service-name', 'service-category'];
            for (const fieldId of requiredFields) {
                const field = document.getElementById(fieldId);
                if (!field) {
                    console.error(`Form field missing: ${fieldId}`);
                    showToast('Form fields not found. Please refresh the page.', 'error');
                    return;
                }
            }
    
            const formData = {
                serviceCode: document.getElementById('service-code').value.trim(),
                name: document.getElementById('service-name').value.trim(),
                category: document.getElementById('service-category').value.trim(),
        unit: document.getElementById('service-unit').value.trim(),
        baseRate: document.getElementById('service-rate').value ? parseFloat(document.getElementById('service-rate').value) : null,
        currency: document.getElementById('service-currency').value,
        minQty: document.getElementById('service-min-qty').value ? parseInt(document.getElementById('service-min-qty').value) : null,
        maxQty: document.getElementById('service-max-qty').value ? parseInt(document.getElementById('service-max-qty').value) : null,
        isOptional: document.getElementById('service-optional').checked,
        isNegotiable: document.getElementById('service-negotiable').checked,
        contentTypes: document.getElementById('service-content-types').value.trim(),
        teamRoles: document.getElementById('service-team-roles').value.trim(),
        includes: document.getElementById('service-includes').value.trim(),
        notes: document.getElementById('service-notes').value.trim()
    };
    
    // Validation
    if (!formData.serviceCode || !formData.name) {
        showToast('Service code and name are required', 'error');
        return;
    }
    
    try {
        showLoading();
        let response;
        
        if (editingServiceId) {
            // Update existing service
            response = await fetch(`tables/services/${editingServiceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new service
            formData.id = generateId();
            response = await fetch('tables/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            showToast(editingServiceId ? 'Service updated successfully' : 'Service created successfully', 'success');
            hideServiceForm();
            await loadServices();
            loadServicesTable();
        } else {
            const error = await response.text();
            console.error('Service save failed:', {
                status: response.status,
                statusText: response.statusText,
                error: error,
                formData: formData,
                editingServiceId: editingServiceId
            });
            showToast(`Failed to save service: ${response.status} ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Failed to save service:', error);
        showToast('Failed to save service', 'error');
    } finally {
        hideLoading();
    }
        });
        serviceForm.setAttribute('data-listener-added', 'true');
    }
}

// Export services to Excel
async function exportServices() {
    try {
        showLoading();
        
        const response = await fetch('tables/services');
        const data = await response.json();
        const services = data.data || [];
        
        // Prepare data for Excel export
        const excelData = services.map(service => ({
            'Service ID': service.serviceCode,
            'Service Name': service.name,
            'Service Category': service.category || '',
            'Unit': service.unit || '',
            'Base Rate': service.baseRate || '',
            'Currency': service.currency || 'PKR',
            'Content Types': service.contentTypes || '',
            'Team Roles': service.teamRoles || '',
            'Is Optional (Y/N)': service.isOptional ? 'Y' : 'N',
            'Is Negotiable (Y/N)': service.isNegotiable ? 'Y' : 'N',
            'Min Qty': service.minQty || '',
            'Max Qty': service.maxQty || '',
            'Includes': service.includes || '',
            'Notes': service.notes || ''
        }));
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Rate Sheet');
        
        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Rate_Sheet_${dateStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Rate sheet exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export services:', error);
        showToast('Failed to export rate sheet', 'error');
    } finally {
        hideLoading();
    }
}

// Import services from Excel
function importServices() {
    const fileInput = document.getElementById('excel-import');
    fileInput.click();
    
    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showLoading();
            
            const data = await readExcelFile(file);
            
            // Expected columns
            const expectedColumns = [
                'Service ID', 'Service Name', 'Service Category', 'Unit', 'Base Rate',
                'Currency', 'Content Types', 'Team Roles', 'Is Optional (Y/N)',
                'Is Negotiable (Y/N)', 'Min Qty', 'Max Qty', 'Includes', 'Notes'
            ];
            
            if (!data || data.length === 0) {
                showToast('No data found in the Excel file', 'error');
                return;
            }
            
            // Validate headers
            const headers = Object.keys(data[0]);
            const missingColumns = expectedColumns.filter(col => !headers.includes(col));
            
            if (missingColumns.length > 0) {
                showToast(`Missing columns: ${missingColumns.join(', ')}`, 'error');
                return;
            }
            
            // Process and import services
            let imported = 0;
            let updated = 0;
            
            for (const row of data) {
                if (!row['Service ID'] || !row['Service Name']) {
                    continue; // Skip rows without required fields
                }
                
                const serviceData = {
                    serviceCode: row['Service ID'].toString().trim(),
                    name: row['Service Name'].toString().trim(),
                    category: row['Service Category'] ? row['Service Category'].toString().trim() : '',
                    unit: row['Unit'] ? row['Unit'].toString().trim() : '',
                    baseRate: row['Base Rate'] && row['Base Rate'] !== '' ? parseFloat(row['Base Rate']) : null,
                    currency: row['Currency'] ? row['Currency'].toString().trim() : 'PKR',
                    contentTypes: row['Content Types'] ? row['Content Types'].toString().trim() : '',
                    teamRoles: row['Team Roles'] ? row['Team Roles'].toString().trim() : '',
                    isOptional: row['Is Optional (Y/N)'] ? row['Is Optional (Y/N)'].toString().toUpperCase() === 'Y' : false,
                    isNegotiable: row['Is Negotiable (Y/N)'] ? row['Is Negotiable (Y/N)'].toString().toUpperCase() === 'Y' : false,
                    minQty: row['Min Qty'] && row['Min Qty'] !== '' ? parseInt(row['Min Qty']) : null,
                    maxQty: row['Max Qty'] && row['Max Qty'] !== '' ? parseInt(row['Max Qty']) : null,
                    includes: row['Includes'] ? row['Includes'].toString().trim() : '',
                    notes: row['Notes'] ? row['Notes'].toString().trim() : ''
                };
                
                try {
                    // Check if service exists
                    const existingService = services.find(s => s.serviceCode === serviceData.serviceCode);
                    
                    if (existingService) {
                        // Update existing service
                        const response = await fetch(`tables/services/${existingService.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(serviceData)
                        });
                        
                        if (response.ok) {
                            updated++;
                        }
                    } else {
                        // Create new service
                        serviceData.id = generateId();
                        const response = await fetch('tables/services', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(serviceData)
                        });
                        
                        if (response.ok) {
                            imported++;
                        }
                    }
                } catch (error) {
                    console.error('Failed to import service:', serviceData.serviceCode, error);
                }
            }
            
            showToast(`Import completed: ${imported} new services, ${updated} updated services`, 'success');
            
            // Reload data
            await loadServices();
            loadServicesTable();
            
        } catch (error) {
            console.error('Failed to import services:', error);
            showToast('Failed to import services from Excel', 'error');
        } finally {
            hideLoading();
            // Clear file input
            fileInput.value = '';
        }
    };
}

// Read Excel file
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}