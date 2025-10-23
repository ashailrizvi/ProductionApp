// Make Excel functions globally available
if (typeof window !== 'undefined') {
    // Ensure functions are available after Excel module loads
    const ensureExcelGlobals = () => {
        if (typeof exportInvoiceExcel === 'function') {
            window.exportInvoiceExcel = exportInvoiceExcel;
        }
        if (typeof exportInvoicesReport === 'function') {
            window.exportInvoicesReport = exportInvoicesReport;
        }
    };
    
    // Run immediately and after DOM loads
    ensureExcelGlobals();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureExcelGlobals);
    }
}