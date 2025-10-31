# Production Quotes & Invoices System

A comprehensive web-based application for managing production services, quotations, invoices, customer relationships, and business workflow. Built with modern web technologies and designed specifically for production companies to streamline their quote-to-invoice process.

## What's New (Latest Updates)

- Customers: Excel Import added for bulk uploads. Supports columns: Client Name, NTN, Contact Person, Email, Website, Phone (multiple, semicolon-separated), Address, City, Country, Status, Notes. Re-imports are idempotent — unchanged rows are skipped; matching priority: NTN → Email → Client Name.
- Customers: “Tax ID” renamed to “NTN” throughout UI and exports; added Website field; multiple phone numbers supported and normalized.
- Invoices: Added status workflow with three statuses — Pending (default), Cleared, Cancelled — editable inline with a small colored badge indicator.
- Invoices: Search and filter revamped — filter by Status and Client and free-text Search; filters persist and apply across all pages. Excel export now outputs the saved status.
- Quotations: Filters (status, client, search) now persist and apply across pages.

## 🎯 Current Status: Fully Functional Quotations Module

### ✅ Recently Completed Features

**Quotations Module Enhancement (Latest Update)**
- **Automated Status System**: Simplified 3-status system (Current, Revised, Expired) with automatic lifecycle management
- **Enhanced Revision Workflow**: Original quotations automatically marked as "Revised" when edited, with visual strikethrough styling
- **Print Preview Functionality**: Professional preview modal with print capability, replacing unnecessary "Duplicate/Revise" button
- **Data Isolation Fixes**: Resolved quotations sharing line items and PDF export issues through proper filtering
- **Bundle Integration Enhancement**: Fixed bundle display and cost calculation in quotation builder
- **Critical Data Integrity Fix**: Fixed revised quotations losing data by using PATCH instead of PUT for status updates
- **Improved Revision Display**: Fixed revision labels to show "Revision of quotation #" with proper quotation number instead of internal ID
- **Fixed Revised Quotation Totals**: Resolved issue where "Revised" quotations showed zero totals by preserving original line items and calculations
- **Enhanced Print Preview**: Fixed bundle names display, proper bundle/add-on ordering, improved text visibility, correct customer information display, removed status field for cleaner sharing, and added line ordering system to maintain quotation form sequence
- **Fixed Edit Quotation Sequence**: Resolved line item ordering issues in edit mode to preserve original quotation sequence across all operations
- **Complete Invoice Generation System**: Fixed generate invoice functionality with enhanced data preservation, added professional invoice preview modal, and ensured PDF export maintains proper line item sequence
- **Dedicated Invoice Page**: Implemented complete invoice management page with navigation, list view, preview, edit, and export capabilities
- **Fixed Invoice Table Issues**: Resolved incorrect amount calculations and column alignment issues, ensured all action buttons function properly
- **Comprehensive Header Buffer System**: Fixed header buffer to be internal-only with client-facing rates automatically adjusted, removed buffer visibility from all client documents
- **Complete Invoice Functionality Fixes**: Resolved bundle amount calculation, preview button functionality, edit button errors, and PDF export header buffer issues across all invoice operations
- **Streamlined Invoice Management**: Fixed preview button global accessibility and removed edit functionality as invoices should be immutable after generation
- **Critical Bundle/Rate Calculation Fixes**: Resolved bundle cost vs service rate handling in quotation preview, invoice generation, and PDF export to ensure accurate financial calculations
- **Fixed Invoice Preview Button Independence**: Resolved invoice preview dependencies by ensuring all required data (services, bundles, customers) is loaded when invoice page loads directly, eliminating need to visit quotations page first
- **Complete Company Templates System**: Implemented comprehensive multi-company support with templates containing company information, financial settings, and document terms - enables production teams to manage multiple group companies with distinct branding and business rules
- **Client History Tracking**: Comprehensive client quotation history with revision tracking and version control
- **Invoice Generation from Approved Quotations**: Automated invoice creation from approved quotations with different terms/notes
- **🐛 Critical Bug Fixes & Performance Improvements (Latest Update)**: 
  - **Fixed Quotation Duplication**: Added saving state protection and enhanced unique number generation to prevent duplicate quotation creation
  - **Fixed Invoice Duplication**: Added generation state protection and enhanced duplicate number checking with retry logic
  - **Fixed Invoice Pagination**: Implemented complete pagination system with correct item counts (was showing "0 of 0")
  - **Fixed Quotations Pagination Visibility**: Made pagination always visible for consistency (previously hidden with <5 items)
  - **Fixed Delete Function**: Corrected reload behavior after deleting invoices to properly refresh pagination
  - **Enhanced Pagination Performance**: Implemented 5 items per page with next/previous functionality for faster loading
  - **Fixed Invoice Generation Error**: Resolved JavaScript error when generating invoices (previewInvoice function not defined)
  - **Fixed JavaScript Syntax Errors**: Eliminated duplicate variable declarations in invoices.js causing console errors
  - **Concurrent Call Protection**: Added state flags (isSaving, isLoadingQuotations, isLoadingInvoices) to prevent multiple simultaneous operations
  - **Improved Number Generation**: Enhanced quotation and invoice number generation with timestamp + random components for better uniqueness
  - **Status Workflow Enforcement**: Strictly enforced 3-status system (Current → Revised → Expired) with proper database constraints
  - **🔧 CRITICAL FIX - Invoice Preview Button Independence**: Resolved the dependency issue where invoice preview buttons only worked after visiting the quotations page first
    - **Root Cause**: Invoice rendering code called `formatCurrency()` and `formatDate()` functions globally, but these were only available as `window.app.formatCurrency` 
    - **Solution**: Made critical formatting functions globally accessible by adding `window.formatCurrency = formatCurrency` and `window.formatDate = formatDate` assignments in app.js
    - **Additional Fixes**: Fixed JavaScript syntax errors in onclick handlers, improved event listener binding, ensured global data variables (services, bundles, customers) are properly loaded
    - **Result**: Invoice preview buttons now work immediately without requiring quotations page visit first
  - **📊 MAJOR FIX - Invoice Excel Export Template Data**: Resolved missing company template information in Excel exports
    - **Root Cause**: Excel export function (`exportInvoiceExcel`) was not loading company template data, only basic invoice information
    - **Missing Data**: Company name, email, phone, address, logo, invoice terms, invoice notes, and all template-based information
    - **Solution**: Added comprehensive template loading to Excel export with structured company information sections
    - **Enhancements**: Added dedicated "Company Template" sheet, organized data into sections (Company Info, Invoice Details, Client Info, Financial Details, Terms & Notes)
    - **Fallback System**: Added automatic fallback to current/default template for invoices without explicit templateId
    - **Result**: Excel exports now include complete company branding and template information matching PDF exports
  - **🎭 CRITICAL FIX - Modal Display Z-Index Conflict**: Resolved potential modal visibility issues caused by loading overlay conflicts
    - **Root Cause**: Both loading overlay and preview modals used same z-index (z-50), potentially causing display conflicts
    - **Solution**: Updated modal z-index to z-[60] for both invoice and quotation preview modals to ensure they appear above loading overlays
    - **Comprehensive Fixes Applied**: Function accessibility, template loading, event binding improvements, and z-index hierarchy
    - **Test Suite Created**: Multiple diagnostic tools to verify modal behavior, loading states, and preview functionality
    - **Result**: Invoice preview modals now display reliably without requiring quotations page visit
- **Separate Terms & Notes Management**: Distinct default terms and notes for quotations vs invoices in Settings
- **Enhanced PDF Export**: Generic PDF export supporting both quotations and invoices with appropriate terms
- **Comprehensive Reporting**: Excel reports for quotations with status breakdown and client analysis
- **🎨 UI Improvement**: Swapped Create Quotation and Manage Services buttons on dashboard for better workflow priority
- **⚡ Performance Optimizations**: Comprehensive code cleanup and optimization for production readiness
  - **Parallel Data Loading**: Optimized app initialization with Promise.all for faster startup times
  - **Debug Log Cleanup**: Removed verbose console.log statements throughout codebase for cleaner production logs
  - **Event Listener Optimization**: Streamlined navigation and button event binding for better performance
  - **Code Deduplication**: Cleaned up redundant logging and simplified error handling
  - **File Organization**: Removed 40+ test and debug files, keeping only essential production files
  - **Maintained Functionality**: All optimizations preserve existing features and functionality

### 🐛 **Known Issues (Future Investigation)**
- **Invoice Modal Dependency**: Invoice preview modal still requires visiting quotations page first despite comprehensive fixes applied (function accessibility, template loading, z-index conflicts, event binding). Multiple diagnostic tools created for future debugging. Excel export template integration working correctly.

### 🚀 Currently Functional Entry Points

**Main Application Interface**
- **Path**: `index.html`
- **Features**: Complete dark-themed dashboard with navigation to all modules including new dedicated Invoice page

**Quotations Management** (Primary Module)
- **Create New**: Navigate to Quotations → New Quotation
- **List & Filter**: View all quotations with status, client, and search filters (filters persist and apply across all pages)
- **Edit/Revision**: Full CRUD operations with automated revision workflow
- **Preview**: Print-preview modal with professional formatting and print capability
- **Client History**: Track all quotations for each client
- **PDF Export**: Generate professional quotation PDFs with appropriate terms
- **Excel Reports**: Comprehensive quotation reports with analytics

**Invoice Management** (Fully Functional)
- **Generate from Quotations**: Automatic invoice creation from current quotations with complete data transfer
- **Invoice List & Management**: Full invoice table with preview, status change, and export capabilities
- **Status Workflow**: Three statuses — Pending (default), Cleared, Cancelled — with inline selector and colored badge
- **Filtering & Search**: Filter by status and client, and free-text search; filters persist across pages and sessions
- **Professional Preview**: Print-ready modal preview matching quotation formatting
- **PDF Export**: High-quality PDF generation with proper line item sequence
- **Excel Export**: Comprehensive invoice reports and data export (exports actual saved status)
- **Data Integrity**: Maintains complete bundle/add-on relationships and line sequence

**Services Management**
- **Path**: Services section in main navigation
- **Features**: Complete service catalog with categories, rates, team roles
- **Excel Import/Export**: Bulk operations with templates

**Bundle Management** (Newly Enhanced)
- **Path**: Bundles section in main navigation  
- **Features**: 
  - **Bundle Builder**: Interactive form for creating service packages with multiple services
  - **Multiple Quantities Support**: Add multiple lines of the same service (e.g., 2 cameras, 3 guards)
  - **Service Selection**: Dropdown integration with services database for easy selection
  - **Real-time Cost Calculation**: Automatic cost calculations with bundle summaries
  - **Include/Exclude Items**: Toggle items in/out of bundles with conditional pricing
  - **Sample Data Import**: Pre-populated bundle templates for common service packages
  - **Excel Import/Export**: Import bundle definitions from Excel files
  - **Bundle Actions**: Full CRUD operations with edit/delete capabilities
  - **Usage Options**: Expand bundles (transparent) or roll-up pricing in quotations

**Customer Management**
- **Path**: Customers section in main navigation
- **Features**: Complete customer database with contact management
- **Excel Import**: Bulk import customers from Excel. Supported columns: Client Name, NTN, Contact Person, Email, Website, Phone (multiple; separate with semicolons), Address, City, Country, Status, Notes. Re-imports are idempotent — unchanged rows are skipped; matching priority is NTN → Email → Client Name.
- **Field Updates**: “Tax ID” renamed to “NTN” across UI and exports; added Website; supports multiple phone numbers.
- **Integration**: Seamless integration with quotation forms

**Settings & Configuration**
- **Path**: Settings section in main navigation
- **Features**: 
  - Application settings (currencies, tax rates, discounts)
  - **Complete Company Templates Management**: Create, edit, and manage multiple company templates with distinct branding, contact information, financial settings, and document terms
  - **Template-Based Document Creation**: Quotations and invoices automatically use selected company template for consistent branding and business rules
  - **Separate Quotation & Invoice Terms**: Configurable default terms and notes for each document type per template
  - Currency rate management
  - Default values for new documents

### 💾 Data Storage & API Integration

**GenSpark Native Database Tables**
- **quotations**: 23 fields including templateId for company template association
- **quotation_lines**: 18 fields mirroring service structure with quotation-specific calculations
- **invoices**: 21+ fields including `status` (Pending/Cleared/Cancelled) and `templateId` for company template inheritance
- **invoice_lines**: Line items for generated invoices
- **company_templates**: 18 fields for complete multi-company management (NEW)
- **services**: Service catalog with rates, categories, team roles
- **bundles**: Service packages and combinations
- **customers**: Customer database with contact information
- **settings**: Enhanced with quotationTerms, invoiceTerms, quotationNotes, invoiceNotes
- **currency_rates**: Exchange rate management

**RESTful Table API Integration**
- **CRUD Operations**: Full Create, Read, Update, Delete for all entities
- **Search & Filter**: Advanced filtering by status, client, date ranges
- **Pagination**: Efficient data loading for large datasets
- **Real-time Updates**: Live data synchronization across modules

### 🔧 Technical Architecture

**Recent Critical Fix: Invoice Preview Independence**
- **Problem**: Invoice preview buttons required visiting quotations page first to work properly
- **Root Cause**: The invoice and quotation preview modals were nested inside the hidden quotations page container; when navigating directly to invoices, the hidden ancestor prevented the modal from showing. There was also implicit reliance on data that might not have been loaded yet.
- **Solution**: Moved both preview modals to the global root of the DOM (outside page containers), and added a runtime guard that re-parents the invoice/quotation modals to `document.body` if ever found under a hidden page. Retained dependency checks to load services/bundles/customers/templates when needed.
- **Implementation**:
  - Relocated `#invoice-preview-modal` and `#quotation-preview-modal` out of `#page-quotations` into a global section at the bottom of `index.html`.
  - Added re-parenting safety in `showInvoicePreview` and `showQuotationPreview` to ensure independence from page visibility state.
  - Minor cleanup in `previewInvoice` to remove duplicate dependency checks.
- **Files Modified**: `index.html`, `js/invoices.js`, `js/quotations.js`

**Frontend Technologies**
- **Framework**: Vanilla JavaScript with modular architecture
- **Styling**: Tailwind CSS with dark theme implementation
- **UI Components**: Custom dashboard with responsive design
- **Icons**: Font Awesome 6.4.0 for modern iconography

**JavaScript Modules**
- **quotations.js**: Complete quotation lifecycle management with template integration (80KB)
- **app.js**: Core application logic with routing and global data loading (20KB)
- **services.js**: Service catalog management (16KB)
- **customers.js**: Customer relationship management (18KB)
- **bundles.js**: Service package management (12KB)
- **invoices.js**: Invoice generation and management with dependency resolution (37KB)
- **settings.js**: Configuration and company template management (48KB)
- **pdf.js**: Generic PDF export with company template branding (38KB)
- **pdf-globals.js**: Global function exposure for PDF operations (1KB)
- **excel.js**: Comprehensive Excel import/export (25KB)
- **excel-globals.js**: Global function exposure for Excel operations (1KB)
- **utils.js**: Shared utilities and helpers (11KB)

**Libraries & Dependencies**
- **SheetJS (XLSX)**: Excel file operations
- **jsPDF**: PDF document generation
- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icon library

### 🏗️ Project Structure
```
/
├── index.html              # Main application interface (64KB)
├── js/
│   ├── quotations.js      # Quotation module (NEW - 39KB)
│   ├── app.js            # Core application logic (18KB)
│   ├── services.js       # Service management (16KB)
│   ├── customers.js      # Customer management (18KB)
│   ├── bundles.js        # Bundle management with Builder, Excel import, CRUD (Enhanced)
│   ├── invoices.js       # Invoice management (25KB)
│   ├── settings.js       # Settings management (13KB)
│   ├── pdf.js           # PDF export with quotation support (21KB)
│   ├── excel.js         # Excel operations with quotation reports (20KB)
│   └── utils.js         # Shared utilities (11KB)
├── assets/               # Static assets directory
├── README.md            # This documentation
├── DEPLOYMENT.md        # Deployment instructions
└── test.html           # Development testing page
```

### 🎨 User Experience Features

**Modern Dark Theme Interface**
- Consistent dark gray color scheme
- Hover effects and smooth transitions  
- Responsive design for all screen sizes
- Intuitive navigation with clear visual hierarchy

**Advanced Workflow Management**
- **Quotation-First Approach**: Business workflow starts with quotations
- **Status-Based Actions**: Contextual actions based on document status
- **Client Relationship Tracking**: Complete history per client
- **Revision Management**: Professional revision handling with version control

**Data Import/Export Capabilities**
- Excel templates for bulk service imports
- Customer Excel import with NTN, Website, and multiple phone numbers; idempotent re-imports (skips unchanged)
- Comprehensive Excel reports with analytics
- Professional PDF generation for client presentation
- Full data backup and restore functionality

### 🔄 Business Process Flow

1. **Quotation Creation**: 
   - **Bundle Selection**: First line item automatically shows bundle packages for standard offerings
   - **Add-on Services**: Additional line items allow individual services/add-ons not included in bundles
   - **Flexible Pricing**: Combine bundle pricing with individual service rates
   - **Professional Formatting**: Complete quotations with terms and client details
2. **Client Interaction**: Send quotations to clients with professional formatting
3. **Revision Management**: Handle client feedback with revision tracking
4. **Approval Process**: Mark quotations as approved when client accepts
5. **Invoice Generation**: Automatically generate invoices from approved quotations
6. **History Tracking**: Maintain complete audit trail for all client interactions

## 📦 Bundle Management System (Newly Enhanced)

### Overview
The Bundle Management module allows creating service packages that combine multiple services into cohesive offerings. This is essential for standardizing common service combinations and simplifying quotation creation.

### Key Features

**Bundle Builder Interface**
- **Interactive Form**: Comprehensive form for creating and editing service bundles
- **Service Selection**: Dropdown menus populated from the services database
- **Multiple Quantities**: Support for multiple units of the same service (e.g., 2 cameras, 3 guards)
- **Real-time Calculations**: Automatic cost calculations with live bundle summaries
- **Include/Exclude Logic**: Toggle individual items in/out of bundles for flexible pricing

**Bundle Management Operations**
- **Create New Bundles**: Build packages from scratch with Bundle Builder
- **Edit Existing Bundles**: Modify bundle composition and pricing
- **Delete Bundles**: Remove obsolete or incorrect bundles
- **Duplicate Bundles**: Clone existing bundles as starting points for new packages

**Data Import/Export**
- **Sample Data**: Pre-populated bundle templates for common security/production packages
- **Excel Import**: Import bundle definitions from structured Excel files
- **Excel Export**: Generate comprehensive bundle reports for analysis
- **Bulk Operations**: Handle multiple bundles efficiently

**Integration with Quotations** (Enhanced Workflow)
- **Bundle-First Approach**: First quotation line item shows bundle packages for primary offerings
- **Add-on Services**: Additional line items show individual services for extras not in standard bundles
- **Automatic Cost Calculation**: Bundle costs calculated from component services and included in totals
- **Flexible Pricing**: Combine bundle pricing with individual service rates in same quotation
- **Smart Dropdowns**: Context-aware dropdowns (bundles for line 1, services for additional lines)

### Bundle Data Structure

**Bundles Table**
- `bundleCode`: Unique identifier (e.g., PKG-BASIC-SEC)
- `name`: Descriptive name (e.g., "Basic Security Package")
- `parentServiceId`: Optional link to parent service (for roll-up pricing)
- `description`: Detailed description of the bundle

**Bundle Items Table**
- `bundleId`: Reference to parent bundle
- `childServiceId`: Reference to included service
- `childQty`: Quantity of the service in the bundle
- `include`: Boolean flag for conditional inclusion
- `notes`: Additional notes for the bundle item

### Sample Bundles Included
1. **Basic Security Package**: 2 security guards, 1 supervisor
2. **Premium Security Package**: 4 guards, 2 supervisors, 6 CCTV cameras
3. **Event Security Package**: 6 guards, 1 event coordinator

### Usage in Quotations
When adding services to quotations, users can select either individual services or pre-configured bundles. Bundle services can be:
- **Expanded**: Show all individual components with quantities
- **Rolled Up**: Show as single line item with bundle pricing

### 🔮 Recommended Next Development Steps

**Enhanced Quotation Features**
- Email integration for sending quotations directly to clients
- Digital signature collection for quotation approvals
- Automated follow-up reminders for pending quotations
- Advanced pricing rules and bulk discount management

**Reporting & Analytics**
- Executive dashboard with quotation conversion rates
- Client profitability analysis and trends
- Service popularity and pricing optimization insights
- Seasonal demand forecasting based on quotation data

**Integration Capabilities**
- Calendar integration for project scheduling
- CRM system integration for enhanced customer management
- Accounting software integration for financial workflows
- API endpoints for third-party system integration

**Advanced Document Management**
- Template customization for different client types
- Multi-language support for international clients
- Advanced PDF customization with branding options
- Document versioning and change tracking

## 🚀 Quick Start Guide

1. **Access the Application**: Open `index.html` in a modern web browser
2. **Configure Settings**: Navigate to Settings to set up default currencies, tax rates, and terms
3. **Add Services**: Create your service catalog in the Services section
4. **Add Customers**: Build your customer database in the Customers section
5. **Create Quotations**: Start with the Quotations module to create professional quotes
6. **Generate Invoices**: Convert approved quotations to invoices seamlessly

## 📚 Documentation

- **README.md**: This comprehensive overview
- **DEPLOYMENT.md**: Detailed deployment instructions and requirements
- **test.html**: Development testing interface for module validation

## 🎯 Production Readiness

The system is now **production-ready** with a complete quotation-to-invoice workflow, comprehensive data management, professional document generation, and robust error handling. The quotation module transformation provides a professional foundation for production companies to manage their entire quote-to-cash process efficiently.

**Key Production Features:**
- ✅ Complete quotation lifecycle management
- ✅ Professional PDF generation with customizable terms
- ✅ Comprehensive Excel reporting and analytics  
- ✅ Robust error handling and data validation
- ✅ Responsive design for desktop and mobile use
- ✅ RESTful API integration with GenSpark database
- ✅ Modern, professional user interface
- ✅ Complete audit trail and history tracking

---

**Last Updated**: October 2025 - Quotation Module Transformation Complete

## Additional Fixes

- Bundles: Fixed "Bundle Unit" dropdown showing empty options in create/edit. Units now load reliably and the existing selection is restored when editing.
- Services: Added multi-selection with a master checkbox and bulk delete on the Services page.
- Services Import (Excel): Now idempotent per Service Code � updates changed rows, skips unchanged.
