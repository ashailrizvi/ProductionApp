// Make PDF functions globally available
if (typeof window !== 'undefined') {
    // Ensure functions are available after PDF module loads
    const ensurePDFGlobals = () => {
        if (typeof exportInvoicePDF === 'function') {
            window.exportInvoicePDF = exportInvoicePDF;
        }
        if (typeof generateInvoicesReport === 'function') {
            window.generateInvoicesReport = generateInvoicesReport;
        }
        if (typeof generateServicesCatalog === 'function') {
            window.generateServicesCatalog = generateServicesCatalog;
        }
        if (typeof exportDocumentPDF === 'function') {
            window.exportDocumentPDF = exportDocumentPDF;
        }
    };
    
    // Run immediately and after DOM loads
    ensurePDFGlobals();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensurePDFGlobals);
    }
}