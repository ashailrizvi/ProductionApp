// Excel Import/Export Functionality

// Ensure formatDate function is available
function ensureFormatDate() {
    if (typeof formatDate !== 'function') {
        // Fallback formatDate function if not available globally
        window.formatDate = function(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };
    }
}

// Export invoice to Excel
async function exportInvoiceExcel(invoiceId) {
    try {
        // Ensure required functions are available
        ensureFormatDate();
        
        showLoading();
        
        // Get invoice data
        const invoiceResponse = await fetch(`tables/invoices/${invoiceId}`);
        const invoice = await invoiceResponse.json();
        
        if (!invoice) {
            showToast('Invoice not found', 'error');
            return;
        }
        
        // CRITICAL FIX: Load template data for invoice
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
            } catch (templateError) {
                console.warn('Template loading error:', templateError);
            }
        }
        
        // Get invoice lines
        const linesResponse = await fetch(`tables/invoice_lines?search=${invoiceId}`);
        const linesData = await linesResponse.json();
        const lines = linesData.data || [];
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Invoice Header Tab (now includes company template information)
        const headerData = [
            // Company Information Section (from template)
            ['=== COMPANY INFORMATION ===', ''],
            ['Company Name', template?.companyName || 'Not specified'],
            ['Company Email', template?.companyEmail || 'Not specified'],
            ['Company Phone', template?.companyPhone || 'Not specified'],
            ['Company Address', template?.companyAddress || 'Not specified'],
            ['', ''],
            
            // Invoice Information Section
            ['=== INVOICE DETAILS ===', ''],
            ['Invoice Number', invoice.number],
            ['Issue Date', formatDate(invoice.issueDate)],
            ['Due Date', formatDate(invoice.dueDate)],
            ['Template Used', template ? `${template.name} - ${template.companyName}` : 'No template'],
            ['', ''],
            
            // Client Information Section
            ['=== CLIENT INFORMATION ===', ''],
            ['Client Name', invoice.clientName],
            ['Contact Person', invoice.contactPerson || ''],
            ['Client Address', invoice.clientAddress || ''],
            ['Project PO', invoice.projectPo || ''],
            ['', ''],
            
            // Financial Information Section
            ['=== FINANCIAL DETAILS ===', ''],
            ['Currency', invoice.currency],
            ['FX to Base', invoice.fxToBase || ''],
            ['Tax Rate %', (invoice.taxRate * 100).toFixed(2)],
            ['Discount Type', invoice.discountType],
            ['Discount Value', invoice.discountValue],
            ['Header Buffer %', (invoice.headerBuffer * 100).toFixed(2)],
            ['', ''],
            
            // Terms & Notes Section (from template)
            ['=== TERMS & NOTES ===', ''],
            ['Invoice Terms', template?.invoiceTerms || 'Not specified'],
            ['Invoice Notes', template?.invoiceNotes || 'Not specified'],
            ['Custom Notes', invoice.notes || 'None']
        ];
        
        const headerWs = XLSX.utils.aoa_to_sheet(headerData);
        XLSX.utils.book_append_sheet(wb, headerWs, 'Invoice Header');
        
        // Invoice Lines Tab
        const linesExcelData = lines.map(line => ({
            'Line ID': line.lineId || '',
            'Service Code': line.serviceCode || '',
            'Service Name': line.serviceName || '',
            'Category': line.category || '',
            'Content Type': line.contentType || '',
            'Team Roles': line.teamRoles || '',
            'Description': line.description || '',
            'Rate': line.rate || 0,
            'Bundle Cost': line.bundleCost || 0,
            'Line Buffer %': line.lineBuffer || 0,
            'Adjusted Rate': line.adjustedRate || 0,
            'Qty': line.quantity || 0,
            'Unit': line.unit || '',
            'Optional': line.isOptional ? 'Y' : 'N',
            'Line Total': line.lineTotal || 0
        }));
        
        const linesWs = XLSX.utils.json_to_sheet(linesExcelData);
        XLSX.utils.book_append_sheet(wb, linesWs, 'Invoice Lines');
        
        // Company Template Tab (if template exists)
        if (template) {
            const templateData = [
                ['Template Information', ''],
                ['Template ID', template.id],
                ['Template Name', template.name],
                ['', ''],
                ['Company Details', ''],
                ['Company Name', template.companyName],
                ['Company Email', template.companyEmail || 'Not specified'],
                ['Company Phone', template.companyPhone || 'Not specified'], 
                ['Company Address', template.companyAddress || 'Not specified'],
                ['Company Logo', template.companyLogo ? 'Yes' : 'No'],
                ['', ''],
                ['Financial Settings', ''],
                ['Base Currency', template.baseCurrency || 'Not specified'],
                ['Default Currency', template.defaultCurrency || 'Not specified'],
                ['Default Tax Rate', template.defaultTaxRate ? (template.defaultTaxRate * 100).toFixed(2) + '%' : 'Not specified'],
                ['Default Header Buffer', template.defaultHeaderBuffer ? (template.defaultHeaderBuffer * 100).toFixed(2) + '%' : 'Not specified'],
                ['', ''],
                ['Document Terms', ''],
                ['Quotation Terms', template.quotationTerms || 'Not specified'],
                ['Invoice Terms', template.invoiceTerms || 'Not specified'],
                ['', ''],
                ['Document Notes', ''],
                ['Quotation Notes', template.quotationNotes || 'Not specified'],
                ['Invoice Notes', template.invoiceNotes || 'Not specified']
            ];
            
            const templateWs = XLSX.utils.aoa_to_sheet(templateData);
            XLSX.utils.book_append_sheet(wb, templateWs, 'Company Template');
        }
        
        // Generate filename
        const filename = `Invoice_${invoice.number}_${formatDate(invoice.issueDate).replace(/\s/g, '_')}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Invoice exported to Excel successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export invoice to Excel:', error);
        showToast('Failed to export invoice to Excel', 'error');
    } finally {
        hideLoading();
    }
}

// Export all invoices summary to Excel
async function exportAllInvoicesExcel() {
    try {
        // Ensure required functions are available
        ensureFormatDate();
        
        showLoading();
        
        const response = await fetch('tables/invoices');
        const data = await response.json();
        const invoices = data.data || [];
        
        if (invoices.length === 0) {
            showToast('No invoices to export', 'warning');
            return;
        }
        
        // Prepare summary data
        const summaryData = [];
        
        for (const invoice of invoices) {
            // Load template for each invoice
            let templateName = 'No template';
            if (invoice.templateId) {
                try {
                    const templateResponse = await fetch(`tables/company_templates/${invoice.templateId}`);
                    if (templateResponse.ok) {
                        const template = await templateResponse.json();
                        templateName = `${template.name} - ${template.companyName}`;
                    }
                } catch (error) {
                    console.warn('Could not load template for invoice:', invoice.number);
                }
            }
            
            // Get invoice lines to calculate totals
            const linesResponse = await fetch(`tables/invoice_lines?search=${invoice.id}`);
            const linesData = await linesResponse.json();
            const lines = linesData.data || [];
            
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const taxAmount = subtotal * (invoice.taxRate || 0);
            
            let discountAmount = 0;
            if (invoice.discountType === 'Percent') {
                discountAmount = subtotal * (invoice.discountValue || 0) / 100;
            } else if (invoice.discountType === 'Amount') {
                discountAmount = invoice.discountValue || 0;
            }
            
            const grandTotal = subtotal + taxAmount - discountAmount;
            
            summaryData.push({
                'Invoice Number': invoice.number,
                'Issue Date': formatDate(invoice.issueDate),
                'Due Date': formatDate(invoice.dueDate),
                'Client Name': invoice.clientName,
                'Project PO': invoice.projectPo || '',
                'Company Template': templateName,
                'Currency': invoice.currency,
                'FX to Base': invoice.fxToBase || '',
                'Subtotal': subtotal.toFixed(2),
                'Tax Amount': taxAmount.toFixed(2),
                'Discount Amount': discountAmount.toFixed(2),
                'Grand Total': grandTotal.toFixed(2),
                'Status': invoice.status || 'Pending'
            });
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(summaryData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices Summary');
        
        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Invoices_Summary_${dateStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Invoices summary exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export invoices summary:', error);
        showToast('Failed to export invoices summary', 'error');
    } finally {
        hideLoading();
    }
}

// Import services from Excel (enhanced version)
async function importServicesFromExcel(file) {
    try {
        showLoading();
        
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            showToast('No data found in the Excel file', 'error');
            return;
        }
        
        // Expected columns mapping
        const columnMapping = {
            'Service ID': 'serviceCode',
            'Service Name': 'name',
            'Service Category': 'category',
            'Unit': 'unit',
            'Base Rate': 'baseRate',
            'Currency': 'currency',
            'Content Types': 'contentTypes',
            'Team Roles': 'teamRoles',
            'Is Negotiable (Y/N)': 'isNegotiable',
            'Min Qty': 'minQty',
            'Max Qty': 'maxQty',
            'Includes': 'includes',
            'Notes': 'notes'
        };
        
        // Validate headers
        const headers = Object.keys(data[0]);
        const requiredColumns = ['Service ID', 'Service Name'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            showToast(`Missing required columns: ${missingColumns.join(', ')}`, 'error');
            return;
        }
        
        let imported = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails = [];
        
        for (const [index, row] of data.entries()) {
            try {
                // Skip empty rows
                if (!row['Service ID'] || !row['Service Name']) {
                    continue;
                }
                
                // Map Excel columns to service data
                const serviceData = {};
                Object.keys(columnMapping).forEach(excelColumn => {
                    const serviceField = columnMapping[excelColumn];
                    let value = row[excelColumn];
                    
                    // Handle special field conversions
                    switch (serviceField) {
                        case 'baseRate':
                        case 'minQty':
                        case 'maxQty':
                            serviceData[serviceField] = value && value !== '' ? parseFloat(value) : null;
                            break;
                        case 'isNegotiable':
                            serviceData[serviceField] = value ? value.toString().toUpperCase() === 'Y' : false;
                            break;
                        default:
                            serviceData[serviceField] = value ? value.toString().trim() : '';
                    }
                });
                
                // Set default currency if not provided
                if (!serviceData.currency) {
                    serviceData.currency = settings.defaultCurrency || 'PKR';
                }
                
                // Validate service code format
                if (!validators.serviceCode(serviceData.serviceCode)) {
                    errorDetails.push(`Row ${index + 2}: Invalid service code format (${serviceData.serviceCode})`);
                    errors++;
                    continue;
                }
                
                // Check if service exists
                const existingService = services.find(s => s.serviceCode === serviceData.serviceCode);
                
                if (existingService) {
                    // Update existing service
                    const response = await fetch(`tables/services/${existingService.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(serviceData)
                    });
                    
                    if (response.ok) {
                        updated++;
                    } else {
                        errorDetails.push(`Row ${index + 2}: Failed to update service ${serviceData.serviceCode}`);
                        errors++;
                    }
                } else {
                    // Create new service
                    serviceData.id = generateId();
                    const response = await fetch('tables/services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(serviceData)
                    });
                    
                    if (response.ok) {
                        imported++;
                    } else {
                        errorDetails.push(`Row ${index + 2}: Failed to create service ${serviceData.serviceCode}`);
                        errors++;
                    }
                }
                
            } catch (error) {
                errorDetails.push(`Row ${index + 2}: ${error.message}`);
                errors++;
            }
        }
        
        // Show import results
        let message = `Import completed: ${imported} new, ${updated} updated`;
        if (errors > 0) {
            message += `, ${errors} errors`;
        }
        
        showToast(message, errors > 0 ? 'warning' : 'success');
        
        // Show error details if any
        if (errorDetails.length > 0) {
            console.error('Import errors:', errorDetails);
            
            // Create error report
            const errorReport = errorDetails.join('\n');
            const blob = new Blob([errorReport], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'import_errors.txt';
            a.click();
            
            URL.revokeObjectURL(url);
        }
        
        // Reload services
        await loadServices();
        if (currentPage === 'services') {
            loadServicesTable();
        }
        
    } catch (error) {
        console.error('Failed to import services:', error);
        showToast('Failed to import services from Excel', 'error');
    } finally {
        hideLoading();
    }
}

// Enhanced Excel file reader with better error handling
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Validate file
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error('File size exceeds 10MB limit'));
            return;
        }
        
        // Check file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            '.xlsx',
            '.xls'
        ];
        
        if (!validateFileType(file, validTypes)) {
            reject(new Error('Invalid file type. Please select an Excel file (.xlsx or .xls)'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                if (workbook.SheetNames.length === 0) {
                    reject(new Error('No worksheets found in the Excel file'));
                    return;
                }
                
                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    defval: ''
                });
                
                if (jsonData.length < 2) {
                    reject(new Error('Excel file must contain at least a header row and one data row'));
                    return;
                }
                
                // Convert array of arrays to array of objects
                const headers = jsonData[0];
                const dataRows = jsonData.slice(1);
                
                const objects = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
                
                resolve(objects);
                
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Export template files
function exportServiceTemplate() {
    const templateData = [{
        'Service ID': 'SRV-EXAMPLE',
        'Service Name': 'Example Service',
        'Service Category': 'Production',
        'Unit': 'per day',
        'Base Rate': 100000,
        'Currency': 'PKR',
        'Content Types': 'Commercial, Corporate',
        'Team Roles': 'Director, Camera',
        'Is Optional (Y/N)': 'N',
        'Is Negotiable (Y/N)': 'Y',
        'Min Qty': 1,
        'Max Qty': 10,
        'Includes': 'What this service includes',
        'Notes': 'Additional notes'
    }];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Services Template');
    XLSX.writeFile(wb, 'Services_Import_Template.xlsx');
    
    showToast('Service import template downloaded', 'success');
}

// Bulk data validation for Excel imports
function validateImportData(data, type = 'services') {
    const errors = [];
    const warnings = [];
    
    switch (type) {
        case 'services':
            data.forEach((row, index) => {
                const rowNum = index + 2; // Excel row number (header is row 1)
                
                // Required fields
                if (!row['Service ID']) {
                    errors.push(`Row ${rowNum}: Service ID is required`);
                }
                if (!row['Service Name']) {
                    errors.push(`Row ${rowNum}: Service Name is required`);
                }
                
                // Service code format
                if (row['Service ID'] && !validators.serviceCode(row['Service ID'])) {
                    errors.push(`Row ${rowNum}: Invalid service code format (should be SRV-* or RTL-*)`);
                }
                
                // Base rate validation
                if (row['Base Rate'] && !validators.positiveNumber(row['Base Rate'])) {
                    errors.push(`Row ${rowNum}: Base Rate must be a positive number`);
                }
                
                // Currency validation
                if (row['Currency'] && !validators.currency(row['Currency'])) {
                    warnings.push(`Row ${rowNum}: Unknown currency ${row['Currency']}`);
                }
                
                // Quantity validation
                if (row['Min Qty'] && !validators.nonNegativeNumber(row['Min Qty'])) {
                    errors.push(`Row ${rowNum}: Min Qty must be a non-negative number`);
                }
                if (row['Max Qty'] && !validators.nonNegativeNumber(row['Max Qty'])) {
                    errors.push(`Row ${rowNum}: Max Qty must be a non-negative number`);
                }
                if (row['Min Qty'] && row['Max Qty'] && parseInt(row['Min Qty']) > parseInt(row['Max Qty'])) {
                    errors.push(`Row ${rowNum}: Min Qty cannot be greater than Max Qty`);
                }
            });
            break;
    }
    
    return { errors, warnings };
}

// Export all application data as backup
async function exportFullBackup() {
    try {
        showLoading();
        
        // Get all data
        const [servicesRes, bundlesRes, invoicesRes, settingsRes, ratesRes] = await Promise.all([
            fetch('tables/services'),
            fetch('tables/bundles'),
            fetch('tables/invoices'),
            fetch('tables/settings'),
            fetch('tables/currency_rates')
        ]);
        
        const [servicesData, bundlesData, invoicesData, settingsData, ratesData] = await Promise.all([
            servicesRes.json(),
            bundlesRes.json(),
            invoicesRes.json(),
            settingsRes.json(),
            ratesRes.json()
        ]);
        
        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();
        
        // Services sheet
        if (servicesData.data?.length > 0) {
            const servicesWs = XLSX.utils.json_to_sheet(servicesData.data);
            XLSX.utils.book_append_sheet(wb, servicesWs, 'Services');
        }
        
        // Settings sheet
        if (settingsData.data?.length > 0) {
            const settingsWs = XLSX.utils.json_to_sheet(settingsData.data);
            XLSX.utils.book_append_sheet(wb, settingsWs, 'Settings');
        }
        
        // Currency rates sheet
        if (ratesData.data?.length > 0) {
            const ratesWs = XLSX.utils.json_to_sheet(ratesData.data);
            XLSX.utils.book_append_sheet(wb, ratesWs, 'Currency Rates');
        }
        
        // Bundles sheet
        if (bundlesData.data?.length > 0) {
            const bundlesWs = XLSX.utils.json_to_sheet(bundlesData.data);
            XLSX.utils.book_append_sheet(wb, bundlesWs, 'Bundles');
        }
        
        // Invoices summary sheet
        if (invoicesData.data?.length > 0) {
            const invoicesWs = XLSX.utils.json_to_sheet(invoicesData.data);
            XLSX.utils.book_append_sheet(wb, invoicesWs, 'Invoices');
        }
        
        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `Production_QI_Backup_${dateStr}_${timeStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Full backup exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export backup:', error);
        showToast('Failed to export backup', 'error');
    } finally {
        hideLoading();
    }
}

// Export all quotations summary to Excel
async function generateQuotationsReport() {
    try {
        showLoading();
        
        const response = await fetch('tables/quotations');
        const data = await response.json();
        const quotations = data.data || [];
        
        if (quotations.length === 0) {
            showToast('No quotations to export', 'warning');
            return;
        }
        
        // Prepare summary data
        const summaryData = [];
        
        for (const quotation of quotations) {
            // Get lines for this specific quotation
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
            
            summaryData.push({
                'Quotation Number': quotation.number,
                'Issue Date': formatDate(quotation.issueDate),
                'Valid Until': formatDate(quotation.validUntil),
                'Client Name': quotation.clientName,
                'Contact Person': quotation.contactPerson || '',
                'Project Title': quotation.projectTitle || '',
                'Status': quotation.status,
                'Version': quotation.version || 1,
                'Currency': quotation.currency,
                'Subtotal': subtotal.toFixed(2),
                'Tax Amount': taxAmount.toFixed(2),
                'Discount Amount': discountAmount.toFixed(2),
                'Grand Total': grandTotal.toFixed(2),
                'Invoice Generated': quotation.invoiceGenerated ? 'Yes' : 'No',
                'Notes': quotation.notes || ''
            });
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Quotations Summary');
        
        // Status breakdown sheet
        const statusBreakdown = {};
        quotations.forEach(quotation => {
            statusBreakdown[quotation.status] = (statusBreakdown[quotation.status] || 0) + 1;
        });
        
        const statusData = Object.keys(statusBreakdown).map(status => ({
            'Status': status,
            'Count': statusBreakdown[status],
            'Percentage': ((statusBreakdown[status] / quotations.length) * 100).toFixed(1) + '%'
        }));
        
        const statusWs = XLSX.utils.json_to_sheet(statusData);
        XLSX.utils.book_append_sheet(wb, statusWs, 'Status Breakdown');
        
        // Client breakdown sheet
        const clientBreakdown = {};
        quotations.forEach(quotation => {
            clientBreakdown[quotation.clientName] = (clientBreakdown[quotation.clientName] || 0) + 1;
        });
        
        const clientData = Object.keys(clientBreakdown)
            .sort((a, b) => clientBreakdown[b] - clientBreakdown[a]) // Sort by count descending
            .map(client => ({
                'Client Name': client,
                'Quotation Count': clientBreakdown[client]
            }));
        
        const clientWs = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(wb, clientWs, 'Client Breakdown');
        
        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Quotations_Report_${dateStr}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Quotations report exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export quotations report:', error);
        showToast('Failed to export quotations report', 'error');
    } finally {
        hideLoading();
    }
}
