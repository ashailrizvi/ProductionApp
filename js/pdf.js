// PDF Export Functionality

// Load template data by ID
async function loadTemplateForDocument(templateId) {
    if (!templateId) {
        return null;
    }
    
    try {
        const response = await fetch(`tables/company_templates/${templateId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.warn('Failed to load template:', error);
        return null;
    }
}

// Export invoice to PDF
async function exportInvoicePDF(invoiceId) {
    try {
        showLoading();
        
        // Get invoice data
        const invoiceResponse = await fetch(`tables/invoices/${invoiceId}`);
        const invoice = await invoiceResponse.json();
        
        if (!invoice) {
            showToast('Invoice not found', 'error');
            return;
        }
        
        // Load template data if available
        const template = await loadTemplateForDocument(invoice.templateId);
        
        // Get invoice lines for this specific invoice
        const linesResponse = await fetch(`tables/invoice_lines`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this invoice specifically and maintain order
        const lines = allLines
            .filter(line => line.invoiceId === invoiceId)
            .sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
        
        // Calculate totals (invoice lines already have buffer-adjusted rates)
        const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        const bufferedSubtotal = subtotal; // Already includes buffer from invoice generation
        const taxAmount = bufferedSubtotal * (invoice.taxRate || 0);
        
        let discountAmount = 0;
        if (invoice.discountType === 'Percent') {
            discountAmount = bufferedSubtotal * (invoice.discountValue || 0) / 100;
        } else if (invoice.discountType === 'Amount') {
            discountAmount = invoice.discountValue || 0;
        }
        
        const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set up document
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let currentY = margin;
        
        // Check for letterhead image (use template logo if available, otherwise default)
        const logoPath = (template && template.companyLogo) ? template.companyLogo : '/assets/letterhead.png';
        const letterheadExists = await checkImageExists(logoPath);
        
        if (letterheadExists) {
            try {
                const letterheadImg = await loadImage(logoPath);
                doc.addImage(letterheadImg, 'PNG', margin, currentY, pageWidth - 2 * margin, 40);
                currentY += 50;
            } catch (error) {
                console.warn('Could not load letterhead image');
            }
        } else if (template && template.companyName) {
            // If no logo but we have template, add company name as header
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(template.companyName, margin, currentY);
            currentY += 10;
            
            if (template.companyPhone || template.companyEmail) {
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const contactInfo = [];
                if (template.companyPhone) contactInfo.push(template.companyPhone);
                if (template.companyEmail) contactInfo.push(template.companyEmail);
                doc.text(contactInfo.join(' • '), margin, currentY);
                currentY += 6;
            }
            
            if (template.companyAddress) {
                doc.setFontSize(10);
                const addressLines = doc.splitTextToSize(template.companyAddress, pageWidth - 2 * margin);
                doc.text(addressLines, margin, currentY);
                currentY += addressLines.length * 6;
            }
            
            currentY += 15; // Extra space after header
        }
        
        // Header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
        
        // Invoice details (left column)
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const leftColX = margin;
        const rightColX = pageWidth / 2 + 10;
        
        // Left column - Invoice details
        doc.setFont(undefined, 'bold');
        doc.text('Invoice Details:', leftColX, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 8;
        
        doc.text(`Invoice Number: ${invoice.number}`, leftColX, currentY);
        currentY += 6;
        doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, leftColX, currentY);
        currentY += 6;
        if (invoice.dueDate) {
            doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, leftColX, currentY);
            currentY += 6;
        }
        doc.text(`Currency: ${invoice.currency}`, leftColX, currentY);
        if (invoice.fxToBase) {
            currentY += 6;
            doc.text(`Exchange Rate: ${invoice.fxToBase}`, leftColX, currentY);
        }
        
        // Right column - Client details
        let rightY = currentY - (invoice.dueDate ? 24 : 18);
        doc.setFont(undefined, 'bold');
        doc.text('Bill To:', rightColX, rightY);
        doc.setFont(undefined, 'normal');
        rightY += 8;
        
        doc.text(invoice.clientName, rightColX, rightY);
        
        if (invoice.contactPerson) {
            rightY += 6;
            doc.text(`Attn: ${invoice.contactPerson}`, rightColX, rightY);
        }
        
        if (invoice.clientAddress) {
            rightY += 6;
            const addressLines = doc.splitTextToSize(invoice.clientAddress, pageWidth / 2 - 30);
            doc.text(addressLines, rightColX, rightY);
            rightY += addressLines.length * 6;
        }
        
        if (invoice.projectPo) {
            rightY += 6;
            doc.text(`PO Number: ${invoice.projectPo}`, rightColX, rightY);
        }
        
        currentY = Math.max(currentY, rightY) + 20;
        
        // Line items table
        doc.setFont(undefined, 'bold');
        doc.text('Line Items:', leftColX, currentY);
        currentY += 10;
        
        // Table headers
        const tableHeaders = [
            'Service Code',
            'Description', 
            'Qty',
            'Unit',
            'Rate',
            'Total'
        ];
        
        const colWidths = [30, 65, 15, 20, 25, 25];
        const colX = [margin];
        for (let i = 1; i < colWidths.length; i++) {
            colX[i] = colX[i - 1] + colWidths[i - 1];
        }
        
        // Draw header row
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        tableHeaders.forEach((header, i) => {
            doc.text(header, colX[i] + 2, currentY + 3);
        });
        
        currentY += 8;
        
        // Draw line items
        doc.setFont(undefined, 'normal');
        lines.forEach((line, index) => {
            // Check if we need a new page
            if (currentY > pageHeight - 50) {
                doc.addPage();
                currentY = margin + 10;
            }
            
            const rowY = currentY;
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, rowY - 3, pageWidth - 2 * margin, 8, 'F');
            }
            
            // Line data
            const lineData = [
                line.serviceCode || '',
                line.serviceName || '',
                (line.quantity || 0).toString(),
                line.unit || '',
                formatCurrency(line.adjustedRate || 0, invoice.currency).replace(invoice.currency, '').trim(),
                formatCurrency(line.lineTotal || 0, invoice.currency).replace(invoice.currency, '').trim()
            ];
            
            lineData.forEach((data, i) => {
                const text = doc.splitTextToSize(data, colWidths[i] - 4);
                doc.text(text, colX[i] + 2, rowY + 3);
            });
            
            currentY += 8;
        });
        
        // Draw table borders
        const tableStartY = currentY - (lines.length * 8) - 8;
        const tableEndY = currentY;
        
        // Vertical lines
        doc.setDrawColor(200, 200, 200);
        for (let i = 0; i <= colWidths.length; i++) {
            const x = i === 0 ? margin : colX[i - 1] + colWidths[i - 1];
            doc.line(x, tableStartY, x, tableEndY);
        }
        
        // Horizontal lines
        doc.line(margin, tableStartY, pageWidth - margin, tableStartY);
        doc.line(margin, tableEndY, pageWidth - margin, tableEndY);
        
        currentY += 20;
        
        // Totals section
        const totalsX = pageWidth - 80;
        const totalsWidth = 60;
        
        doc.setFont(undefined, 'normal');
        doc.text('Subtotal:', totalsX, currentY);
        doc.text(formatCurrency(subtotal, invoice.currency), totalsX + totalsWidth, currentY, { align: 'right' });
        currentY += 8;
        
        if (taxAmount > 0) {
            doc.text(`Tax (${((invoice.taxRate || 0) * 100).toFixed(1)}%):`, totalsX, currentY);
            doc.text(formatCurrency(taxAmount, invoice.currency), totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 8;
        }
        
        if (discountAmount > 0) {
            const discountLabel = invoice.discountType === 'Percent' 
                ? `Discount (${invoice.discountValue}%):`
                : 'Discount:';
            doc.text(discountLabel, totalsX, currentY);
            doc.text(`-${formatCurrency(discountAmount, invoice.currency)}`, totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 8;
        }
        
        // Grand total
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.line(totalsX, currentY - 2, totalsX + totalsWidth, currentY - 2);
        doc.text('Grand Total:', totalsX, currentY + 5);
        doc.text(formatCurrency(grandTotal, invoice.currency), totalsX + totalsWidth, currentY + 5, { align: 'right' });
        
        currentY += 20;
        
        // Notes (use template notes if no custom notes)
        const notesToUse = invoice.notes || (template && template.invoiceNotes) || '';
        if (notesToUse) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Notes:', margin, currentY);
            currentY += 8;
            
            doc.setFont(undefined, 'normal');
            const notesLines = doc.splitTextToSize(notesToUse, pageWidth - 2 * margin);
            doc.text(notesLines, margin, currentY);
            currentY += notesLines.length * 6 + 10;
        }
        
        // Terms (use template terms)
        const termsToUse = (template && template.invoiceTerms) || '';
        if (termsToUse) {
            // Check if we need a new page for terms
            const estimatedTermsHeight = termsToUse.split('\n').length * 6;
            if (currentY + estimatedTermsHeight > pageHeight - 40) {
                doc.addPage();
                currentY = margin;
            }
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Terms & Conditions:', margin, currentY);
            currentY += 8;
            
            doc.setFont(undefined, 'normal');
            const termsLines = doc.splitTextToSize(termsToUse, pageWidth - 2 * margin);
            doc.text(termsLines, margin, currentY);
            currentY += termsLines.length * 6 + 10;
        }
        
        // Check for stamp image
        const stampExists = await checkImageExists('/assets/stamp.png');
        if (stampExists) {
            try {
                const stampImg = await loadImage('/assets/stamp.png');
                const stampSize = 40;
                doc.addImage(stampImg, 'PNG', 
                    pageWidth - margin - stampSize, 
                    pageHeight - margin - stampSize, 
                    stampSize, 
                    stampSize
                );
            } catch (error) {
                console.warn('Could not load stamp image');
            }
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on ${formatDate(new Date())}`, margin, pageHeight - 10);
        doc.text(`Page 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        
        // Save PDF
        const filename = `Invoice_${invoice.number}.pdf`;
        doc.save(filename);
        
        showToast('Invoice PDF generated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        showToast('Failed to generate PDF', 'error');
    } finally {
        hideLoading();
    }
}

// Check if image exists
async function checkImageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Load image as base64
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = reject;
        img.src = url;
    });
}

// Generate PDF report for all invoices
async function generateInvoicesReport() {
    try {
        showLoading();
        
        const response = await fetch('tables/invoices');
        const data = await response.json();
        const invoices = data.data || [];
        
        if (invoices.length === 0) {
            showToast('No invoices to report', 'warning');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let currentY = margin;
        
        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Invoices Report', pageWidth / 2, currentY, { align: 'center' });
        currentY += 20;
        
        // Report date
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${formatDate(new Date())}`, margin, currentY);
        currentY += 15;
        
        // Summary statistics
        let totalAmount = 0;
        let overdueCount = 0;
        const today = new Date();
        
        for (const invoice of invoices) {
            // Get lines for this specific invoice
            const linesResponse = await fetch(`tables/invoice_lines`);
            const allLinesData = await linesResponse.json();
            const allLines = allLinesData.data || [];
            
            // Filter lines for this invoice specifically
            const lines = allLines.filter(line => line.invoiceId === invoice.id);
            
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const taxAmount = subtotal * (invoice.taxRate || 0);
            
            let discountAmount = 0;
            if (invoice.discountType === 'Percent') {
                discountAmount = subtotal * (invoice.discountValue || 0) / 100;
            } else if (invoice.discountType === 'Amount') {
                discountAmount = invoice.discountValue || 0;
            }
            
            const grandTotal = subtotal + taxAmount - discountAmount;
            totalAmount += grandTotal;
            
            if (invoice.dueDate && new Date(invoice.dueDate) < today) {
                overdueCount++;
            }
        }
        
        // Summary box
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Summary', margin, currentY);
        currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Invoices: ${invoices.length}`, margin, currentY);
        currentY += 6;
        doc.text(`Overdue Invoices: ${overdueCount}`, margin, currentY);
        currentY += 6;
        doc.text(`Total Amount: ${formatCurrency(totalAmount, 'PKR')}`, margin, currentY);
        currentY += 20;
        
        // Invoices table
        doc.setFont(undefined, 'bold');
        doc.text('Invoice Details:', margin, currentY);
        currentY += 10;
        
        // Table headers
        const headers = ['Invoice #', 'Client', 'Date', 'Due Date', 'Currency', 'Total', 'Status'];
        const colWidths = [25, 40, 20, 20, 15, 25, 15];
        const colX = [margin];
        for (let i = 1; i < colWidths.length; i++) {
            colX[i] = colX[i - 1] + colWidths[i - 1];
        }
        
        // Header row
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, i) => {
            doc.text(header, colX[i] + 2, currentY + 3);
        });
        
        currentY += 8;
        
        // Data rows
        doc.setFont(undefined, 'normal');
        for (const [index, invoice] of invoices.entries()) {
            if (currentY > pageHeight - 30) {
                doc.addPage();
                currentY = margin + 10;
            }
            
            // Get lines for this specific invoice
            const linesResponse = await fetch(`tables/invoice_lines`);
            const allLinesData = await linesResponse.json();
            const allLines = allLinesData.data || [];
            
            // Filter lines for this invoice specifically
            const lines = allLines.filter(line => line.invoiceId === invoice.id);
            
            const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const taxAmount = subtotal * (invoice.taxRate || 0);
            
            let discountAmount = 0;
            if (invoice.discountType === 'Percent') {
                discountAmount = subtotal * (invoice.discountValue || 0) / 100;
            } else if (invoice.discountType === 'Amount') {
                discountAmount = invoice.discountValue || 0;
            }
            
            const grandTotal = subtotal + taxAmount - discountAmount;
            
            const status = invoice.dueDate && new Date(invoice.dueDate) < today ? 'Overdue' : 'Active';
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8, 'F');
            }
            
            const rowData = [
                invoice.number,
                invoice.clientName,
                formatDate(invoice.issueDate),
                formatDate(invoice.dueDate),
                invoice.currency,
                grandTotal.toFixed(2),
                status
            ];
            
            rowData.forEach((data, i) => {
                const text = doc.splitTextToSize(data, colWidths[i] - 4);
                doc.text(text, colX[i] + 2, currentY + 3);
            });
            
            currentY += 8;
        }
        
        // Page footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
        
        // Save PDF
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Invoices_Report_${dateStr}.pdf`;
        doc.save(filename);
        
        showToast('Invoices report generated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to generate invoices report:', error);
        showToast('Failed to generate invoices report', 'error');
    } finally {
        hideLoading();
    }
}

// Generate services catalog PDF
async function generateServicesCatalog() {
    try {
        showLoading();
        
        const response = await fetch('tables/services');
        const data = await response.json();
        const services = data.data || [];
        
        if (services.length === 0) {
            showToast('No services to export', 'warning');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let currentY = margin;
        
        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Services Catalog', pageWidth / 2, currentY, { align: 'center' });
        currentY += 20;
        
        // Group services by category
        const servicesByCategory = arrayUtils.groupBy(services, 'category');
        
        Object.keys(servicesByCategory).forEach(category => {
            // Category header
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = margin;
            }
            
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(category || 'Uncategorized', margin, currentY);
            currentY += 15;
            
            // Services in category
            servicesByCategory[category].forEach(service => {
                if (currentY > pageHeight - 40) {
                    doc.addPage();
                    currentY = margin;
                }
                
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(service.serviceCode, margin, currentY);
                doc.setFont(undefined, 'normal');
                doc.text(service.name, margin + 40, currentY);
                currentY += 8;
                
                doc.setFontSize(10);
                if (service.baseRate) {
                    doc.text(`Rate: ${formatCurrency(service.baseRate, service.currency)}`, margin + 5, currentY);
                } else {
                    doc.text('Rate: TBD', margin + 5, currentY);
                }
                if (service.unit) {
                    doc.text(`Unit: ${service.unit}`, margin + 80, currentY);
                }
                currentY += 6;
                
                if (service.includes) {
                    const includesLines = doc.splitTextToSize(service.includes, pageWidth - 2 * margin - 10);
                    doc.text(`Includes: ${includesLines[0]}`, margin + 5, currentY);
                    for (let i = 1; i < includesLines.length; i++) {
                        currentY += 6;
                        doc.text(includesLines[i], margin + 15, currentY);
                    }
                    currentY += 6;
                }
                
                currentY += 5;
            });
            
            currentY += 10;
        });
        
        // Save PDF
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Services_Catalog_${dateStr}.pdf`;
        doc.save(filename);
        
        showToast('Services catalog generated successfully', 'success');
        
    } catch (error) {
        console.error('Failed to generate services catalog:', error);
        showToast('Failed to generate services catalog', 'error');
    } finally {
        hideLoading();
    }
}

// Generic PDF export for both quotations and invoices
async function exportDocumentPDF(documentId, documentType) {
    try {
        showLoading();
        
        const isQuotation = documentType === 'quotation';
        const tableName = isQuotation ? 'quotations' : 'invoices';
        const lineTableName = isQuotation ? 'quotation_lines' : 'invoice_lines';
        
        // Get document data
        const docResponse = await fetch(`tables/${tableName}/${documentId}`);
        const document = await docResponse.json();
        
        if (!document) {
            showToast(`${isQuotation ? 'Quotation' : 'Invoice'} not found`, 'error');
            return;
        }
        
        // Load template data if available
        const template = await loadTemplateForDocument(document.templateId);
        
        // Get document lines for this specific document
        const linesResponse = await fetch(`tables/${lineTableName}`);
        const allLinesData = await linesResponse.json();
        const allLines = allLinesData.data || [];
        
        // Filter lines for this document specifically
        const lines = allLines.filter(line => {
            return isQuotation ? line.quotationId === documentId : line.invoiceId === documentId;
        });
        
        // Calculate totals (handle quotations vs invoices differently)
        const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        
        let bufferedSubtotal;
        if (isQuotation) {
            // Quotations: Apply header buffer to base rates
            const headerBuffer = subtotal * (document.headerBuffer || 0);
            bufferedSubtotal = subtotal + headerBuffer;
        } else {
            // Invoices: Rates already include buffer from generation
            bufferedSubtotal = subtotal;
        }
        
        const taxAmount = bufferedSubtotal * (document.taxRate || 0);
        
        let discountAmount = 0;
        if (document.discountType === 'Percent') {
            discountAmount = bufferedSubtotal * (document.discountValue || 0) / 100;
        } else if (document.discountType === 'Amount') {
            discountAmount = document.discountValue || 0;
        }
        
        const grandTotal = bufferedSubtotal + taxAmount - discountAmount;
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set up document
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let currentY = margin;
        
        // Check for letterhead image (use template logo if available, otherwise default)
        const logoPath = (template && template.companyLogo) ? template.companyLogo : '/assets/letterhead.png';
        const letterheadExists = await checkImageExists(logoPath);
        
        if (letterheadExists) {
            try {
                const letterheadImg = await loadImage(logoPath);
                doc.addImage(letterheadImg, 'PNG', margin, currentY, pageWidth - 2 * margin, 40);
                currentY += 50;
            } catch (error) {
                console.warn('Could not load letterhead image');
            }
        } else if (template && template.companyName) {
            // If no logo but we have template, add company name as header
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(template.companyName, margin, currentY);
            currentY += 10;
            
            if (template.companyPhone || template.companyEmail) {
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const contactInfo = [];
                if (template.companyPhone) contactInfo.push(template.companyPhone);
                if (template.companyEmail) contactInfo.push(template.companyEmail);
                doc.text(contactInfo.join(' • '), margin, currentY);
                currentY += 6;
            }
            
            if (template.companyAddress) {
                doc.setFontSize(10);
                const addressLines = doc.splitTextToSize(template.companyAddress, pageWidth - 2 * margin);
                doc.text(addressLines, margin, currentY);
                currentY += addressLines.length * 6;
            }
            
            currentY += 15; // Extra space after header
        }
        
        // Header
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(isQuotation ? 'QUOTATION' : 'INVOICE', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
        
        // Document details (left column)
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const leftColX = margin;
        const rightColX = pageWidth / 2 + 10;
        
        // Left column - Document details
        doc.setFont(undefined, 'bold');
        doc.text(`${isQuotation ? 'Quotation' : 'Invoice'} Details:`, leftColX, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 8;
        
        doc.text(`${isQuotation ? 'Quotation' : 'Invoice'} Number: ${document.number}`, leftColX, currentY);
        currentY += 6;
        doc.text(`Issue Date: ${formatDate(isQuotation ? document.issueDate : document.issueDate)}`, leftColX, currentY);
        currentY += 6;
        
        if (isQuotation) {
            if (document.validUntil) {
                doc.text(`Valid Until: ${formatDate(document.validUntil)}`, leftColX, currentY);
                currentY += 6;
            }
            if (document.status) {
                doc.text(`Status: ${document.status}`, leftColX, currentY);
                currentY += 6;
            }
        } else {
            if (document.dueDate) {
                doc.text(`Due Date: ${formatDate(document.dueDate)}`, leftColX, currentY);
                currentY += 6;
            }
        }
        
        doc.text(`Currency: ${document.currency}`, leftColX, currentY);
        if (document.fxToBase) {
            currentY += 6;
            doc.text(`Exchange Rate: ${document.fxToBase}`, leftColX, currentY);
        }
        
        // Right column - Client details
        let rightY = currentY - (isQuotation ? 30 : (document.dueDate ? 24 : 18));
        doc.setFont(undefined, 'bold');
        doc.text(isQuotation ? 'Quote For:' : 'Bill To:', rightColX, rightY);
        doc.setFont(undefined, 'normal');
        rightY += 8;
        
        doc.text(document.clientName, rightColX, rightY);
        
        if (document.contactPerson) {
            rightY += 6;
            doc.text(`Attn: ${document.contactPerson}`, rightColX, rightY);
        }
        
        if (document.clientAddress) {
            rightY += 6;
            const addressLines = doc.splitTextToSize(document.clientAddress, pageWidth / 2 - 30);
            doc.text(addressLines, rightColX, rightY);
            rightY += addressLines.length * 6;
        }
        
        if (isQuotation && document.projectTitle) {
            rightY += 6;
            doc.text(`Project: ${document.projectTitle}`, rightColX, rightY);
        } else if (!isQuotation && document.projectPo) {
            rightY += 6;
            doc.text(`PO Number: ${document.projectPo}`, rightColX, rightY);
        }
        
        currentY = Math.max(currentY, rightY) + 20;
        
        // Line items table
        doc.setFont(undefined, 'bold');
        doc.text('Line Items:', leftColX, currentY);
        currentY += 10;
        
        // Table headers
        const tableHeaders = [
            'Service Code',
            'Description', 
            'Qty',
            'Unit',
            'Rate',
            'Total'
        ];
        
        const colWidths = [30, 65, 15, 20, 25, 25];
        const colX = [margin];
        for (let i = 1; i < colWidths.length; i++) {
            colX[i] = colX[i - 1] + colWidths[i - 1];
        }
        
        // Draw header row
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        tableHeaders.forEach((header, i) => {
            doc.text(header, colX[i] + 2, currentY + 3);
        });
        
        currentY += 8;
        
        // Draw line items
        doc.setFont(undefined, 'normal');
        lines.forEach((line, index) => {
            // Check if we need a new page
            if (currentY > pageHeight - 50) {
                doc.addPage();
                currentY = margin + 10;
            }
            
            const rowY = currentY;
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, rowY - 3, pageWidth - 2 * margin, 8, 'F');
            }
            
            // Line data
            const lineData = [
                line.serviceCode || '',
                line.serviceName || '',
                (line.quantity || 0).toString(),
                line.unit || '',
                formatCurrency(line.adjustedRate || 0, document.currency).replace(document.currency, '').trim(),
                formatCurrency(line.lineTotal || 0, document.currency).replace(document.currency, '').trim()
            ];
            
            lineData.forEach((data, i) => {
                const text = doc.splitTextToSize(data, colWidths[i] - 4);
                doc.text(text, colX[i] + 2, rowY + 3);
            });
            
            currentY += 8;
        });
        
        // Draw table borders
        const tableStartY = currentY - (lines.length * 8) - 8;
        const tableEndY = currentY;
        
        // Vertical lines
        doc.setDrawColor(200, 200, 200);
        for (let i = 0; i <= colWidths.length; i++) {
            const x = i === 0 ? margin : colX[i - 1] + colWidths[i - 1];
            doc.line(x, tableStartY, x, tableEndY);
        }
        
        // Horizontal lines
        doc.line(margin, tableStartY, pageWidth - margin, tableStartY);
        doc.line(margin, tableEndY, pageWidth - margin, tableEndY);
        
        currentY += 20;
        
        // Totals section
        const totalsX = pageWidth - 80;
        const totalsWidth = 60;
        
        doc.setFont(undefined, 'normal');
        doc.text('Subtotal:', totalsX, currentY);
        doc.text(formatCurrency(subtotal, document.currency), totalsX + totalsWidth, currentY, { align: 'right' });
        currentY += 8;
        
        if (taxAmount > 0) {
            doc.text(`Tax (${((document.taxRate || 0) * 100).toFixed(1)}%):`, totalsX, currentY);
            doc.text(formatCurrency(taxAmount, document.currency), totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 8;
        }
        
        if (discountAmount > 0) {
            const discountLabel = document.discountType === 'Percent' 
                ? `Discount (${document.discountValue}%):`
                : 'Discount:';
            doc.text(discountLabel, totalsX, currentY);
            doc.text(`-${formatCurrency(discountAmount, document.currency)}`, totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 8;
        }
        
        // Grand total
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.line(totalsX, currentY - 2, totalsX + totalsWidth, currentY - 2);
        doc.text('Grand Total:', totalsX, currentY + 5);
        doc.text(formatCurrency(grandTotal, document.currency), totalsX + totalsWidth, currentY + 5, { align: 'right' });
        
        currentY += 20;
        
        // Notes and Terms (use template data if available)
        let notesToUse = document.notes || '';
        if (!notesToUse && template) {
            notesToUse = isQuotation ? template.quotationNotes : template.invoiceNotes;
        }
        
        // Get appropriate terms from template first, then fallback to settings
        let termsToUse = '';
        if (template) {
            termsToUse = isQuotation ? template.quotationTerms : template.invoiceTerms;
        } else if (settings) {
            termsToUse = isQuotation ? settings.quotationTerms : settings.invoiceTerms;
        }
        termsToUse = termsToUse || '';
        
        if (notesToUse) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Notes:', margin, currentY);
            currentY += 8;
            
            doc.setFont(undefined, 'normal');
            const notesLines = doc.splitTextToSize(notesToUse, pageWidth - 2 * margin);
            doc.text(notesLines, margin, currentY);
            currentY += notesLines.length * 6 + 10;
        }
        
        if (termsToUse) {
            // Check if we need a new page for terms
            const estimatedTermsHeight = termsToUse.split('\n').length * 6;
            if (currentY + estimatedTermsHeight > pageHeight - 40) {
                doc.addPage();
                currentY = margin;
            }
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Terms & Conditions:', margin, currentY);
            currentY += 8;
            
            doc.setFont(undefined, 'normal');
            const termsLines = doc.splitTextToSize(termsToUse, pageWidth - 2 * margin);
            doc.text(termsLines, margin, currentY);
            currentY += termsLines.length * 6 + 10;
        }
        
        // Check for stamp image
        const stampExists = await checkImageExists('/assets/stamp.png');
        if (stampExists) {
            try {
                const stampImg = await loadImage('/assets/stamp.png');
                const stampSize = 40;
                doc.addImage(stampImg, 'PNG', 
                    pageWidth - margin - stampSize, 
                    pageHeight - margin - stampSize, 
                    stampSize, 
                    stampSize
                );
            } catch (error) {
                console.warn('Could not load stamp image');
            }
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on ${formatDate(new Date())}`, margin, pageHeight - 10);
        doc.text(`Page 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        
        // Save PDF
        const docType = isQuotation ? 'Quotation' : 'Invoice';
        const filename = `${docType}_${document.number}.pdf`;
        doc.save(filename);
        
        showToast(`${docType} PDF generated successfully`, 'success');
        
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        showToast('Failed to generate PDF', 'error');
    } finally {
        hideLoading();
    }
}