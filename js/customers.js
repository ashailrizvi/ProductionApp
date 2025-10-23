// Customer Management
let editingCustomerId = null;

// Load customers data (use global customers array from app.js)
async function loadCustomersData() {
    try {
        const response = await fetch('tables/customers');
        const data = await response.json();
        window.customers = data.data || [];
    
    } catch (error) {
        console.warn('Failed to load customers:', error.message);
        window.customers = [];
    }
}

// Load customers table
async function loadCustomersTable() {
    try {
        await loadCustomersData();
        
        const tbody = document.getElementById('customers-table');
        tbody.innerHTML = '';
        
        if (window.customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-users text-4xl mb-4"></i>
                        <div>No customers found</div>
                        <div class="text-sm">Add your first customer to get started</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        window.customers.forEach(customer => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700';
            
            const statusBadge = customer.isActive 
                ? '<span class="px-2 py-1 bg-green-600 text-white text-xs rounded">Active</span>'
                : '<span class="px-2 py-1 bg-red-600 text-white text-xs rounded">Inactive</span>';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${customer.clientName}</div>
                    <div class="text-sm text-gray-400">${customer.taxId || 'No Tax ID'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${customer.contactPerson || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${customer.email || '-'}</div>
                    <div class="text-sm text-gray-400">${customer.phone || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${customer.city || '-'}</div>
                    <div class="text-sm text-gray-400">${customer.country || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editCustomer('${customer.id}')" 
                            class="text-blue-400 hover:text-blue-300 mr-3" title="Edit Customer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="viewCustomerDetails('${customer.id}')" 
                            class="text-green-400 hover:text-green-300 mr-3" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deleteCustomer('${customer.id}')" 
                            class="text-red-400 hover:text-red-300" title="Delete Customer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load customers table:', error);
        showToast('Failed to load customers', 'error');
    }
}

// Show customer form
function showCustomerForm() {
    document.getElementById('customer-form').classList.remove('hidden');
    document.getElementById('customer-form-title').textContent = 'Add New Customer';
    clearCustomerForm();
    editingCustomerId = null;
}

// Hide customer form
function hideCustomerForm() {
    document.getElementById('customer-form').classList.add('hidden');
    clearCustomerForm();
    editingCustomerId = null;
}

// Clear customer form
function clearCustomerForm() {
    document.getElementById('customer-form-element').reset();
    document.getElementById('customer-active').checked = true;
}

// Edit customer
async function editCustomer(customerId) {
    try {
        const response = await fetch(`tables/customers/${customerId}`);
        const customer = await response.json();
        
        if (customer) {
            editingCustomerId = customerId;
            document.getElementById('customer-form-title').textContent = 'Edit Customer';
            document.getElementById('customer-form').classList.remove('hidden');
            
            // Populate form
            document.getElementById('customer-client-name').value = customer.clientName || '';
            document.getElementById('customer-contact-person').value = customer.contactPerson || '';
            document.getElementById('customer-email').value = customer.email || '';
            document.getElementById('customer-phone').value = customer.phone || '';
            document.getElementById('customer-address').value = customer.address || '';
            document.getElementById('customer-city').value = customer.city || '';
            document.getElementById('customer-country').value = customer.country || '';
            document.getElementById('customer-tax-id').value = customer.taxId || '';
            document.getElementById('customer-notes').value = customer.notes || '';
            document.getElementById('customer-active').checked = customer.isActive !== false;
        }
    } catch (error) {
        console.error('Failed to load customer for editing:', error);
        showToast('Failed to load customer', 'error');
    }
}

// View customer details
async function viewCustomerDetails(customerId) {
    try {
        const response = await fetch(`tables/customers/${customerId}`);
        const customer = await response.json();
        
        if (customer) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-semibold text-white">Customer Details</h3>
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="text-gray-400 hover:text-white">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Client Name</h4>
                                <p class="text-white">${customer.clientName}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Contact Person</h4>
                                <p class="text-white">${customer.contactPerson || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Email</h4>
                                <p class="text-white">${customer.email || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Phone</h4>
                                <p class="text-white">${customer.phone || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">City</h4>
                                <p class="text-white">${customer.city || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Country</h4>
                                <p class="text-white">${customer.country || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Tax ID</h4>
                                <p class="text-white">${customer.taxId || '-'}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Status</h4>
                                <p class="text-white">${customer.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                        </div>
                        
                        <div class="mt-6">
                            <h4 class="text-sm font-medium text-gray-400 mb-1">Address</h4>
                            <p class="text-white">${customer.address || '-'}</p>
                        </div>
                        
                        ${customer.notes ? `
                            <div class="mt-6">
                                <h4 class="text-sm font-medium text-gray-400 mb-1">Notes</h4>
                                <p class="text-white">${customer.notes}</p>
                            </div>
                        ` : ''}
                        
                        <div class="mt-8 flex justify-end space-x-3">
                            <button onclick="editCustomer('${customer.id}'); this.closest('.fixed').remove();" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                                <i class="fas fa-edit mr-2"></i>Edit Customer
                            </button>
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
    } catch (error) {
        console.error('Failed to load customer details:', error);
        showToast('Failed to load customer details', 'error');
    }
}

// Delete customer
async function deleteCustomer(customerId) {
    const customer = window.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!confirm(`Are you sure you want to delete customer "${customer.clientName}"?`)) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`tables/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Customer deleted successfully', 'success');
            await loadCustomersData();
            loadCustomersTable();
        } else {
            showToast('Failed to delete customer', 'error');
        }
    } catch (error) {
        console.error('Failed to delete customer:', error);
        showToast('Failed to delete customer', 'error');
    } finally {
        hideLoading();
    }
}

// Handle customer form submission
document.addEventListener('DOMContentLoaded', function() {
    const customerForm = document.getElementById('customer-form-element');
    if (customerForm) {
        customerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                clientName: document.getElementById('customer-client-name').value.trim(),
                contactPerson: document.getElementById('customer-contact-person').value.trim(),
                email: document.getElementById('customer-email').value.trim(),
                phone: document.getElementById('customer-phone').value.trim(),
                address: document.getElementById('customer-address').value.trim(),
                city: document.getElementById('customer-city').value.trim(),
                country: document.getElementById('customer-country').value.trim(),
                taxId: document.getElementById('customer-tax-id').value.trim(),
                notes: document.getElementById('customer-notes').value.trim(),
                isActive: document.getElementById('customer-active').checked
            };
            
            // Validation
            if (!formData.clientName) {
                showToast('Client name is required', 'error');
                return;
            }
            
            try {
                showLoading();
                let response;
                
                if (editingCustomerId) {
                    // Update existing customer
                    response = await fetch(`tables/customers/${editingCustomerId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // Create new customer
                    formData.id = generateId();
                    response = await fetch('tables/customers', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                }
                
                if (response.ok) {
                    showToast(editingCustomerId ? 'Customer updated successfully' : 'Customer created successfully', 'success');
                    hideCustomerForm();
                    await loadCustomersData();
                    loadCustomersTable();
                } else {
                    const error = await response.text();
                    showToast('Failed to save customer: ' + error, 'error');
                }
            } catch (error) {
                console.error('Failed to save customer:', error);
                showToast('Failed to save customer', 'error');
            } finally {
                hideLoading();
            }
        });
    }
});

// Export customers to Excel
async function exportCustomers() {
    try {
        showLoading();
        
        await loadCustomers();
        
        if (window.customers.length === 0) {
            showToast('No customers to export', 'warning');
            return;
        }
        
        // Prepare data for Excel export
        const excelData = window.customers.map(customer => ({
            'Client Name': customer.clientName,
            'Contact Person': customer.contactPerson || '',
            'Email': customer.email || '',
            'Phone': customer.phone || '',
            'Address': customer.address || '',
            'City': customer.city || '',
            'Country': customer.country || '',
            'Tax ID': customer.taxId || '',
            'Status': customer.isActive ? 'Active' : 'Inactive',
            'Notes': customer.notes || ''
        }));
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        
        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Customers_${dateStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Customers exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export customers:', error);
        showToast('Failed to export customers', 'error');
    } finally {
        hideLoading();
    }
}

// Load customer dropdown for invoices
async function loadCustomerDropdown() {
    try {
        await loadCustomersData();
        
        const dropdown = document.getElementById('client-dropdown');
        if (!dropdown) return;
        
        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="">Select existing customer...</option>';
        
        // Add active customers to dropdown
        const activeCustomers = window.customers.filter(c => c.isActive !== false);
        activeCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.clientName;
            dropdown.appendChild(option);
        });
        
    } catch (error) {
        console.warn('Failed to load customer dropdown:', error);
    }
}

// Select customer from dropdown
function selectCustomer() {
    const dropdown = document.getElementById('client-dropdown');
    const customerId = dropdown.value;
    
    if (!customerId) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Fill invoice form with customer data
    document.getElementById('client-name').value = customer.clientName;
    document.getElementById('client-contact-person').value = customer.contactPerson || '';
    document.getElementById('client-address').value = customer.address || '';
    
    showToast(`Customer "${customer.clientName}" selected`, 'success');
}

// Clear customer selection
function clearCustomerSelection() {
    document.getElementById('client-dropdown').value = '';
    document.getElementById('client-name').value = '';
    document.getElementById('client-contact-person').value = '';
    document.getElementById('client-address').value = '';
    
    showToast('Customer selection cleared', 'info');
}

// Get customer by name (for PDF generation)
function getCustomerByName(clientName) {
    return window.customers.find(c => c.clientName === clientName);
}

// Get customer statistics for dashboard
function getCustomerStats() {
    const total = window.customers.length;
    const active = window.customers.filter(c => c.isActive !== false).length;
    const inactive = total - active;
    
    return { total, active, inactive };
}