# 🛠️ MAHI TRADERS — Inventory Management & Billing System

A full-featured, browser-based **Inventory Management and Billing System** designed for hardware, electrical, plumbing, paint, and general retail shops. Built with vanilla JavaScript and IndexedDB — no server or internet required after initial load.

> **Live demo:** Run `Run-MAHI-TRADERS.bat` (Windows) or serve with `python -m http.server 3000`

---

## ✨ Features Overview

| Area | Features |
|------|----------|
| **Auth** | Login / Registration with SHA-256 password hashing |
| **Dashboard** | Real-time revenue, product counts, low-stock alerts |
| **Inventory** | Excel-style grid, 4 categories, search, CSV import/export |
| **Billing** | Autocomplete product search, GST toggle, cash/change calc |
| **Invoicing** | Print, PDF download, edit, reprint, view modal, delete |
| **Invoice History** | Search, date range filter, CSV export, loading spinner |
| **Customers** | CRUD directory with phone-based billing lookup |
| **Backup/Restore** | Full JSON export/import, factory reset |
| **UX** | Keyboard shortcuts, dark mode toggle, dark-styled modals, responsive layout |

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Edge, Firefox — **IndexedDB required**)
- No server-side setup required. Files are served statically.

### Installation

```bash
# Clone the repository
git clone https://github.com/SURYaDob/inventory-management-system.git
cd inventory-management-system

# Option 1: Open directly (some browsers restrict IndexedDB on file://)
# Open index.html in your browser

# Option 2: Serve with Python (recommended)
python -m http.server 3000
# Then go to http://localhost:3000

# Option 3: Serve with Node.js
npx serve .
```

### Windows Quick Launch

Double-click **`Run-MAHI-TRADERS.bat`** — it launches the app in a clean Edge app window.

---

## 🔐 Default Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Administrator |

On first run, the database is automatically seeded with:
- **16 demo products** across 4 categories
- **5 demo customers**
- **5 sample invoices** with different dates and times

---

## 🖥️ Screens & Modules

### 1. Dashboard

The landing page after login shows key business metrics:

- **Sales Revenue (Today)** — total revenue from today's bills
- **Total Products** — count of all items in the catalog
- **Low Stock Warnings** — items with quantity below 10 units
- **Category Quick Links** — click to jump directly to any inventory category
- **Low Stock Alarm Center** — detailed table of all low/out-of-stock items

### 2. Inventory Management

Category-managed inventory with an **Excel-style spreadsheet grid**:

| Column | Description |
|--------|-------------|
| SKU / Code | Unique product identifier |
| Product Name | Display name for bills |
| Purchase Price | Wholesale cost (₹) |
| Selling Price | Retail price (₹) |
| Stock Qty | Current inventory count |
| GST % | Item-level tax rate |

**Actions:**
- **Edit** — single-click any cell, type, and press Enter/blur to auto-save
- **Add Row** — adds a new item with auto-generated SKU
- **Delete** — remove a product with confirmation
- **Search** — filter by name or SKU in real-time
- **Export CSV** — download the current category as a CSV file
- **Import CSV** — bulk-import products from a formatted CSV

### 3. Billing Counter

The sales counter for generating customer invoices:

- **Customer Info** — name, phone (auto-lookup from customer directory), date/time
- **Category Filter** — narrow product autocomplete by category
- **Product Autocomplete** — type to search; shows name, SKU, stock level, category
- **Product Search Modal** — press **F3** or click the search icon in any row for a full-searchable product table
- **GST Toggle** — enable/disable GST; shows/hides CGST/SGST columns
- **Cash Received** — enter amount to auto-calculate change/balance
- **Quick Row Addition** — press **F2** to add a new billing row

**Keyboard Shortcuts (on Billing screen):**
| Key | Action |
|-----|--------|
| `F2` | Add new billing row |
| `F3` | Open product search modal |
| `F4` | Print invoice |
| `Escape` | Reset/clear current invoice |

### 4. Print & PDF

Two output options after building an invoice:

- **Print Invoice** — opens the native print dialog with a clean receipt format (hides all UI chrome)
- **Save as PDF** — generates a professional PDF using jsPDF + AutoTable with store header, line items, GST breakdown, and totals

Both options:
- Save the transaction to the database
- Deduct sold quantities from inventory stock
- Reset the billing counter for the next customer

### 5. Invoice History

Full transaction log with powerful features:

- **View** — click the eye icon to open a read-only modal with full invoice details, line items, and totals
- **Print from Modal** — reprint any invoice directly from the view modal
- **PDF from Modal** — download a PDF of any historical invoice
- **Edit** — click the pencil icon to load an invoice into the billing counter for corrections (restores old stock, applies new changes on save)
- **Reprint** — quick print any past invoice
- **Delete** — remove an invoice (stocks are not automatically restored)
- **Search** — filter by customer name, phone, or invoice ID
- **Date Range Filter** — filter invoices between specific From/To dates with a Clear button
- **Export CSV** — download all filtered invoices as a CSV file
- **Loading Spinner** — animated indicator while invoice data loads

### 6. Customer Directory

Manage your customer base:

- **Add customer** — name, phone, email, address
- **Edit customer** — click the edit icon to update details
- **Delete customer** — remove with confirmation
- **Search** — filter by name or phone
- **Phone Auto-Lookup** — during billing, entering a phone number auto-fills the customer name from the directory

### 7. Dark Mode 🌙

Reduce eye strain with a built-in dark theme:

- **Toggle** — click the moon/sun icon button in the bottom-left corner of the sidebar (footer area)
- **Persistence** — your theme preference is saved to browser local storage and automatically restored on next launch
- **Coverage** — dark mode applies to every screen: login, sidebar, dashboard, inventory grids, billing counter, invoice history, modals, customer directory, and backup/restore screens
- **Print Note** — dark mode is purely visual; invoice printouts and PDF downloads always use the clean light format

### 8. Backup & Restore

Database maintenance tools:

- **Export JSON Backup** — download a complete database backup (products, invoices, users)
- **Restore JSON Backup** — upload a previous backup file to restore data (overwrites current data)
- **Factory Reset** — wipe all data and start fresh

---

## 🧱 Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure & modals |
| **CSS3** | Styling with CSS variables, animations, responsive grid |
| **Vanilla JavaScript** | All application logic (no frameworks) |
| **IndexedDB** | Client-side database (offline-first) |
| **Web Crypto API** | SHA-256 password hashing |
| **jsPDF + AutoTable** | PDF invoice generation |
| **Google Fonts** | Inter (UI) + JetBrains Mono (tabular data) |

---

## 📁 Project Structure

```
MAHI_TRADERS/
├── index.html          # Main HTML with all screens, modals, print template
├── style.css           # Complete design system + all component styles
├── app.js              # All application logic (~5400 lines)
├── Run-MAHI-TRADERS.bat # Windows quick-launch script
├── USER_GUIDE.txt      # Detailed user operation manual
├── .gitignore
└── README.md
```

---

## 🔧 Architecture

### Data Flow

```
User Input → JavaScript Controllers → IndexedDB (via DBManager class)
                                         ↓
                              Update UI → Re-render Views
```

### Key Classes & Modules

| Module | File | Responsibility |
|--------|------|----------------|
| `DBManager` | `app.js` | IndexedDB operations (CRUD for products, invoices, users, customers) |
| `AppState` | `app.js` | Global application state (current screen, billing items, etc.) |
| `DOM` | `app.js` | Cached DOM element references for performance |
| Controllers | `app.js` | Screen-specific logic (dashboard, billing, inventory, invoices, customers) |

---

## 📊 Demo Data

On first run with an empty database, the app automatically seeds:

**16 Products (4 per category):**
| Category | Example Products |
|----------|-----------------|
| ⚡ Electrical | LED Bulbs, PVC Conduit, Modular Switches, Copper Wire |
| 🔧 Plumbing | PVC Elbows, Brass Bib Taps, Teflon Tape, UPVC Pipes |
| 🎨 Paint | Wall Primer, Tractor Emulsion, Paint Brushes, Sandpaper |
| 🔩 Hardware | Wood Screws, Tower Bolts, Hinges, Padlocks |

**5 Customers:** Rajesh Kumar, Priya Sharma, Amit Singh, Sunita Patel, Vikram Joshi

**5 Invoices:** Created across different dates (today to 3 days ago) with realistic items and totals.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute as needed.

---

## 📬 Support

For issues, bugs, or feature requests, please [open a GitHub issue](https://github.com/SURYaDob/inventory-management-system/issues).
