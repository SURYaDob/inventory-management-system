// ================= DATABASE MANAGER (IndexedDB) =================
class DBManager {
    constructor() {
        this.dbName = "IMS_HardwareShopDB";
        this.dbVersion = 3; // Incremented version for customers store
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("IndexedDB opening failed:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB initialized successfully.");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create products store
                if (!db.objectStoreNames.contains("products")) {
                    const productStore = db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
                    productStore.createIndex("category", "category", { unique: false });
                    productStore.createIndex("sku", "sku", { unique: true });
                }

                // Create invoices store
                if (!db.objectStoreNames.contains("invoices")) {
                    const invoiceStore = db.createObjectStore("invoices", { keyPath: "id", autoIncrement: true });
                    invoiceStore.createIndex("date", "date", { unique: false });
                    invoiceStore.createIndex("customerPhone", "customerPhone", { unique: false });
                }

                // Create users store
                if (!db.objectStoreNames.contains("users")) {
                    const userStore = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
                    userStore.createIndex("username", "username", { unique: true });
                }

                // Create customers store
                if (!db.objectStoreNames.contains("customers")) {
                    const customerStore = db.createObjectStore("customers", { keyPath: "id", autoIncrement: true });
                    customerStore.createIndex("phone", "phone", { unique: false });
                }
            };
        });
    }

    // --- User Operations ---
    getAllUsers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["users"], "readonly");
            const store = transaction.objectStore("users");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["users"], "readonly");
            const store = transaction.objectStore("users");
            const index = store.index("username");
            const request = index.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    saveUser(user) {
        return new Promise(async (resolve, reject) => {
            try {
                user.password = await hashPassword(user.password);
                const transaction = this.db.transaction(["users"], "readwrite");
                const store = transaction.objectStore("users");
                const request = store.add(user);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    updateUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["users"], "readwrite");
            const store = transaction.objectStore("users");
            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    seedDefaultUser() {
        return new Promise(async (resolve, reject) => {
            try {
                const users = await this.getAllUsers();
                if (users.length === 0) {
                    await this.saveUser({
                        fullname: "Administrator",
                        username: "admin",
                        password: "admin",
                        role: "Admin"
                    });
                    console.log("Default admin user seeded.");
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    // --- Customer Operations ---
    getAllCustomers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["customers"], "readonly");
            const store = transaction.objectStore("customers");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getCustomerByPhone(phone) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["customers"], "readonly");
            const store = transaction.objectStore("customers");
            const index = store.index("phone");
            const request = index.getAll(phone);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["customers"], "readwrite");
            const store = transaction.objectStore("customers");
            const request = customer.id ? store.put(customer) : store.add(customer);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    deleteCustomer(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["customers"], "readwrite");
            const store = transaction.objectStore("customers");
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- Product Operations ---
    getAllProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readonly");
            const store = transaction.objectStore("products");
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getProductsByCategory(category) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readonly");
            const store = transaction.objectStore("products");
            const index = store.index("category");
            const request = index.getAll(category);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    saveProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readwrite");
            const store = transaction.objectStore("products");
            
            // Clean values
            product.purchasePrice = parseFloat(product.purchasePrice) || 0;
            product.sellingPrice = parseFloat(product.sellingPrice) || 0;
            product.stock = parseInt(product.stock) || 0;
            product.gstRate = parseFloat(product.gstRate) || 0;

            const request = product.id ? store.put(product) : store.add(product);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => {
                // Ignore constraint errors for import duplicate checks or handle it
                reject(request.error);
            };
        });
    }

    deleteProduct(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readwrite");
            const store = transaction.objectStore("products");
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getProductBySku(sku) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readonly");
            const store = transaction.objectStore("products");
            const index = store.index("sku");
            const request = index.get(sku);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    updateProductStock(id, qtyDeduction) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products"], "readwrite");
            const store = transaction.objectStore("products");
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const product = getRequest.result;
                if (product) {
                    product.stock = Math.max(0, product.stock - qtyDeduction);
                    const putRequest = store.put(product);
                    putRequest.onsuccess = () => resolve(putRequest.result);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(null);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // --- Invoice Operations ---
    getAllInvoices() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["invoices"], "readonly");
            const store = transaction.objectStore("invoices");
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getInvoiceById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["invoices"], "readonly");
            const store = transaction.objectStore("invoices");
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    updateInvoice(invoice) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["invoices"], "readwrite");
            const store = transaction.objectStore("invoices");
            const request = store.put(invoice);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    deleteInvoice(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["invoices"], "readwrite");
            const store = transaction.objectStore("invoices");
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    saveInvoice(invoice) {
        return new Promise(async (resolve, reject) => {
            try {
                // Save invoice first
                const transaction = this.db.transaction(["invoices"], "readwrite");
                const store = transaction.objectStore("invoices");
                const request = store.add(invoice);

                request.onsuccess = async () => {
                    const newInvoiceId = request.result;
                    
                    // Deduct stock for all items using existing method
                    for (const item of invoice.items) {
                        if (item.productId && item.qty > 0) {
                            await this.updateProductStock(item.productId, item.qty);
                        }
                    }
                    resolve(newInvoiceId);
                };
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    // --- Seed Demo Data ---
    seedDemoCustomers() {
        const demoCustomers = [
            { name: "Rajesh Kumar", phone: "9876543210", email: "rajesh@example.com", address: "12, MG Road, Bangalore" },
            { name: "Priya Sharma", phone: "9876543211", email: "priya@example.com", address: "45, Park Street, Mumbai" },
            { name: "Amit Singh", phone: "9876543212", email: "amit@example.com", address: "78, Lajpat Nagar, Delhi" },
            { name: "Sunita Patel", phone: "9876543213", email: "sunita@example.com", address: "34, FC Road, Pune" },
            { name: "Vikram Joshi", phone: "9876543214", email: "vikram@example.com", address: "56, Civil Lines, Jaipur" }
        ];

        return new Promise(async (resolve, reject) => {
            try {
                const current = await this.getAllCustomers();
                if (current.length === 0) {
                    const transaction = this.db.transaction(["customers"], "readwrite");
                    const store = transaction.objectStore("customers");
                    for (const c of demoCustomers) {
                        store.add(c);
                    }
                    console.log("Database seeded with sample customer records.");
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    seedDemoInvoices() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const fmtDate = (d) => d.toISOString().split("T")[0];
        const fmtTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

        const demoInvoices = [
            {
                invoiceId: "INV-10001",
                date: fmtDate(threeDaysAgo),
                time: fmtTime(threeDaysAgo),
                datetime: `${fmtDate(threeDaysAgo)}T${fmtTime(threeDaysAgo)}`,
                customerName: "Rajesh Kumar",
                customerPhone: "9876543210",
                items: [
                    { productId: 1, name: "SYSKA LED Bulb 9W", sku: "ELE-LED-09W", rate: 110, qty: 5, gstRate: 18 },
                    { productId: 3, name: "Modular Switch 6Amp Anchor", sku: "ELE-MOD-SWI", rate: 35, qty: 10, gstRate: 18 }
                ],
                subtotal: 900,
                gstTax: 162,
                total: 1062,
                gstEnabled: true
            },
            {
                invoiceId: "INV-10002",
                date: fmtDate(twoDaysAgo),
                time: fmtTime(twoDaysAgo),
                datetime: `${fmtDate(twoDaysAgo)}T${fmtTime(twoDaysAgo)}`,
                customerName: "Priya Sharma",
                customerPhone: "9876543211",
                items: [
                    { productId: 5, name: "PVC Elbow 90 Deg 1/2 Inch Supreme", sku: "PLB-PVC-ELB", rate: 18, qty: 20, gstRate: 18 },
                    { productId: 7, name: "Teflon Thread Seal Tape", sku: "PLB-TEF-TPE", rate: 15, qty: 30, gstRate: 18 },
                    { productId: 10, name: "Asian Paints Tractor Emulsion 1L", sku: "PNT-EML-WHT", rate: 280, qty: 2, gstRate: 18 }
                ],
                subtotal: 1190,
                gstTax: 214.2,
                total: 1404.2,
                gstEnabled: true
            },
            {
                invoiceId: "INV-10003",
                date: fmtDate(yesterday),
                time: fmtTime(yesterday),
                datetime: `${fmtDate(yesterday)}T${fmtTime(yesterday)}`,
                customerName: "Walk-in Customer",
                customerPhone: "-",
                items: [
                    { productId: 13, name: "Steel Wood Screw 1.5 Inch (Box-100)", sku: "HRD-WD-SCRW", rate: 120, qty: 3, gstRate: 18 },
                    { productId: 14, name: "Brass Tower Bolt 6 Inch", sku: "HRD-TWR-BLT", rate: 165, qty: 2, gstRate: 18 },
                    { productId: 16, name: "Godrej Padlock 40mm Double Lock", sku: "HRD-PAD-LOCK", rate: 240, qty: 1, gstRate: 18 }
                ],
                subtotal: 930,
                gstTax: 167.4,
                total: 1097.4,
                gstEnabled: true
            },
            {
                invoiceId: "INV-10004",
                date: fmtDate(today),
                time: fmtTime(today),
                datetime: `${fmtDate(today)}T${fmtTime(today)}`,
                customerName: "Amit Singh",
                customerPhone: "9876543212",
                items: [
                    { productId: 4, name: "Finolex Copper Wire 1.5 Sqmm (90m)", sku: "ELE-COP-WIRE", rate: 1350, qty: 2, gstRate: 18 },
                    { productId: 6, name: "Brass Bib Tap 1/2 Inch Parryware", sku: "PLB-BRS-TAP", rate: 320, qty: 4, gstRate: 18 },
                    { productId: 9, name: "Asian Paints Wall Primer White 4L", sku: "PNT-WLL-PRM", rate: 650, qty: 1, gstRate: 18 }
                ],
                subtotal: 4580,
                gstTax: 824.4,
                total: 5404.4,
                gstEnabled: true
            },
            {
                invoiceId: "INV-10005",
                date: fmtDate(today),
                time: fmtTime(new Date(today.getTime() - 3600000)),
                datetime: `${fmtDate(today)}T${fmtTime(new Date(today.getTime() - 3600000))}`,
                customerName: "Sunita Patel",
                customerPhone: "9876543213",
                items: [
                    { productId: 2, name: "PVC Conduit Pipe 1 Inch (10ft)", sku: "ELE-PVC-01I", rate: 75, qty: 10, gstRate: 18 },
                    { productId: 15, name: "Stainless Steel Hinge 4x3 Inch", sku: "HRD-HING-04", rate: 80, qty: 6, gstRate: 18 },
                    { productId: 11, name: "Paint Brush 3 Inch Deluxe", sku: "PNT-BRS-03I", rate: 60, qty: 5, gstRate: 18 },
                    { productId: 8, name: "UPVC Pipe 1 Inch Class-1 (3m)", sku: "PLB-UPV-PIPE", rate: 160, qty: 3, gstRate: 18 }
                ],
                subtotal: 1910,
                gstTax: 343.8,
                total: 2253.8,
                gstEnabled: true
            }
        ];

        return new Promise(async (resolve, reject) => {
            try {
                const current = await this.getAllInvoices();
                if (current.length === 0) {
                    const transaction = this.db.transaction(["invoices"], "readwrite");
                    const store = transaction.objectStore("invoices");
                    for (const inv of demoInvoices) {
                        store.add(inv);
                    }
                    console.log("Database seeded with sample invoice records.");
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    seedDemoData() {
        const demoProducts = [
            // Electrical
            { sku: "ELE-LED-09W", name: "SYSKA LED Bulb 9W", category: "electrical", purchasePrice: 70, sellingPrice: 110, stock: 120, gstRate: 18 },
            { sku: "ELE-PVC-01I", name: "PVC Conduit Pipe 1 Inch (10ft)", category: "electrical", purchasePrice: 40, sellingPrice: 75, stock: 95, gstRate: 18 },
            { sku: "ELE-MOD-SWI", name: "Modular Switch 6Amp Anchor", category: "electrical", purchasePrice: 18, sellingPrice: 35, stock: 350, gstRate: 18 },
            { sku: "ELE-COP-WIRE", name: "Finolex Copper Wire 1.5 Sqmm (90m)", category: "electrical", purchasePrice: 950, sellingPrice: 1350, stock: 25, gstRate: 18 },
            // Plumbing
            { sku: "PLB-PVC-ELB", name: "PVC Elbow 90 Deg 1/2 Inch Supreme", category: "plumbing", purchasePrice: 8, sellingPrice: 18, stock: 80, gstRate: 18 },
            { sku: "PLB-BRS-TAP", name: "Brass Bib Tap 1/2 Inch Parryware", category: "plumbing", purchasePrice: 190, sellingPrice: 320, stock: 15, gstRate: 18 },
            { sku: "PLB-TEF-TPE", name: "Teflon Thread Seal Tape", category: "plumbing", purchasePrice: 7, sellingPrice: 15, stock: 450, gstRate: 18 },
            { sku: "PLB-UPV-PIPE", name: "UPVC Pipe 1 Inch Class-1 (3m)", category: "plumbing", purchasePrice: 90, sellingPrice: 160, stock: 60, gstRate: 18 },
            // Paint
            { sku: "PNT-WLL-PRM", name: "Asian Paints Wall Primer White 4L", category: "paint", purchasePrice: 420, sellingPrice: 650, stock: 12, gstRate: 18 },
            { sku: "PNT-EML-WHT", name: "Asian Paints Tractor Emulsion 1L", category: "paint", purchasePrice: 180, sellingPrice: 280, stock: 18, gstRate: 18 },
            { sku: "PNT-BRS-03I", name: "Paint Brush 3 Inch Deluxe", category: "paint", purchasePrice: 35, sellingPrice: 60, stock: 110, gstRate: 18 },
            { sku: "PNT-SND-PPR", name: "Waterproof Sandpaper Grit 150", category: "paint", purchasePrice: 6, sellingPrice: 12, stock: 500, gstRate: 18 },
            // Hardware
            { sku: "HRD-WD-SCRW", name: "Steel Wood Screw 1.5 Inch (Box-100)", category: "hardware", purchasePrice: 65, sellingPrice: 120, stock: 40, gstRate: 18 },
            { sku: "HRD-TWR-BLT", name: "Brass Tower Bolt 6 Inch", category: "hardware", purchasePrice: 90, sellingPrice: 165, stock: 30, gstRate: 18 },
            { sku: "HRD-HING-04", name: "Stainless Steel Hinge 4x3 Inch", category: "hardware", purchasePrice: 42, sellingPrice: 80, stock: 150, gstRate: 18 },
            { sku: "HRD-PAD-LOCK", name: "Godrej Padlock 40mm Double Lock", category: "hardware", purchasePrice: 150, sellingPrice: 240, stock: 8, gstRate: 18 }
        ];

        return new Promise(async (resolve, reject) => {
            try {
                const current = await this.getAllProducts();
                if (current.length === 0) {
                    const transaction = this.db.transaction(["products"], "readwrite");
                    const store = transaction.objectStore("products");
                    for (const p of demoProducts) {
                        store.add(p);
                    }
                    console.log("Database seeded with sample product records.");
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    // --- Reset/Backup ---
    clearDatabase() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["products", "invoices", "users"], "readwrite");
            transaction.objectStore("products").clear();
            transaction.objectStore("invoices").clear();
            transaction.objectStore("users").clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    importDatabase(data) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.clearDatabase();
                const transaction = this.db.transaction(["products", "invoices"], "readwrite");
                const prodStore = transaction.objectStore("products");
                const invStore = transaction.objectStore("invoices");

                if (data.products && Array.isArray(data.products)) {
                    data.products.forEach(p => {
                        delete p.id; // Allow new auto-increment IDs to prevent collisions
                        prodStore.add(p);
                    });
                }
                if (data.invoices && Array.isArray(data.invoices)) {
                    data.invoices.forEach(i => {
                        delete i.id;
                        invStore.add(i);
                    });
                }
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            } catch (err) {
                reject(err);
            }
        });
    }
}

// Instantiate Database Manager
const db = new DBManager();

// ================= PASSWORD HASHING UTILITY =================
// Uses the Web Crypto API (SHA-256) — no external dependencies
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// ================= APPLICATION CORE STATE =================
const AppState = {
    currentUser: null,
    currentCategory: null,  // electrical, plumbing, paint, hardware
    loadedProducts: [],     // Inventory screen cache
    billingProducts: [],    // Autocomplete product cache
    billingCategory: "all", // Current billing category filter
    billingItems: [],       // Current invoice line items
    activeBillingItemId: null, // For tracking which row the product search modal targets
    allInvoices: [],        // Historical invoices
    customers: [],          // Customer directory
    editingCustomerId: null, // Customer being edited
    editingInvoiceId: null  // Invoice being edited (null = new invoice)
};

// ================= DOM ELEMENT REFERENCES =================
const DOM = {
    // Screens
    loginScreen: document.getElementById("login-screen"),
    mainLayout: document.getElementById("main-layout"),
    screens: document.querySelectorAll(".content-screen"),
    
    // Auth & Registration
    loginView: document.getElementById("login-view"),
    registerView: document.getElementById("register-view"),
    goToRegister: document.getElementById("go-to-register"),
    goToLogin: document.getElementById("go-to-login"),
    loginForm: document.getElementById("login-form"),
    usernameInput: document.getElementById("username"),
    passwordInput: document.getElementById("password"),
    loginError: document.getElementById("login-error"),
    logoutBtn: document.getElementById("logout-btn"),
    registerForm: document.getElementById("register-form"),
    regFullname: document.getElementById("reg-fullname"),
    regUsername: document.getElementById("reg-username"),
    regPassword: document.getElementById("reg-password"),
    regRole: document.getElementById("reg-role"),
    registerSuccess: document.getElementById("register-success"),
    registerError: document.getElementById("register-error"),
    
    // Sidebar Nav
    navItems: document.querySelectorAll(".nav-item"),
    categoryItems: document.querySelectorAll(".category-item"),
    
    // Dashboard Stats
    statRevenue: document.getElementById("stat-revenue"),
    statSalesCount: document.getElementById("stat-sales-count"),
    statProducts: document.getElementById("stat-products"),
    statLowStock: document.getElementById("stat-low-stock"),
    badgeElectrical: document.getElementById("badge-electrical"),
    badgePlumbing: document.getElementById("badge-plumbing"),
    badgePaint: document.getElementById("badge-paint"),
    badgeHardware: document.getElementById("badge-hardware"),
    lowStockTableBody: document.getElementById("low-stock-table-body"),
    
    // Inventory Grid
    inventoryTitle: document.getElementById("inventory-title"),
    inventoryGridBody: document.getElementById("inventory-grid-body"),
    inventorySearch: document.getElementById("inventory-search"),
    btnAddInventoryRow: document.getElementById("btn-add-inventory-row"),
    btnExportCSV: document.getElementById("btn-export-csv"),
    btnImportCSV: document.getElementById("btn-import-csv"),
    csvFileInput: document.getElementById("csv-file-input"),
    
    // Billing Counter
    billingHeaderTitle: document.querySelector("#screen-billing .content-header h1"),
    billingGridBody: document.getElementById("billing-grid-body"),
    billingGstToggle: document.getElementById("billing-gst-toggle"),
    btnResetBill: document.getElementById("btn-reset-bill"),
    btnAddBillingRow: document.getElementById("btn-add-billing-row"),
    billCustomerName: document.getElementById("bill-customer-name"),
    billCustomerPhone: document.getElementById("bill-customer-phone"),
    billDatetime: document.getElementById("bill-datetime"),
    billCashReceived: document.getElementById("bill-cash-received"),
    
    // Billing Summary Panel
    summarySubtotal: document.getElementById("summary-subtotal"),
    summaryGstBreakdown: document.getElementById("summary-gst-breakdown"),
    summaryCgst: document.getElementById("summary-cgst"),
    summarySgst: document.getElementById("summary-sgst"),
    summaryGrandTotal: document.getElementById("summary-grand-total"),
    summaryBalance: document.getElementById("summary-balance"),
    btnPrintBill: document.getElementById("btn-print-bill"),
    btnPdfBill: document.getElementById("btn-pdf-bill"),
    btnCompleteSale: document.getElementById("btn-complete-sale"),
    
    // Customers
    custName: document.getElementById("cust-name"),
    custPhone: document.getElementById("cust-phone"),
    custEmail: document.getElementById("cust-email"),
    custAddress: document.getElementById("cust-address"),
    btnSaveCustomer: document.getElementById("btn-save-customer"),
    btnCancelCustomer: document.getElementById("btn-cancel-customer"),
    customerSearch: document.getElementById("customer-search"),
    customersTableBody: document.getElementById("customers-table-body"),
    
    // Product Search Modal
    productSearchModal: document.getElementById("product-search-modal"),
    modalSearchInput: document.getElementById("modal-search-input"),
    modalProductsBody: document.getElementById("modal-products-body"),
    modalResultCount: document.getElementById("modal-result-count"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    btnProductSearch: document.getElementById("btn-product-search"),
    btnQuickSale: document.getElementById("btn-quick-sale"),
    
    // Invoice View Modal
    invoiceViewModal: document.getElementById("invoice-view-modal"),
    viewInvCloseBtn: document.getElementById("view-inv-close-btn"),
    viewInvId: document.getElementById("view-inv-id"),
    viewInvDate: document.getElementById("view-inv-date"),
    viewInvTime: document.getElementById("view-inv-time"),
    viewCustName: document.getElementById("view-cust-name"),
    viewCustPhone: document.getElementById("view-cust-phone"),
    viewInvoiceBody: document.getElementById("view-invoice-body"),
    viewSubtotal: document.getElementById("view-subtotal"),
    viewCgst: document.getElementById("view-cgst"),
    viewSgst: document.getElementById("view-sgst"),
    viewGrandTotal: document.getElementById("view-grand-total"),
    viewGstRows: document.getElementById("view-gst-rows"),
    viewPrintBtn: document.getElementById("view-print-btn"),
    viewPdfBtn: document.getElementById("view-pdf-btn"),
    
    // Invoice History
    invoiceHistorySearch: document.getElementById("invoice-history-search"),
    invoiceDateFrom: document.getElementById("invoice-date-from"),
    invoiceDateTo: document.getElementById("invoice-date-to"),
    btnClearDateFilter: document.getElementById("btn-clear-date-filter"),
    invoicesTableBody: document.getElementById("invoices-table-body"),
    btnExportInvoices: document.getElementById("btn-export-invoices"),
    
    // Database Maintenance
    btnDbExport: document.getElementById("btn-db-export"),
    dbFileInput: document.getElementById("db-file-input"),
    btnDbImport: document.getElementById("btn-db-import"),
    btnDbClear: document.getElementById("btn-db-clear"),
    
    // Printable Invoice elements
    printWrapper: document.getElementById("print-invoice-wrapper"),
    printInvId: document.getElementById("print-inv-id"),
    printInvDate: document.getElementById("print-inv-date"),
    printCustName: document.getElementById("print-cust-name"),
    printCustPhone: document.getElementById("print-cust-phone"),
    printInvoiceBody: document.getElementById("print-invoice-body"),
    printSubtotal: document.getElementById("print-subtotal"),
    printCgst: document.getElementById("print-cgst"),
    printSgst: document.getElementById("print-sgst"),
    printGrandTotal: document.getElementById("print-grand-total"),
    printGstRows: document.getElementById("print-gst-rows")
};

// ================= APP ROUTING AND CONTROLLERS =================
function navigateToScreen(targetId) {
    DOM.screens.forEach(screen => screen.classList.remove("active"));
    
    const targetScreen = document.getElementById(`screen-${targetId}`);
    if (targetScreen) {
        targetScreen.classList.add("active");
    }

    // Highlight navigation menu item
    DOM.navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-target") === targetId) {
            item.classList.add("active");
        }
    });

    // Handle screen-specific controllers
    if (targetId === "dashboard") {
        loadDashboardStats();
    } else if (targetId === "billing") {
        initializeBillingCounter();
    } else if (targetId === "invoices") {
        loadInvoiceHistory();
    } else if (targetId === "customers") {
        loadCustomers();
    }
}

// Navigation Events
DOM.navItems.forEach(item => {
    item.addEventListener("click", () => {
        const target = item.getAttribute("data-target");
        if (target) navigateToScreen(target);
    });
});

DOM.categoryItems.forEach(item => {
    item.addEventListener("click", () => {
        const category = item.getAttribute("data-category");
        openInventoryCategory(category);
    });
});

// Category quick-links from Dashboard
document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
        const category = card.getAttribute("data-category");
        openInventoryCategory(category);
    });
});

function openInventoryCategory(category) {
    AppState.currentCategory = category;
    
    // Set Active State in Navigation
    DOM.navItems.forEach(item => item.classList.remove("active"));
    const activeItem = document.querySelector(`.category-item[data-category="${category}"]`);
    if (activeItem) activeItem.classList.add("active");
    
    // Update Inventory UI title
    const capTitle = category.charAt(0).toUpperCase() + category.slice(1);
    DOM.inventoryTitle.textContent = `${capTitle} Inventory Ledger`;
    
    navigateToScreen("inventory");
    loadInventoryGrid();
}

// ================= AUTHENTICATION MANAGER =================

// Toggle Auth Views
DOM.goToRegister.addEventListener("click", (e) => {
    e.preventDefault();
    DOM.loginView.style.display = "none";
    DOM.registerView.style.display = "block";
    DOM.registerSuccess.style.display = "none";
    DOM.registerError.style.display = "none";
    DOM.registerForm.reset();
});

DOM.goToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    DOM.registerView.style.display = "none";
    DOM.loginView.style.display = "block";
    DOM.loginError.style.display = "none";
    DOM.loginForm.reset();
});

// User Registration Form Handler
DOM.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    DOM.registerSuccess.style.display = "none";
    DOM.registerError.style.display = "none";
    
    const fullname = DOM.regFullname.value.trim();
    const username = DOM.regUsername.value.trim().toLowerCase();
    const password = DOM.regPassword.value;
    const role = DOM.regRole.value;
    
    try {
        const existing = await db.getUserByUsername(username);
        if (existing) {
            DOM.registerError.style.display = "block";
            return;
        }
        
        await db.saveUser({ fullname, username, password, role });
        DOM.registerSuccess.style.display = "block";
        DOM.registerForm.reset();
        
        // Wait 1.5 seconds and return to login screen
        setTimeout(() => {
            DOM.registerView.style.display = "none";
            DOM.loginView.style.display = "block";
            DOM.loginError.style.display = "none";
            DOM.loginForm.reset();
        }, 1500);
        
    } catch (err) {
        console.error("Registration failed:", err);
        alert("Registration failed: " + err.message);
    }
});

// Sign In Form Handler
DOM.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = DOM.usernameInput.value.trim().toLowerCase();
    const password = DOM.passwordInput.value.trim();

    try {
        const user = await db.getUserByUsername(username);
        if (user) {
            const hashedInput = await hashPassword(password);
            let passwordMatch = user.password === hashedInput;
            
            // Detect legacy plaintext password and upgrade it (best-effort)
            if (!passwordMatch && user.password === password && user.password.length !== 64) {
                user.password = await hashPassword(password);
                passwordMatch = true;
                try {
                    await db.updateUser(user);
                    console.log("Legacy password upgraded to hashed format.");
                } catch (upgradeErr) {
                    console.warn("Password upgrade failed, login proceeds:", upgradeErr);
                }
            }
            
            if (passwordMatch) {
                AppState.currentUser = user.username;
                sessionStorage.setItem("ims_logged_in", "true");
                sessionStorage.setItem("ims_user_fullname", user.fullname);
                sessionStorage.setItem("ims_user_role", user.role);
                
                // Update User Metadata in footer
                document.querySelector(".user-avatar").textContent = user.fullname.charAt(0).toUpperCase();
                document.querySelector(".user-name").textContent = user.fullname;
                document.querySelector(".user-role").textContent = user.role + " Operator";

                DOM.loginScreen.classList.remove("active");
                DOM.mainLayout.classList.add("active");
                
                DOM.loginForm.reset();
                DOM.loginError.style.display = "none";
                
                navigateToScreen("dashboard");
                return;
            }
        }
        DOM.loginError.style.display = "block";
    } catch (err) {
        console.error("Login verification failed:", err);
        DOM.loginError.style.display = "block";
    }
});

DOM.logoutBtn.addEventListener("click", () => {
    AppState.currentUser = null;
    sessionStorage.removeItem("ims_logged_in");
    sessionStorage.removeItem("ims_user_fullname");
    sessionStorage.removeItem("ims_user_role");
    DOM.mainLayout.classList.remove("active");
    DOM.loginScreen.classList.add("active");
});

// ================= THEME TOGGLE (DARK MODE) =================
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon"); // moon
const themeIconSun = document.getElementById("theme-icon-sun"); // sun

function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add("dark-mode");
        themeIcon.style.display = "";
        themeIconSun.style.display = "none";
        localStorage.setItem("ims_theme", "dark");
    } else {
        document.documentElement.classList.remove("dark-mode");
        themeIcon.style.display = "none";
        themeIconSun.style.display = "";
        localStorage.setItem("ims_theme", "light");
    }
}

// Load saved theme on startup
const savedTheme = localStorage.getItem("ims_theme");
if (savedTheme === "dark") {
    applyTheme(true);
} else {
    // Default to light, show sun icon
    themeIcon.style.display = "none";
    themeIconSun.style.display = "";
}

themeToggle.addEventListener("click", () => {
    const isDark = !document.documentElement.classList.contains("dark-mode");
    applyTheme(isDark);
});


// Auto login check
function checkAuth() {
    if (sessionStorage.getItem("ims_logged_in") === "true") {
        const fullname = sessionStorage.getItem("ims_user_fullname") || "Administrator";
        const role = sessionStorage.getItem("ims_user_role") || "Admin";
        AppState.currentUser = fullname;
        
        document.querySelector(".user-avatar").textContent = fullname.charAt(0).toUpperCase();
        document.querySelector(".user-name").textContent = fullname;
        document.querySelector(".user-role").textContent = role + " Operator";
        
        DOM.loginScreen.classList.remove("active");
        DOM.mainLayout.classList.add("active");
        navigateToScreen("dashboard");
    } else {
        DOM.loginScreen.classList.add("active");
    }
}

// ================= DASHBOARD CONTROLLER =================
async function loadDashboardStats() {
    try {
        const allProds = await db.getAllProducts();
        const allInvs = await db.getAllInvoices();
        
        // Count products and category items
        DOM.statProducts.textContent = allProds.length;
        
        const counts = { electrical: 0, plumbing: 0, paint: 0, hardware: 0 };
        let lowStockCount = 0;
        const lowStockItems = [];

        allProds.forEach(p => {
            if (counts.hasOwnProperty(p.category)) {
                counts[p.category]++;
            }
            if (p.stock < 10) {
                lowStockCount++;
                lowStockItems.push(p);
            }
        });

        DOM.badgeElectrical.textContent = `${counts.electrical} items`;
        DOM.badgePlumbing.textContent = `${counts.plumbing} items`;
        DOM.badgePaint.textContent = `${counts.paint} items`;
        DOM.badgeHardware.textContent = `${counts.hardware} items`;
        
        DOM.statLowStock.textContent = lowStockCount;

        // Render low stock warning table
        DOM.lowStockTableBody.innerHTML = "";
        if (lowStockItems.length === 0) {
            DOM.lowStockTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No low stock items! Fully stocked.</td></tr>`;
        } else {
            lowStockItems.forEach(item => {
                const tr = document.createElement("tr");
                const statusClass = item.stock === 0 ? "empty" : "low";
                const statusLabel = item.stock === 0 ? "OUT OF STOCK" : `${item.stock} LEFT`;
                
                tr.innerHTML = `
                    <td class="col-mono">${item.sku}</td>
                    <td>${item.name}</td>
                    <td><span class="badge">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</span></td>
                    <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
                `;
                DOM.lowStockTableBody.appendChild(tr);
            });
        }

        // Compute revenue generated today
        const todayStr = new Date().toISOString().split("T")[0];
        let todayRevenue = 0;
        let todaySalesCount = 0;

        allInvs.forEach(inv => {
            if (inv.date === todayStr) {
                todayRevenue += inv.total;
                todaySalesCount++;
            }
        });

        DOM.statRevenue.textContent = `₹${todayRevenue.toFixed(2)}`;
        DOM.statSalesCount.textContent = `${todaySalesCount} bill(s) generated today`;

    } catch (err) {
        console.error("Error loading dashboard stats:", err);
    }
}

// ================= EXCEL INVENTORY GRID =================
async function loadInventoryGrid() {
    try {
        const category = AppState.currentCategory;
        const products = await db.getProductsByCategory(category);
        AppState.loadedProducts = JSON.parse(JSON.stringify(products)); // Deep clone cache
        renderInventoryRows();
    } catch (err) {
        console.error("Error loading inventory ledger:", err);
    }
}

function renderInventoryRows() {
    const tbody = DOM.inventoryGridBody;
    tbody.innerHTML = "";
    const query = DOM.inventorySearch.value.toLowerCase().trim();
    
    const filtered = AppState.loadedProducts.filter(item => {
        return item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No items in this catalog. Click "Add Row" to append products.</td></tr>`;
        return;
    }

    filtered.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", item.id || "");
        tr.setAttribute("data-index", index);
        
        tr.innerHTML = `
            <td class="text-muted text-center" style="padding: 10px 12px;">${index + 1}</td>
            <td><input type="text" class="grid-input col-mono sku-input" value="${item.sku || ""}"></td>
            <td><input type="text" class="grid-input name-input" value="${item.name || ""}"></td>
            <td><input type="number" step="0.01" min="0" class="grid-input text-right col-mono purchase-input" value="${parseFloat(item.purchasePrice || 0).toFixed(2)}"></td>
            <td><input type="number" step="0.01" min="0" class="grid-input text-right col-mono selling-input" value="${parseFloat(item.sellingPrice || 0).toFixed(2)}"></td>
            <td><input type="number" step="1" min="0" class="grid-input text-right col-mono stock-input" value="${item.stock || 0}"></td>
            <td><input type="number" step="0.1" min="0" class="grid-input text-right col-mono gst-input" value="${item.gstRate || 0}"></td>
            <td class="action-buttons-cell" style="padding: 4px 6px;">
                <button class="btn btn-icon btn-logout btn-delete-row" title="Delete Row" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </td>
        `;
        
        // Save database on input change or blur
        const saveProductRow = () => {
            const skuVal = tr.querySelector(".sku-input").value.trim();
            const nameVal = tr.querySelector(".name-input").value.trim();
            const purchaseVal = parseFloat(tr.querySelector(".purchase-input").value) || 0;
            const sellingVal = parseFloat(tr.querySelector(".selling-input").value) || 0;
            const stockVal = parseInt(tr.querySelector(".stock-input").value) || 0;
            const gstVal = parseFloat(tr.querySelector(".gst-input").value) || 0;

            // Update local item
            item.sku = skuVal;
            item.name = nameVal;
            item.purchasePrice = purchaseVal;
            item.sellingPrice = sellingVal;
            item.stock = stockVal;
            item.gstRate = gstVal;

            db.saveProduct(item).then((savedId) => {
                if (!item.id) item.id = savedId;
                loadDashboardStats(); // Refresh dashboard counters in background
            }).catch(err => {
                console.error("Auto save failed:", err);
            });
        };

        tr.querySelectorAll(".grid-input").forEach(input => {
            input.addEventListener("blur", saveProductRow);
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    input.blur();
                }
            });
        });

        // Delete Row trigger
        tr.querySelector(".btn-delete-row").addEventListener("click", async (e) => {
            const indexToDelete = e.currentTarget.getAttribute("data-index");
            const prod = AppState.loadedProducts[indexToDelete];
            if (confirm(`Are you sure you want to delete "${prod.name || 'this item'}"?`)) {
                if (prod.id) {
                    await db.deleteProduct(prod.id);
                }
                AppState.loadedProducts.splice(indexToDelete, 1);
                renderInventoryRows();
                loadDashboardStats(); // Refresh badges
            }
        });

        tbody.appendChild(tr);
    });
}



// Add blank row
DOM.btnAddInventoryRow.addEventListener("click", () => {
    const newProduct = {
        sku: "SKU-" + Math.floor(Math.random() * 900000 + 100000),
        name: "",
        category: AppState.currentCategory,
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        gstRate: 18
    };

    AppState.loadedProducts.push(newProduct);
    renderInventoryRows();

    // Focus the Name field of the last row
    setTimeout(() => {
        const rows = DOM.inventoryGridBody.querySelectorAll("tr");
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
            const nameInput = lastRow.querySelector('.name-input');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }
    }, 100);
});


DOM.inventorySearch.addEventListener("input", renderInventoryRows);

// --- CSV Import/Export Operations ---
DOM.btnExportCSV.addEventListener("click", () => {
    const category = AppState.currentCategory;
    const items = AppState.loadedProducts;
    if (items.length === 0) {
        alert("No inventory records found to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,SKU,Product Name,Purchase Price,Selling Price,Stock,GST Rate\n";
    items.forEach(p => {
        csvContent += `"${p.sku}","${p.name.replace(/"/g, '""')}",${p.purchasePrice},${p.sellingPrice},${p.stock},${p.gstRate}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IMS_Inventory_${category}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

DOM.btnImportCSV.addEventListener("click", () => {
    DOM.csvFileInput.click();
});

DOM.csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
        
        let importCount = 0;
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple comma split, stripping wrapping quotes
            const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
            if (cols.length >= 6) {
                const sku = cols[0].replace(/"/g, "").trim();
                const name = cols[1].replace(/"/g, "").trim();
                const purchasePrice = parseFloat(cols[2]) || 0;
                const sellingPrice = parseFloat(cols[3]) || 0;
                const stock = parseInt(cols[4]) || 0;
                const gstRate = parseFloat(cols[5]) || 0;

                const product = {
                    sku, name, purchasePrice, sellingPrice, stock, gstRate,
                    category: AppState.currentCategory
                };

                await db.saveProduct(product);
                importCount++;
            }
        }

        alert(`Successfully imported ${importCount} products into this category!`);
        DOM.csvFileInput.value = "";
        loadInventoryGrid();
        loadDashboardStats();
    };
    reader.readAsText(file);
});


// ================= BILLING COUNTER CONTROLLER =================
async function initializeBillingCounter() {
    try {
        // Reset billing header title (clears "Editing Invoice" indicator)
        if (DOM.billingHeaderTitle) {
            DOM.billingHeaderTitle.textContent = "IMS Billing Counter";
        }
        
        // Load all active inventory products for product autocompletes
        AppState.billingProducts = await db.getAllProducts();
        
        // Reset customer header fields
        DOM.billCustomerName.value = "";
        DOM.billCustomerPhone.value = "";
        DOM.billCashReceived.value = "";
        // Set datetime-local to current date and time
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        DOM.billDatetime.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        
        // Reset billing category filter to All
        AppState.billingCategory = "all";
        document.querySelectorAll(".billing-cat-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-bill-cat") === "all");
        });
        
        // Initialize with one blank row
        AppState.billingItems = [];
        addBlankBillingRow();
        recalculateBillTotals();
        
        // Load recent invoices for the billing screen history panel
        // Fetch fresh from database to ensure data appears even on first visit
        try {
            const allInv = await db.getAllInvoices();
            AppState.allInvoices = allInv.reverse();
        } catch (e) {}
        loadRecentBillingHistory();
        
    } catch (err) {
        console.error("Error loading billing setup:", err);
    }
}

// Billing Category Filter Events
document.querySelectorAll(".billing-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cat = btn.getAttribute("data-bill-cat");
        AppState.billingCategory = cat;
        document.querySelectorAll(".billing-cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        // Re-render rows so autocomplete dropdowns use the new filter
        renderBillingRows();
    });
});

// Listen to GST Toggle switches
DOM.billingGstToggle.addEventListener("change", () => {
    const isGstEnabled = DOM.billingGstToggle.checked;
    
    // Toggle GST Columns visibility in the billing sheet
    document.querySelectorAll(".gst-column").forEach(el => {
        el.style.display = isGstEnabled ? "" : "none";
    });
    
    // Toggle GST Display elements in Summary
    DOM.summaryGstBreakdown.style.display = isGstEnabled ? "" : "none";
    
    recalculateBillTotals();
});

function addBlankBillingRow() {
    const newItem = {
        id: Date.now() + Math.random(),
        productId: null,
        name: "",
        sku: "",
        rate: 0,
        qty: 0,
        gstRate: 0
    };
    
    AppState.billingItems.push(newItem);
    renderBillingRows();
}

function renderBillingRows() {
    const tbody = DOM.billingGridBody;
    tbody.innerHTML = "";
    const isGstEnabled = DOM.billingGstToggle.checked;

    AppState.billingItems.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", item.id);
        
        const lineTotal = item.rate * item.qty;
        const gstAmount = lineTotal * (item.gstRate / 100);

        // Compute stock display badge for selected product
        const stockHtml = (() => {
            const prod = item.productId ? AppState.billingProducts.find(p => p.id === item.productId) : null;
            if (prod) {
                const cls = prod.stock === 0 ? "empty" : prod.stock < 10 ? "low" : "ok";
                const label = prod.stock === 0 ? "OUT" : prod.stock;
                return `<span class="badge-status ${cls}">${label}</span>`;
            }
            return `<span class="text-muted">-</span>`;
        })();

        tr.innerHTML = `
            <td class="text-muted text-center">${index + 1}</td>
            
            <!-- Product autocomplete cell -->
            <td style="position: relative;">
                <div class="autocomplete-wrapper">
                    <input type="text" class="autocomplete-input" placeholder="Type product name..." value="${item.name}" style="padding-right: 30px;">
                    <div class="autocomplete-dropdown" style="display: none;"></div>
                </div>
                <button class="btn btn-icon btn-search-product-row" title="Search Products (F3)" data-id="${item.id}" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); padding: 4px; background: transparent; border: none; cursor: pointer; color: var(--text-muted); z-index: 2;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
            </td>
            
            <td style="position: relative;">
                <div class="autocomplete-wrapper">
                    <input type="text" class="cell-editor col-mono sku-input" value="${item.sku}" placeholder="Type SKU...">
                    <div class="autocomplete-dropdown" style="display: none;"></div>
                </div>
            </td>
            
            <!-- Stock Cell -->
            <td class="text-center">
                ${stockHtml}
            </td>
            
            <!-- Rate Cell (editable in case of discount override) -->
            <td>
                <input type="number" class="cell-editor text-right rate-input col-mono" value="${item.rate}" step="0.01" min="0">
            </td>
            
            <!-- Quantity Cell -->
            <td>
                <input type="number" class="cell-editor text-right qty-input col-mono" value="${item.qty}" min="0">
            </td>
            
            <td class="col-mono text-right font-weight-bold" style="padding: 10px 12px;">₹${lineTotal.toFixed(2)}</td>
            
            <!-- GST % -->
            <td class="col-mono text-right gst-column" style="display: ${isGstEnabled ? '' : 'none'};">${item.gstRate}%</td>
            
            <!-- GST Amount -->
            <td class="col-mono text-right gst-column" style="display: ${isGstEnabled ? '' : 'none'};">₹${gstAmount.toFixed(2)}</td>
            
            <td class="action-buttons-cell">
                <button class="btn btn-icon btn-logout btn-delete-billing-row" title="Delete" data-id="${item.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </td>
        `;

        // Track which billing row is focused for the product search modal
        const trackFocus = () => trackBillingRowFocus(item.id);

        // Add events to Autocomplete
        const autoInput = tr.querySelector(".autocomplete-input");
        const autoDropdown = tr.querySelector(".autocomplete-dropdown");
        autoInput.addEventListener("focus", trackFocus);
        
        autoInput.addEventListener("input", (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) {
                autoDropdown.style.display = "none";
                return;
            }

            const matches = AppState.billingProducts.filter(p => {
                const catMatch = AppState.billingCategory === "all" || p.category === AppState.billingCategory;
                return catMatch && (p.name.toLowerCase().includes(val) || p.sku.toLowerCase().includes(val));
            });

            if (matches.length === 0) {
                autoDropdown.innerHTML = `<div class="autocomplete-item text-muted">No products found</div>`;
            } else {
                autoDropdown.innerHTML = "";
                matches.slice(0, 5).forEach(prod => {
                    const div = document.createElement("div");
                    div.className = "autocomplete-item";
                    const stockClass = prod.stock === 0 ? "empty" : prod.stock < 10 ? "low" : "ok";
                    const catLabel = prod.category.charAt(0).toUpperCase() + prod.category.slice(1);
                    div.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-weight: 500;">${prod.name}</span>
                            <span class="stock-info">
                                <span class="cat-badge">${catLabel}</span>
                                <span>${prod.sku}</span>
                                <span class="stock-qty ${stockClass}">${prod.stock} in stock</span>
                            </span>
                        </div>
                    `;
                    
                    div.addEventListener("mousedown", () => {
                        // Select product
                        item.productId = prod.id;
                        item.name = prod.name;
                        item.sku = prod.sku;
                        item.rate = prod.sellingPrice;
                        item.gstRate = prod.gstRate;
                        item.qty = item.qty || 1; // Default to 1 if 0
                        
                        renderBillingRows();
                        recalculateBillTotals();
                    });

                    autoDropdown.appendChild(div);
                });
            }
            autoDropdown.style.display = "block";
        });

        autoInput.addEventListener("blur", () => {
            setTimeout(() => {
                autoDropdown.style.display = "none";
                // Auto-fetch product if exact SKU or exact name match
                const val = autoInput.value.trim();
                if (val && !item.productId) {
                    const exactMatch = AppState.billingProducts.find(p =>
                        p.sku === val || p.name.toLowerCase() === val.toLowerCase()
                    );
                    if (exactMatch) {
                        item.productId = exactMatch.id;
                        item.name = exactMatch.name;
                        item.sku = exactMatch.sku;
                        item.rate = exactMatch.sellingPrice;
                        item.gstRate = exactMatch.gstRate;
                        item.qty = item.qty || 1;
                        renderBillingRows();
                        recalculateBillTotals();
                    }
                }
            }, 200);
        });

        // Also handle direct enter key for name/SKU lookup
        autoInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const val = autoInput.value.trim();
                if (val) {
                    const exactMatch = AppState.billingProducts.find(p =>
                        p.sku === val || p.name.toLowerCase() === val.toLowerCase()
                    );
                    if (exactMatch) {
                        item.productId = exactMatch.id;
                        item.name = exactMatch.name;
                        item.sku = exactMatch.sku;
                        item.rate = exactMatch.sellingPrice;
                        item.gstRate = exactMatch.gstRate;
                        item.qty = item.qty || 1;
                        autoDropdown.style.display = "none";
                        renderBillingRows();
                        recalculateBillTotals();
                    }
                }
            }
        });

        // SKU input with autocomplete & auto-fetch product data
        const skuInput = tr.querySelector(".sku-input");
        const skuDropdown = tr.querySelector(".sku-input + .autocomplete-dropdown");
        skuInput.addEventListener("focus", trackFocus);

        skuInput.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            if (!val) {
                skuDropdown.style.display = "none";
                return;
            }

            const matches = AppState.billingProducts.filter(p => {
                const catMatch = AppState.billingCategory === "all" || p.category === AppState.billingCategory;
                return catMatch && p.sku.toLowerCase().includes(val.toLowerCase());
            });

            if (matches.length === 0) {
                skuDropdown.innerHTML = `<div class="autocomplete-item text-muted">No products found</div>`;
            } else {
                skuDropdown.innerHTML = "";
                matches.slice(0, 5).forEach(prod => {
                    const div = document.createElement("div");
                    div.className = "autocomplete-item";
                    const stockClass = prod.stock === 0 ? "empty" : prod.stock < 10 ? "low" : "ok";
                    const catLabel = prod.category.charAt(0).toUpperCase() + prod.category.slice(1);
                    div.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                            <span style="font-weight: 500;">${prod.name}</span>
                            <span class="stock-info">
                                <span class="cat-badge">${catLabel}</span>
                                <span>${prod.sku}</span>
                                <span class="stock-qty ${stockClass}">${prod.stock} in stock</span>
                            </span>
                        </div>
                    `;

                    div.addEventListener("mousedown", () => {
                        item.productId = prod.id;
                        item.name = prod.name;
                        item.sku = prod.sku;
                        item.rate = prod.sellingPrice;
                        item.gstRate = prod.gstRate;
                        item.qty = item.qty || 1;
                        renderBillingRows();
                        recalculateBillTotals();
                    });

                    skuDropdown.appendChild(div);
                });
            }
            skuDropdown.style.display = "block";
        });

        skuInput.addEventListener("blur", () => {
            setTimeout(() => {
                skuDropdown.style.display = "none";
                // Auto-fetch product if exact SKU match
                const skuVal = skuInput.value.trim();
                if (skuVal && !item.productId) {
                    const exactMatch = AppState.billingProducts.find(p => p.sku === skuVal);
                    if (exactMatch) {
                        item.productId = exactMatch.id;
                        item.name = exactMatch.name;
                        item.sku = exactMatch.sku;
                        item.rate = exactMatch.sellingPrice;
                        item.gstRate = exactMatch.gstRate;
                        item.qty = item.qty || 1;
                        renderBillingRows();
                        recalculateBillTotals();
                    }
                }
            }, 200);
        });

        // Also handle direct enter key for SKU lookup
        skuInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const skuVal = skuInput.value.trim();
                if (skuVal) {
                    const exactMatch = AppState.billingProducts.find(p => p.sku === skuVal);
                    if (exactMatch) {
                        item.productId = exactMatch.id;
                        item.name = exactMatch.name;
                        item.sku = exactMatch.sku;
                        item.rate = exactMatch.sellingPrice;
                        item.gstRate = exactMatch.gstRate;
                        item.qty = item.qty || 1;
                        skuDropdown.style.display = "none";
                        renderBillingRows();
                        recalculateBillTotals();
                    }
                }
            }
        });

        // Determine category for row coloring (look up the product if selected)
        let rowCat = "";
        if (item.productId) {
            const prod = AppState.billingProducts.find(p => p.id === item.productId);
            if (prod) rowCat = prod.category;
        }
        if (rowCat) {
            tr.classList.add(`cat-${rowCat}`);
        }

        // Add events to rate override
        const rateInput = tr.querySelector(".rate-input");
        rateInput.addEventListener("focus", trackFocus);
        rateInput.addEventListener("change", (e) => {
            item.rate = parseFloat(e.target.value) || 0;
            renderBillingRows();
            recalculateBillTotals();
        });

        // Add events to qty
        const qtyInput = tr.querySelector(".qty-input");
        qtyInput.addEventListener("focus", trackFocus);
        qtyInput.addEventListener("change", (e) => {
            const originalQty = item.qty;
            const newQty = parseInt(e.target.value) || 0;
            
            // Validate stock limits if selecting product
            if (item.productId) {
                const product = AppState.billingProducts.find(p => p.id === item.productId);
                if (product && newQty > product.stock) {
                    alert(`Warning: Only ${product.stock} items remaining in ${product.category} stock database. Entered quantity exceeds current inventory.`);
                }
            }

            item.qty = newQty;
            renderBillingRows();
            recalculateBillTotals();
        });

        // Delete Row event
        tr.querySelector(".btn-delete-billing-row").addEventListener("click", () => {
            AppState.billingItems = AppState.billingItems.filter(b => b.id !== item.id);
            if (AppState.billingItems.length === 0) {
                addBlankBillingRow();
            } else {
                renderBillingRows();
                recalculateBillTotals();
            }
        });

        // Product Search button in row — opens the product search modal targeting this row
        tr.querySelector(".btn-search-product-row").addEventListener("click", (e) => {
            e.preventDefault();
            trackBillingRowFocus(item.id);
            openProductSearchModal();
        });

        tbody.appendChild(tr);
    });
}

// Load an existing invoice into the billing counter for editing
async function loadInvoiceForEditing(invoice) {
    // Store the invoice database ID for later update
    AppState.editingInvoiceId = invoice.id;
    
    // Load all products for autocomplete (awaited so stock badges render correctly)
    AppState.billingProducts = await db.getAllProducts();
    
    // Populate customer fields
    DOM.billCustomerName.value = invoice.customerName === "Walk-in Customer" ? "" : invoice.customerName;
    DOM.billCustomerPhone.value = invoice.customerPhone === "-" ? "" : invoice.customerPhone;
    
    // Set date/time
    if (invoice.datetime) {
        DOM.billDatetime.value = invoice.datetime;
    } else {
        const pad = (n) => String(n).padStart(2, "0");
        const now = new Date();
        DOM.billDatetime.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    
    // Set GST toggle based on saved invoice
    DOM.billingGstToggle.checked = invoice.gstEnabled !== false;
    // Trigger toggle display change
    const isGstEnabled = DOM.billingGstToggle.checked;
    document.querySelectorAll(".gst-column").forEach(el => {
        el.style.display = isGstEnabled ? "" : "none";
    });
    DOM.summaryGstBreakdown.style.display = isGstEnabled ? "" : "none";
    
    // Load line items
    AppState.billingItems = [];
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => {
            AppState.billingItems.push({
                id: Date.now() + Math.random(),
                productId: item.productId || null,
                name: item.name || "",
                sku: item.sku || "",
                rate: item.rate || 0,
                qty: item.qty || 0,
                gstRate: item.gstRate || 0
            });
        });
    }
    
    // Set billing category filter to All
    AppState.billingCategory = "all";
    document.querySelectorAll(".billing-cat-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-bill-cat") === "all");
    });
    
    renderBillingRows();
    recalculateBillTotals();
    
    // Manually switch to billing screen WITHOUT calling initializeBillingCounter (which would reset everything)
    DOM.screens.forEach(screen => screen.classList.remove("active"));
    document.getElementById("screen-billing").classList.add("active");
    DOM.navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-target") === "billing") item.classList.add("active");
    });
    
    // Show a subtle indicator that we're in edit mode
    if (DOM.billingHeaderTitle) {
        DOM.billingHeaderTitle.textContent = "IMS Billing Counter (Editing Invoice)";
    }
}

// Add Row button billing
DOM.btnAddBillingRow.addEventListener("click", addBlankBillingRow);

// Reset Invoice
DOM.btnResetBill.addEventListener("click", () => {
    if (confirm("Reset current transaction fields? This deletes all current lines.")) {
        AppState.editingInvoiceId = null;
        initializeBillingCounter();
    }
});

function recalculateBillTotals() {
    let subtotal = 0;
    let totalGst = 0;
    const isGstEnabled = DOM.billingGstToggle.checked;

    AppState.billingItems.forEach(item => {
        const itemTotal = item.rate * item.qty;
        subtotal += itemTotal;
        if (isGstEnabled) {
            totalGst += itemTotal * (item.gstRate / 100);
        }
    });

    const grandTotal = subtotal + totalGst;
    
    // Update summary labels
    DOM.summarySubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    
    if (isGstEnabled) {
        const cgst = totalGst / 2;
        const sgst = totalGst / 2;
        DOM.summaryCgst.textContent = `₹${cgst.toFixed(2)}`;
        DOM.summarySgst.textContent = `₹${sgst.toFixed(2)}`;
    } else {
        DOM.summaryCgst.textContent = `₹0.00`;
        DOM.summarySgst.textContent = `₹0.00`;
    }

    DOM.summaryGrandTotal.textContent = `₹${grandTotal.toFixed(2)}`;
    
    // Recalculate Balance Change
    const cash = parseFloat(DOM.billCashReceived.value) || 0;
    if (cash > 0) {
        const balance = cash - grandTotal;
        DOM.summaryBalance.textContent = `₹${balance.toFixed(2)}`;
        if (balance < 0) {
            DOM.summaryBalance.style.color = "var(--accent-rose)";
        } else {
            DOM.summaryBalance.style.color = "var(--accent-emerald)";
        }
    } else {
        DOM.summaryBalance.textContent = `₹0.00`;
        DOM.summaryBalance.style.color = "";
    }
    
    // Update payment status indicator
    const paymentStatus = document.getElementById("payment-status");
    if (paymentStatus) {
        const grandTotalVal = parseFloat(DOM.summaryGrandTotal.textContent.replace("₹", "")) || 0;
        const cashVal = parseFloat(DOM.billCashReceived.value) || 0;
        if (grandTotalVal > 0 && cashVal >= grandTotalVal) {
            paymentStatus.style.display = "flex";
        } else {
            paymentStatus.style.display = "none";
        }
    }
}

DOM.billCashReceived.addEventListener("input", recalculateBillTotals);

// Billing phone lookup — auto-fill customer name from existing record
DOM.billCustomerPhone.addEventListener("blur", async () => {
    const phone = DOM.billCustomerPhone.value.trim();
    if (!phone) return;
    try {
        const matches = await db.getCustomerByPhone(phone);
        if (matches && matches.length > 0) {
            DOM.billCustomerName.value = matches[0].name;
        }
    } catch (err) {
        // Silently fail — not critical
    }
});

// ================= QUICK PRODUCT SEARCH MODAL =================
// Track the last focused billing item so the modal targets the right row
function trackBillingRowFocus(itemId) {
    AppState.activeBillingItemId = itemId;
}

function openProductSearchModal() {
    const billingScreen = document.getElementById("screen-billing");
    if (!billingScreen || !billingScreen.classList.contains("active")) return;
    
    // If no active item, target the first blank row
    if (!AppState.activeBillingItemId || !AppState.billingItems.find(i => i.id === AppState.activeBillingItemId)) {
        const blankItem = AppState.billingItems.find(i => !i.productId);
        if (blankItem) AppState.activeBillingItemId = blankItem.id;
    }
    
    renderModalProducts();
    DOM.productSearchModal.style.display = "flex";
    setTimeout(() => DOM.modalSearchInput.focus(), 100);
}

function closeProductSearchModal() {
    DOM.productSearchModal.style.display = "none";
    DOM.modalSearchInput.value = "";
}

function renderModalProducts() {
    const query = DOM.modalSearchInput.value.toLowerCase().trim();
    const products = AppState.billingProducts;
    
    const filtered = query
        ? products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
          )
        : products;
    
    DOM.modalResultCount.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    
    const tbody = DOM.modalProductsBody;
    tbody.innerHTML = "";
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 30px;">No products found matching "${query}"</td></tr>`;
        return;
    }
    
    // Sort: low stock items first for quick identification
    filtered.sort((a, b) => {
        if (a.stock === 0 && b.stock !== 0) return -1;
        if (a.stock !== 0 && b.stock === 0) return 1;
        if (a.stock < 10 && b.stock >= 10) return -1;
        if (a.stock >= 10 && b.stock < 10) return 1;
        return a.name.localeCompare(b.name);
    });
    
    filtered.forEach((prod, index) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-product-id", prod.id);
        
        const stockCls = prod.stock === 0 ? "empty" : prod.stock < 10 ? "low" : "ok";
        const stockLabel = prod.stock === 0 ? "OUT" : prod.stock;
        const catClass = prod.category;
        const catLabel = prod.category.charAt(0).toUpperCase() + prod.category.slice(1);
        
        tr.innerHTML = `
            <td class="text-center text-muted">${index + 1}</td>
            <td class="col-mono" style="font-size: 13px;">${prod.sku}</td>
            <td style="font-weight: 500;">${prod.name}</td>
            <td><span class="cat-badge-sm ${catClass}">${catLabel}</span></td>
            <td class="col-mono">₹${prod.sellingPrice.toFixed(2)}</td>
            <td><span class="badge-status ${stockCls}">${stockLabel}</span></td>
        `;
        
        tr.addEventListener("dblclick", () => selectModalProduct(prod.id));
        tr.addEventListener("click", () => {
            // Remove previous selection
            tbody.querySelectorAll("tr.selected").forEach(r => r.classList.remove("selected"));
            tr.classList.add("selected");
        });
        
        tbody.appendChild(tr);
    });
}

function selectModalProduct(productId) {
    const prod = AppState.billingProducts.find(p => p.id === productId);
    if (!prod) return;
    
    // Find the target billing item (active row or first blank row)
    let targetItem = AppState.billingItems.find(i => i.id === AppState.activeBillingItemId);
    if (!targetItem) {
        targetItem = AppState.billingItems.find(i => !i.productId);
    }
    if (!targetItem) {
        // Add a new row
        addBlankBillingRow();
        targetItem = AppState.billingItems[AppState.billingItems.length - 1];
    }
    
    targetItem.productId = prod.id;
    targetItem.name = prod.name;
    targetItem.sku = prod.sku;
    targetItem.rate = prod.sellingPrice;
    targetItem.gstRate = prod.gstRate;
    targetItem.qty = targetItem.qty || 1;
    
    closeProductSearchModal();
    renderBillingRows();
    recalculateBillTotals();
}

// Modal events
DOM.modalSearchInput.addEventListener("input", renderModalProducts);
DOM.modalCloseBtn.addEventListener("click", closeProductSearchModal);
DOM.btnProductSearch.addEventListener("click", openProductSearchModal);

// Close modal on overlay click
DOM.productSearchModal.addEventListener("click", (e) => {
    if (e.target === DOM.productSearchModal) closeProductSearchModal();
});

// Keyboard navigation inside modal
DOM.modalSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeProductSearchModal();
        return;
    }
    if (e.key === "Enter") {
        e.preventDefault();
        const selected = DOM.modalProductsBody.querySelector("tr.selected");
        if (selected) {
            selectModalProduct(selected.getAttribute("data-product-id"));
        } else {
            // Select first visible row
            const firstRow = DOM.modalProductsBody.querySelector("tr");
            if (firstRow && firstRow.cells.length > 1) {
                selectModalProduct(firstRow.getAttribute("data-product-id"));
            }
        }
        return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const rows = DOM.modalProductsBody.querySelectorAll("tr");
        if (rows.length === 0) return;
        
        let currentIdx = -1;
        rows.forEach((r, i) => { if (r.classList.contains("selected")) currentIdx = i; });
        
        let nextIdx;
        if (e.key === "ArrowDown") nextIdx = Math.min(currentIdx + 1, rows.length - 1);
        else nextIdx = Math.max(currentIdx - 1, 0);
        
        rows.forEach(r => r.classList.remove("selected"));
        rows[nextIdx].classList.add("selected");
        rows[nextIdx].scrollIntoView({ block: "nearest" });
    }
});

// ================= INVOICE VIEW MODAL =================
// Track the invoice being viewed (for Print/PDF action buttons)
let _viewInvoiceData = null;

// Opens a read-only modal showing full invoice details with Print/PDF actions
function openInvoiceViewModal(invoice) {
    _viewInvoiceData = invoice;
    
    // Populate invoice metadata
    DOM.viewInvId.textContent = invoice.invoiceId || "-";
    DOM.viewInvDate.textContent = invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN") : "-";
    
    // Format time in 12-hour format
    if (invoice.time) {
        const [h, m] = invoice.time.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        DOM.viewInvTime.textContent = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    } else {
        DOM.viewInvTime.textContent = "--";
    }
    
    DOM.viewCustName.textContent = invoice.customerName || "Walk-in Customer";
    DOM.viewCustPhone.textContent = invoice.customerPhone || "-";

    // Populate line items
    DOM.viewInvoiceBody.innerHTML = "";
    const items = invoice.items || [];
    if (items.length === 0) {
        DOM.viewInvoiceBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 20px;">No items in this invoice.</td></tr>`;
    } else {
        items.forEach((item, index) => {
            const row = document.createElement("tr");
            const total = (item.rate || 0) * (item.qty || 0);
            const gstVal = total * ((item.gstRate || 0) / 100);
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.name || ""}</td>
                <td class="col-mono">${(item.rate || 0).toFixed(2)}</td>
                <td class="col-mono">${item.qty || 0}</td>
                <td class="col-mono view-gst-col">${item.gstRate || 0}%</td>
                <td class="col-mono view-gst-col">${gstVal.toFixed(2)}</td>
                <td class="col-mono text-right">${total.toFixed(2)}</td>
            `;
            DOM.viewInvoiceBody.appendChild(row);
        });
    }

    // Show/hide GST columns
    const isGstEnabled = invoice.gstEnabled !== false;
    document.querySelectorAll(".view-gst-col").forEach(el => {
        el.style.display = isGstEnabled ? "" : "none";
    });
    DOM.viewGstRows.style.display = isGstEnabled ? "" : "none";

    // Populate totals
    DOM.viewSubtotal.textContent = `₹${(invoice.subtotal || 0).toFixed(2)}`;
    if (isGstEnabled) {
        DOM.viewCgst.textContent = `₹${((invoice.gstTax || 0) / 2).toFixed(2)}`;
        DOM.viewSgst.textContent = `₹${((invoice.gstTax || 0) / 2).toFixed(2)}`;
    } else {
        DOM.viewCgst.textContent = `₹0.00`;
        DOM.viewSgst.textContent = `₹0.00`;
    }
    DOM.viewGrandTotal.textContent = `₹${(invoice.total || 0).toFixed(2)}`;

    // Show modal
    DOM.invoiceViewModal.style.display = "flex";
    // Focus the modal content for keyboard events
    DOM.invoiceViewModal.querySelector(".modal-content").focus();
}

function closeInvoiceViewModal() {
    DOM.invoiceViewModal.style.display = "none";
    _viewInvoiceData = null;
}

// Invoice View Modal events
DOM.viewInvCloseBtn.addEventListener("click", closeInvoiceViewModal);

// Close on overlay click
DOM.invoiceViewModal.addEventListener("click", (e) => {
    if (e.target === DOM.invoiceViewModal) closeInvoiceViewModal();
});

// Print from view modal
DOM.viewPrintBtn.addEventListener("click", () => {
    const inv = _viewInvoiceData;
    if (inv) {
        closeInvoiceViewModal();
        reprintSelectedInvoice(inv);
    }
});

// PDF from view modal
DOM.viewPdfBtn.addEventListener("click", () => {
    const inv = _viewInvoiceData;
    if (inv) {
        closeInvoiceViewModal();
        downloadPDFInvoice(inv);
    }
});

// Escape key to close (on document level for reliable focus)
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && DOM.invoiceViewModal.style.display === "flex") {
        closeInvoiceViewModal();
    }
});


// ================= BILLING SCREEN RECENT TRANSACTIONS =================
function loadRecentBillingHistory() {
    const recentBody = document.getElementById("billing-recent-body-rows");
    const recentTable = document.getElementById("billing-recent-table");
    const recentEmpty = document.querySelector(".billing-recent-empty");
    const recentCount = document.getElementById("billing-recent-count");
    
    if (!recentBody) return;
    
    // Get search query
    const searchInput = document.getElementById("bill-history-search");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    // Get ALL invoices from AppState (not just latest 8)
    const invoices = AppState.allInvoices.length > 0 ? AppState.allInvoices : [];
    
    // Filter by search query
    const filtered = query ? invoices.filter(inv => {
        const invId = (inv.invoiceId || "").toLowerCase();
        const custName = (inv.customerName || "").toLowerCase();
        const custPhone = (inv.customerPhone || "");
        return invId.includes(query) || custName.includes(query) || custPhone.includes(query);
    }) : invoices;
    
    // Sort by current sort state
    var sortCol = billingSortState.column;
    var sortAsc = billingSortState.ascending;
    filtered.sort(function(a, b) {
        var valA, valB;
        switch (sortCol) {
            case "date":
                valA = a.date || "";
                valB = b.date || "";
                break;
            case "customerName":
                valA = (a.customerName || "").toLowerCase();
                valB = (b.customerName || "").toLowerCase();
                break;
            case "invoiceId":
                valA = a.invoiceId || "";
                valB = b.invoiceId || "";
                break;
            case "subtotal":
                valA = a.subtotal || 0;
                valB = b.subtotal || 0;
                break;
            case "gstTax":
                valA = a.gstTax || 0;
                valB = b.gstTax || 0;
                break;
            case "total":
                valA = a.total || 0;
                valB = b.total || 0;
                break;
            default:
                valA = a.date || "";
                valB = b.date || "";
        }
        if (typeof valA === "number" && typeof valB === "number") {
            return sortAsc ? valA - valB : valB - valA;
        }
        var cmp = String(valA).localeCompare(String(valB));
        return sortAsc ? cmp : -cmp;
    });
    
    if (filtered.length === 0) {
        if (recentTable) recentTable.style.display = "none";
        if (recentEmpty) recentEmpty.style.display = "flex";
        if (recentCount) recentCount.textContent = "0";
        return;
    }
    
    if (recentTable) recentTable.style.display = "";
    if (recentEmpty) recentEmpty.style.display = "none";
    if (recentCount) recentCount.textContent = filtered.length;
    
    recentBody.innerHTML = "";
    filtered.forEach((inv, index) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-inv-id", inv.id);
        const dateStr = inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-";
        const isToday = inv.date === new Date().toISOString().split("T")[0];
        const gstEnabled = inv.gstEnabled !== false;
        
        tr.innerHTML = `
            <td class="text-muted text-center" style="font-size: 12px;">${index + 1}</td>
            <td><span class="bh-inv-id">${inv.invoiceId || "-"}</span></td>
            <td class="col-mono" style="font-size: 12px; color: var(--text-muted);">
                ${dateStr}
                ${isToday ? '<span class="bh-today-badge">Today</span>' : ''}
            </td>
            <td>
                <span class="bh-cell-editable" contenteditable="true" data-field="customerName" data-inv-id="${inv.id}" title="Click to edit customer name">${inv.customerName || "Walk-in"}</span>
            </td>
            <td>
                <span class="bh-cell-editable col-mono" contenteditable="true" data-field="customerPhone" data-inv-id="${inv.id}" title="Click to edit phone">${inv.customerPhone || "-"}</span>
            </td>
            <td style="text-align: right;"><span class="bh-amount" style="color: var(--text-secondary);">₹${(inv.subtotal || 0).toFixed(2)}</span></td>
            <td style="text-align: right; display: ${gstEnabled ? "" : "none"};" class="bh-gst-col"><span class="bh-amount" style="color: var(--text-muted);">₹${(inv.gstTax || 0).toFixed(2)}</span></td>
            <td style="text-align: right;"><span class="bh-amount bh-grand-total">₹${(inv.total || 0).toFixed(2)}</span></td>
            <td style="text-align: center;">
                <div class="bh-actions">
                    <button class="btn btn-primary btn-sm" title="Print Invoice" data-print-id="${inv.id}" style="padding: 4px 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Print
                    </button>
                    <button class="btn btn-success btn-sm" title="Download PDF" data-pdf-id="${inv.id}" style="padding: 4px 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        PDF
                    </button>
                </div>
            </td>
        `;
        
        // Print button
        const printBtn = tr.querySelector('[data-print-id="' + inv.id + '"]');
        if (printBtn) {
            printBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const invData = AppState.allInvoices.find(i => i.id === inv.id);
                if (invData) reprintSelectedInvoice(invData);
            });
        }
        
        // PDF button
        const pdfBtn = tr.querySelector('[data-pdf-id="' + inv.id + '"]');
        if (pdfBtn) {
            pdfBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const invData = AppState.allInvoices.find(i => i.id === inv.id);
                if (invData) downloadPDFInvoice(invData);
            });
        }
        
        // Editable cell save on blur
        const editableCells = tr.querySelectorAll(".bh-cell-editable");
        editableCells.forEach(cell => {
            cell.addEventListener("blur", async () => {
                const field = cell.getAttribute("data-field");
                const invId = parseInt(cell.getAttribute("data-inv-id"));
                const newValue = cell.textContent.trim() || (field === "customerName" ? "Walk-in" : "-");
                
                // Find and update the invoice in AppState
                const invData = AppState.allInvoices.find(i => i.id === invId);
                if (invData && invData[field] !== newValue) {
                    invData[field] = newValue;
                    // Save to database
                    try {
                        await db.updateInvoice(invData);
                        cell.style.borderColor = "rgba(16, 185, 129, 0.3)";
                        cell.style.background = "rgba(16, 185, 129, 0.05)";
                        setTimeout(() => {
                            cell.style.borderColor = "";
                            cell.style.background = "";
                        }, 1000);
                    } catch (err) {
                        console.error("Failed to update invoice:", err);
                        cell.style.borderColor = "rgba(239, 68, 68, 0.3)";
                        cell.style.background = "rgba(239, 68, 68, 0.05)";
                        setTimeout(() => {
                            cell.style.borderColor = "";
                            cell.style.background = "";
                        }, 1500);
                    }
                }
            });
            
            // Save on Enter (prevent newline)
            cell.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    cell.blur();
                }
                if (e.key === "Escape") {
                    // Reset to original value
                    const invId = parseInt(cell.getAttribute("data-inv-id"));
                    const field = cell.getAttribute("data-field");
                    const invData = AppState.allInvoices.find(i => i.id === invId);
                    if (invData) {
                        cell.textContent = invData[field] || (field === "customerName" ? "Walk-in" : "-");
                    }
                    cell.blur();
                }
            });
        });
        
        recentBody.appendChild(tr);
    });
}

// Bill history grid sorting state
var billingSortState = {
    column: "date",
    ascending: false  // Default: descending (most recent first)
};

// Bill history search input
const billHistorySearch = document.getElementById("bill-history-search");
if (billHistorySearch) {
    billHistorySearch.addEventListener("input", loadRecentBillingHistory);
}

// Sort click handlers for bill history grid headers
document.querySelectorAll(".bill-history-grid .bh-sortable").forEach(function(th) {
    th.addEventListener("click", function() {
        var col = th.getAttribute("data-sort");
        if (!col) return;
        
        // Toggle direction if same column, otherwise default to ascending
        if (billingSortState.column === col) {
            billingSortState.ascending = !billingSortState.ascending;
        } else {
            billingSortState.column = col;
            billingSortState.ascending = true;
        }
        
        // Update sort indicator icons on header row
        document.querySelectorAll(".bill-history-grid .bh-sortable").forEach(function(h) {
            h.classList.remove("bh-sort-asc", "bh-sort-desc");
            var icon = h.querySelector(".bh-sort-icon");
            if (icon) icon.textContent = "";
        });
        th.classList.add(billingSortState.ascending ? "bh-sort-asc" : "bh-sort-desc");
        var icon = th.querySelector(".bh-sort-icon");
        var arrow = billingSortState.ascending ? "\u25B2" : "\u25BC";
        if (icon) icon.textContent = arrow;
        
        loadRecentBillingHistory();
    });
});

// Apply initial default sort (date desc) on first load
function initBillHistorySort() {
    var defaultTh = document.querySelector('.bill-history-grid th[data-sort="date"]');
    if (defaultTh) {
        defaultTh.classList.add("bh-sort-desc");
        var icon = defaultTh.querySelector(".bh-sort-icon");
        if (icon) icon.textContent = "\u25BC";
    }
}

// Initialize sort on DOM ready
if (document.querySelector(".bill-history-grid")) {
    initBillHistorySort();
}

// View All button in billing recent transactions
const viewAllBtn = document.getElementById("btn-view-all-invoices");
if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
        navigateToScreen("invoices");
    });

// Collapse toggle for recent transactions panel
const toggleRecentBtn = document.getElementById("btn-toggle-recent");
const recentChevron = document.getElementById("recent-chevron");
const recentBody = document.getElementById("billing-recent-body");
const recentHeader = document.getElementById("billing-recent-header");

function toggleRecentPanel() {
    const isCollapsed = recentBody.classList.toggle("collapsed");
    if (recentChevron) {
        recentChevron.style.transform = isCollapsed ? "rotate(180deg)" : "";
        recentChevron.style.transition = "transform 0.2s";
    }
}

if (toggleRecentBtn && recentBody) {
    toggleRecentBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRecentPanel();
    });
}

// Also toggle when clicking the header itself (not the buttons inside)
if (recentHeader && recentBody) {
    recentHeader.addEventListener("click", (e) => {
        if (!e.target.closest("button")) {
            toggleRecentPanel();
        }
    });
    recentHeader.style.cursor = "pointer";
}

}



// ================= COMPLETE SALE (Save Invoice Without Print/PDF) =================
async function completeTransaction() {
    const data = buildInvoiceData();
    if (data.validItems.length === 0) {
        alert("Cannot complete transaction. Please select at least one product with quantity > 0.");
        return;
    }
    
    if (!confirm(`Complete sale for ${data.customerName}? Amount: ₹${data.grandTotal.toFixed(2)}`)) {
        return;
    }
    
    // Save record & adjust stock in DB
    if (AppState.editingInvoiceId) {
        // Editing mode: restore old stock, update record, then deduct new stock
        const originalInv = AppState.allInvoices.find(i => i.id === AppState.editingInvoiceId);
        if (originalInv && originalInv.items) {
            for (const item of originalInv.items) {
                if (item.productId && item.qty > 0) {
                    await db.updateProductStock(item.productId, -item.qty);
                }
            }
        }
        await db.updateInvoice(data.invoiceObj);
        for (const item of data.validItems) {
            if (item.productId && item.qty > 0) {
                await db.updateProductStock(item.productId, item.qty);
            }
        }
        AppState.editingInvoiceId = null;
    } else {
        await db.saveInvoice(data.invoiceObj);
    }
    
    alert(`Sale completed successfully! Invoice ${data.invoiceId} saved.`);
    initializeBillingCounter();
    loadDashboardStats();
}

DOM.btnCompleteSale.addEventListener("click", completeTransaction);

// ================= KEYBOARD SHORTCUTS =================
document.addEventListener("keydown", (e) => {
    // Only fire when on billing screen
    const billingScreen = document.getElementById("screen-billing");
    if (!billingScreen || !billingScreen.classList.contains("active")) return;
    // Don't fire when typing in an input (except function keys)
    const isInput = e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA";

    switch (e.key) {
        case "F2":
            e.preventDefault();
            if (!isInput || e.target.closest(".billing-sheet-container")) {
                addBlankBillingRow();
            }
            break;
        case "F3":
            e.preventDefault();
            openProductSearchModal();
            break;
        case "F4":
            e.preventDefault();
            generateAndPrintInvoice();
            break;
        case "F5":
            e.preventDefault();
            openQuickSaleModal();
            break;
        case "Escape":
            if (!isInput) {
                DOM.btnResetBill.click();
            }
            break;
    }
});


// ================= QUICK SALE MODAL =================
let quickSaleCart = [];

async function openQuickSaleModal() {
    // Load products for search
    if (AppState.billingProducts.length === 0) {
        AppState.billingProducts = await db.getAllProducts();
    }
    
    quickSaleCart = [];
    document.getElementById("qs-search-input").value = "";
    document.getElementById("qs-cash-received").value = "";
    document.getElementById("qs-total").textContent = "₹0.00";
    document.getElementById("qs-change").textContent = "₹0.00";
    document.getElementById("qs-item-count").textContent = "0 items";
    document.getElementById("qs-cart-body").innerHTML = `
        <div class="qs-empty-cart" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: block; margin: 0 auto 8px; opacity: 0.4;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            No items added yet. Search and click a product above.
        </div>`;
    document.getElementById("qs-search-results").innerHTML = `
        <div class="qs-empty-hint" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: block; margin: 0 auto 8px; opacity: 0.4;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Type to search for products
        </div>`;
    
    document.getElementById("quick-sale-modal").style.display = "flex";
    setTimeout(() => document.getElementById("qs-search-input").focus(), 100);
}

function closeQuickSaleModal() {
    document.getElementById("quick-sale-modal").style.display = "none";
    quickSaleCart = [];
}

function renderQuickSaleResults() {
    const query = document.getElementById("qs-search-input").value.toLowerCase().trim();
    const container = document.getElementById("qs-search-results");
    const products = AppState.billingProducts;
    
    if (!query) {
        container.innerHTML = '<div class="qs-empty-hint" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: block; margin: 0 auto 8px; opacity: 0.4;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Type to search for products</div>';
        return;
    }
    
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="qs-empty-hint" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">No products found matching "' + query + '"</div>';
        return;
    }
    
    container.innerHTML = "";
    filtered.slice(0, 8).forEach(prod => {
        const stockCls = prod.stock === 0 ? "empty" : prod.stock < 10 ? "low" : "ok";
        const stockLabel = prod.stock === 0 ? "OUT OF STOCK" : prod.stock + " left";
        
        const div = document.createElement("div");
        div.className = "qs-product-item";
        div.innerHTML = `
            <div class="qs-prod-info">
                <span class="qs-prod-name">${prod.name}</span>
                <span class="qs-prod-meta">
                    <span class="cat-badge-sm ${prod.category}">${prod.category.charAt(0).toUpperCase() + prod.category.slice(1)}</span>
                    <span>${prod.sku}</span>
                    <span class="qs-prod-stock badge-status ${stockCls}" style="font-size: 10px; padding: 1px 5px;">${stockLabel}</span>
                </span>
            </div>
            <span class="qs-prod-price">₹${prod.sellingPrice.toFixed(2)}</span>
        `;
        
        if (prod.stock > 0) {
            div.addEventListener("click", () => addToQuickSaleCart(prod));
        } else {
            div.style.opacity = "0.5";
            div.style.cursor = "not-allowed";
            div.title = "Out of stock";
        }
        
        container.appendChild(div);
    });
}

function addToQuickSaleCart(prod) {
    const existing = quickSaleCart.find(item => item.productId === prod.id);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + 1 > prod.stock) {
        alert("Warning: Only " + prod.stock + " units of " + prod.name + " in stock.");
        return;
    }
    if (existing) {
        existing.qty++;
    } else {
        quickSaleCart.push({
            id: Date.now() + Math.random(),
            productId: prod.id,
            name: prod.name,
            rate: prod.sellingPrice,
            qty: 1,
            gstRate: prod.gstRate || 0
        });
    }
    renderQuickSaleCart();
    document.getElementById("qs-search-input").value = "";
    document.getElementById("qs-search-input").focus();
    renderQuickSaleResults();
}

function renderQuickSaleCart() {
    const container = document.getElementById("qs-cart-body");
    const countEl = document.getElementById("qs-item-count");
    
    if (quickSaleCart.length === 0) {
        container.innerHTML = '<div class="qs-empty-cart" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: block; margin: 0 auto 8px; opacity: 0.4;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>No items added yet. Search and click a product above.</div>';
        countEl.textContent = "0 items";
        return;
    }
    
    const totalItems = quickSaleCart.reduce((sum, item) => sum + item.qty, 0);
    countEl.textContent = totalItems + " item" + (totalItems !== 1 ? "s" : "");
    
    container.innerHTML = "";
    quickSaleCart.forEach(item => {
        const lineTotal = item.rate * item.qty;
        const row = document.createElement("div");
        row.className = "qs-cart-row";
        row.innerHTML = `
            <span class="qs-cart-name" title="${item.name}">${item.name}</span>
            <span class="qs-cart-rate">₹${item.rate.toFixed(2)}</span>
            <input type="number" class="qs-cart-qty" value="${item.qty}" min="0" step="1" data-item-id="${item.id}">
            <span class="qs-cart-total">₹${lineTotal.toFixed(2)}</span>
            <button class="qs-cart-remove" data-item-id="${item.id}" title="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        
        row.querySelector(".qs-cart-qty").addEventListener("change", (e) => {
            const newQty = parseInt(e.target.value) || 0;
            const cartItem = quickSaleCart.find(i => i.id === item.id);
            if (cartItem) {
                if (newQty <= 0) {
                    quickSaleCart = quickSaleCart.filter(i => i.id !== item.id);
                } else {
                    cartItem.qty = newQty;
                }
                renderQuickSaleCart();
                updateQuickSaleTotals();
            }
        });
        
        row.querySelector(".qs-cart-remove").addEventListener("click", () => {
            quickSaleCart = quickSaleCart.filter(i => i.id !== item.id);
            renderQuickSaleCart();
            updateQuickSaleTotals();
        });
        
        container.appendChild(row);
    });
    updateQuickSaleTotals();
}

function updateQuickSaleTotals() {
    let subtotal = 0;
    quickSaleCart.forEach(item => {
        subtotal += item.rate * item.qty;
    });
    
    const gstEnabled = false; // Quick sale = non-GST for simplicity
    const total = subtotal;
    document.getElementById("qs-total").textContent = "₹" + total.toFixed(2);
    
    const cash = parseFloat(document.getElementById("qs-cash-received").value) || 0;
    if (cash > 0) {
        const change = cash - total;
        const changeEl = document.getElementById("qs-change");
        changeEl.textContent = "₹" + change.toFixed(2);
        changeEl.style.color = change >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)";
    } else {
        document.getElementById("qs-change").textContent = "₹0.00";
        document.getElementById("qs-change").style.color = "";
    }
}

async function completeQuickSale(andPrint) {
    if (quickSaleCart.length === 0) {
        alert("Please add at least one product to the cart.");
        return;
    }
    
    const validItems = quickSaleCart.filter(item => item.qty > 0);
    if (validItems.length === 0) {
        alert("All items have zero quantity. Please adjust quantities.");
        return;
    }
    
    // Build invoice data
    const invoiceId = "INV-" + Math.floor(Math.random() * 90000 + 10000);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const billDate = now.toISOString().split("T")[0];
    const billTime = now.toTimeString().slice(0, 5);
    
    let subtotal = 0;
    for (const item of validItems) {
        subtotal += item.rate * item.qty;
    }
    const totalGst = 0; // Quick sale = non-GST
    
    const invoiceObj = {
        invoiceId,
        date: billDate,
        time: billTime,
        datetime: billDate + "T" + billTime,
        customerName: "Walk-in Customer",
        customerPhone: "-",
        items: validItems,
        subtotal,
        gstTax: 0,
        total: subtotal,
        gstEnabled: false
    };
    
    // Save to DB and deduct stock
    await db.saveInvoice(invoiceObj);
    
    if (andPrint) {
        // Populate print template
        document.getElementById("print-inv-id").textContent = invoiceId;
        document.getElementById("print-inv-date").textContent = new Date(billDate).toLocaleDateString("en-IN");
        const [h, m] = billTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        document.querySelector("#print-inv-time").textContent = h12 + ":" + pad(m) + " " + ampm;
        document.getElementById("print-cust-name").textContent = "Walk-in Customer";
        document.getElementById("print-cust-phone").textContent = "-";
        
        const printBody = document.getElementById("print-invoice-body");
        printBody.innerHTML = "";
        validItems.forEach((item, idx) => {
            const row = document.createElement("tr");
            row.innerHTML = '<td>' + (idx + 1) + '</td><td>' + item.name + '</td><td>' + item.rate.toFixed(2) + '</td><td>' + item.qty + '</td><td class="print-gst-col" style="display: none;">0%</td><td class="print-gst-col" style="display: none;">0.00</td><td style="text-align: right;">' + (item.rate * item.qty).toFixed(2) + '</td>';
            printBody.appendChild(row);
        });
        
        document.getElementById("print-subtotal").textContent = "₹" + subtotal.toFixed(2);
        document.getElementById("print-gst-rows").style.display = "none";
        document.querySelectorAll(".print-gst-col").forEach(el => el.style.display = "none");
        document.getElementById("print-grand-total").textContent = "₹" + subtotal.toFixed(2);
        
        closeQuickSaleModal();
        window.print();
    }
    
    alert("Quick sale completed! Invoice " + invoiceId + " saved.");
    closeQuickSaleModal();
    
    // Refresh billing products and recent transactions
    AppState.billingProducts = await db.getAllProducts();
    try {
        const allInv = await db.getAllInvoices();
        AppState.allInvoices = allInv.reverse();
    } catch (e) {}
    loadRecentBillingHistory();
    loadDashboardStats();
}

// Quick Sale button event
document.getElementById("btn-quick-sale").addEventListener("click", openQuickSaleModal);

// Quick Sale search input
document.getElementById("qs-search-input").addEventListener("input", renderQuickSaleResults);

// Quick Sale cash received
document.getElementById("qs-cash-received").addEventListener("input", updateQuickSaleTotals);

// Quick Sale close button
document.getElementById("qs-close-btn").addEventListener("click", closeQuickSaleModal);

// Close on overlay click
document.getElementById("quick-sale-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("quick-sale-modal")) closeQuickSaleModal();
});

// Quick Sale Complete buttons
document.getElementById("qs-complete-sale").addEventListener("click", () => completeQuickSale(false));
document.getElementById("qs-complete-print").addEventListener("click", () => completeQuickSale(true));

// Quick Sale search keyboard
document.getElementById("qs-search-input").addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuickSaleModal();
    if (e.key === "Enter") {
        e.preventDefault();
        // Select first visible product
        const first = document.querySelector(".qs-product-item:not([style*=\"opacity\"])");
        if (first) first.click();
    }
});


// ================= INVOICE DATA BUILDER =================
// Shared helper for both print and PDF invoice generation
function buildInvoiceData() {
    const validItems = AppState.billingItems.filter(item => item.productId && item.qty > 0);

    const customerName = DOM.billCustomerName.value.trim() || "Walk-in Customer";
    const customerPhone = DOM.billCustomerPhone.value.trim() || "-";
    const rawDatetime = DOM.billDatetime.value;
    const billDate = rawDatetime ? rawDatetime.slice(0, 10) : new Date().toISOString().split("T")[0];
    const billTime = rawDatetime ? rawDatetime.slice(11, 16) : new Date().toTimeString().slice(0, 5);
    const isGstEnabled = DOM.billingGstToggle.checked;

    // Reuse the invoice ID if editing, otherwise generate a new one
    let invoiceId;
    if (AppState.editingInvoiceId) {
        // Load the original invoice to preserve its ID
        const originalInv = AppState.allInvoices.find(i => i.id === AppState.editingInvoiceId);
        invoiceId = originalInv ? originalInv.invoiceId : "INV-" + Math.floor(Math.random() * 90000 + 10000);
    } else {
        invoiceId = "INV-" + Math.floor(Math.random() * 90000 + 10000);
    }

    let subtotal = 0;
    let totalGst = 0;
    for (const item of validItems) {
        subtotal += item.rate * item.qty;
        totalGst += (item.rate * item.qty) * (item.gstRate / 100);
    }

    const grandTotal = isGstEnabled ? (subtotal + totalGst) : subtotal;

    const invoiceObj = {
        invoiceId,
        date: billDate,
        time: billTime,
        datetime: rawDatetime || `${billDate}T${billTime}`,
        customerName,
        customerPhone,
        items: validItems,
        subtotal,
        gstTax: isGstEnabled ? totalGst : 0,
        total: grandTotal,
        gstEnabled: isGstEnabled
    };

    // If editing, carry over the original DB id
    if (AppState.editingInvoiceId) {
        invoiceObj.id = AppState.editingInvoiceId;
    }

    return {
        validItems,
        customerName,
        customerPhone,
        billDate,
        billTime,
        isGstEnabled,
        invoiceId,
        subtotal,
        totalGst,
        grandTotal,
        invoiceObj
    };
}

// ================= PRINT & EXPORT BILLING =================

// 1. Native Print Overlay
async function generateAndPrintInvoice() {
    const data = buildInvoiceData();
    if (data.validItems.length === 0) {
        alert("Cannot print. Please select at least one product with quantity > 0.");
        return;
    }

    // Save record & adjust stock in DB
    if (AppState.editingInvoiceId) {
        // Editing mode: restore stock for old items, update record, then deduct new stock
        const originalInv = AppState.allInvoices.find(i => i.id === AppState.editingInvoiceId);
        if (originalInv && originalInv.items) {
            for (const item of originalInv.items) {
                if (item.productId && item.qty > 0) {
                    await db.updateProductStock(item.productId, -item.qty);
                }
            }
        }
        // Use updateInvoice (store.put) to replace the existing record
        await db.updateInvoice(data.invoiceObj);
        // Deduct stock for new items
        for (const item of data.validItems) {
            if (item.productId && item.qty > 0) {
                await db.updateProductStock(item.productId, item.qty);
            }
        }
        AppState.editingInvoiceId = null;
    } else {
        // New invoice: save with stock deduction
        await db.saveInvoice(data.invoiceObj);
    }

    // Populate the Hidden HTML print wrapper template
    DOM.printInvId.textContent = data.invoiceId;
    DOM.printInvDate.textContent = new Date(data.billDate).toLocaleDateString("en-IN");
    // Format time in 12-hour format for print
    const [h, m] = data.billTime.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    document.querySelector("#print-inv-time").textContent = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    DOM.printCustName.textContent = data.customerName;
    DOM.printCustPhone.textContent = data.customerPhone;

    DOM.printInvoiceBody.innerHTML = "";
    data.validItems.forEach((item, index) => {
        const row = document.createElement("tr");
        const total = item.rate * item.qty;
        const gstVal = total * (item.gstRate / 100);

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item.rate.toFixed(2)}</td>
            <td>${item.qty}</td>
            <td class="print-gst-col">${item.gstRate}%</td>
            <td class="print-gst-col">${gstVal.toFixed(2)}</td>
            <td style="text-align: right;">${total.toFixed(2)}</td>
        `;
        DOM.printInvoiceBody.appendChild(row);
    });

    DOM.printSubtotal.textContent = `₹${data.subtotal.toFixed(2)}`;

    if (data.isGstEnabled) {
        DOM.printCgst.textContent = `₹${(data.totalGst / 2).toFixed(2)}`;
        DOM.printSgst.textContent = `₹${(data.totalGst / 2).toFixed(2)}`;
        DOM.printGstRows.style.display = "";
        document.querySelectorAll(".print-gst-col").forEach(el => el.style.display = "");
    } else {
        DOM.printGstRows.style.display = "none";
        document.querySelectorAll(".print-gst-col").forEach(el => el.style.display = "none");
    }

    DOM.printGrandTotal.textContent = `₹${data.grandTotal.toFixed(2)}`;

    // Trigger printing overlay
    window.print();

    // Reset Billing counter
    alert("Invoice transaction saved and printed successfully! Stocks are updated.");
    initializeBillingCounter();
    loadDashboardStats();
}

DOM.btnPrintBill.addEventListener("click", generateAndPrintInvoice);


// 2. jsPDF Compilation Export
async function generatePDFInvoice() {
    const data = buildInvoiceData();
    if (data.validItems.length === 0) {
        alert("Cannot generate PDF. Please select at least one product with quantity > 0.");
        return;
    }

    // Check jsPDF availability (Offline resilient fallback check)
    if (typeof window.jspdf === "undefined") {
        alert("Offline PDF generator fallback active: Standard print-to-PDF engine starting. Please select 'Save to PDF' as printer target.");
        generateAndPrintInvoice();
        return;
    }

    // PDF compilation structure
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title Header
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(22);
        doc.text("IMS HARDWARE SHOP", 14, 20);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Electrical, Plumbing, Paint & General Hardware", 14, 25);
        doc.text("Contact: +91 98765 43210 | GSTIN: 27AAAAA1111A1Z1", 14, 29);

        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Metadata details
        doc.setFont("Helvetica", "bold");
        doc.text("Invoice Details:", 14, 40);
        doc.setFont("Helvetica", "normal");
        doc.text(`Invoice ID: ${data.invoiceId}`, 14, 45);
        const [h, m] = data.billTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        doc.text(`Date: ${new Date(data.billDate).toLocaleDateString("en-IN")}`, 14, 49);
        doc.text(`Time: ${h12}:${String(m).padStart(2, "0")} ${ampm}`, 14, 53);

        doc.setFont("Helvetica", "bold");
        doc.text("Customer Info:", 120, 40);
        doc.setFont("Helvetica", "normal");
        doc.text(`Name: ${data.customerName}`, 120, 45);
        doc.text(`Contact: ${data.customerPhone}`, 120, 49);

        // Table Rows Construction
        const headers = data.isGstEnabled
            ? [["#", "Product Description", "Rate (Rs)", "Qty", "GST %", "GST Amt (Rs)", "Total (Rs)"]]
            : [["#", "Product Description", "Rate (Rs)", "Qty", "Total (Rs)"]];

        const rows = data.validItems.map((item, idx) => {
            const total = item.rate * item.qty;
            const gst = total * (item.gstRate / 100);
            return data.isGstEnabled
                ? [idx + 1, item.name, item.rate.toFixed(2), item.qty, `${item.gstRate}%`, gst.toFixed(2), total.toFixed(2)]
                : [idx + 1, item.name, item.rate.toFixed(2), item.qty, total.toFixed(2)];
        });

        // Render Table via AutoTable
        doc.autoTable({
            startY: 55,
            head: headers,
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [79, 70, 229] }, // Indigo theme
            columnStyles: {
                0: { halign: "center", width: 10 },
                1: { halign: "left" },
                2: { halign: "right" },
                3: { halign: "center" },
                4: { halign: "right" },
                5: { halign: "right" }
            }
        });

        // Aggregation totals position
        const finalY = doc.previousAutoTable.finalY + 10;

        doc.setFont("Helvetica", "normal");
        doc.text(`Subtotal: Rs. ${data.subtotal.toFixed(2)}`, 140, finalY, { align: "left" });
        let taxOffset = 5;
        if (data.isGstEnabled) {
            doc.text(`CGST (9%): Rs. ${(data.totalGst / 2).toFixed(2)}`, 140, finalY + 5, { align: "left" });
            doc.text(`SGST (9%): Rs. ${(data.totalGst / 2).toFixed(2)}`, 140, finalY + 10, { align: "left" });
            taxOffset = 15;
        }

        doc.setFont("Helvetica", "bold");
        doc.text(`Grand Total: Rs. ${data.grandTotal.toFixed(2)}`, 140, finalY + taxOffset, { align: "left" });

        // Save invoice in DB & update stocks
        if (AppState.editingInvoiceId) {
            // Editing mode: restore old stock, update record, then deduct new stock
            const originalInv = AppState.allInvoices.find(i => i.id === AppState.editingInvoiceId);
            if (originalInv && originalInv.items) {
                for (const item of originalInv.items) {
                    if (item.productId && item.qty > 0) {
                        await db.updateProductStock(item.productId, -item.qty);
                    }
                }
            }
            await db.updateInvoice(data.invoiceObj);
            for (const item of data.validItems) {
                if (item.productId && item.qty > 0) {
                    await db.updateProductStock(item.productId, item.qty);
                }
            }
            AppState.editingInvoiceId = null;
        } else {
            await db.saveInvoice(data.invoiceObj);
        }

        // Download document trigger
        doc.save(`${data.invoiceId}_IMS_Receipt.pdf`);

        alert("Invoice generated and saved as PDF successfully! Stocks are updated.");
        initializeBillingCounter();
        loadDashboardStats();

    } catch (err) {
        console.error("PDF generation error:", err);
        alert("Error generating PDF invoice. Falling back to native printer setup.");
        generateAndPrintInvoice();
    }
}

DOM.btnPdfBill.addEventListener("click", generatePDFInvoice);


// ================= TRANSACTION HISTORY =================
async function loadInvoiceHistory() {
    // Show loading spinner
    const loadingSpinner = document.getElementById("invoice-loading-spinner");
    const tableContainer = document.querySelector("#screen-invoices .table-container");
    if (loadingSpinner) loadingSpinner.style.display = "flex";
    if (tableContainer) tableContainer.style.display = "none";
    
    try {
        const invoices = await db.getAllInvoices();
        AppState.allInvoices = invoices.reverse(); // Show latest first
        renderInvoiceHistoryRows();
    } catch (err) {
        console.error("Error loading historical invoices:", err);
    } finally {
        // Hide loading spinner
        if (loadingSpinner) loadingSpinner.style.display = "none";
        if (tableContainer) tableContainer.style.display = "";
    }
}

function renderInvoiceHistoryRows() {
    const tbody = DOM.invoicesTableBody;
    tbody.innerHTML = "";
    const query = DOM.invoiceHistorySearch.value.toLowerCase().trim();
    const dateFrom = DOM.invoiceDateFrom ? DOM.invoiceDateFrom.value : "";
    const dateTo = DOM.invoiceDateTo ? DOM.invoiceDateTo.value : "";

    const filtered = AppState.allInvoices.filter(inv => {
        // Text search filter
        const textMatch = !query || 
            inv.invoiceId.toLowerCase().includes(query) || 
            inv.customerName.toLowerCase().includes(query) || 
            inv.customerPhone.includes(query);
        
        // Date range filter
        let dateMatch = true;
        if (dateFrom && inv.date) {
            dateMatch = inv.date >= dateFrom;
        }
        if (dateMatch && dateTo && inv.date) {
            dateMatch = inv.date <= dateTo;
        }
        
        return textMatch && dateMatch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No transaction invoices recorded.</td></tr>`;
        return;
    }

    filtered.forEach(inv => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td class="col-mono font-weight-bold">${inv.invoiceId}</td>
            <td class="col-mono">${new Date(inv.date).toLocaleDateString("en-IN")}${inv.time ? " <span class=\"text-muted\">" + inv.time + "</span>" : ""}</td>
            <td>${inv.customerName}</td>
            <td class="col-mono">${inv.customerPhone}</td>
            <td class="col-mono text-right">₹${inv.subtotal.toFixed(2)}</td>
            <td class="col-mono text-right">₹${inv.gstTax.toFixed(2)}</td>
            <td class="col-mono text-right font-weight-bold" style="color: var(--accent-emerald);">₹${inv.total.toFixed(2)}</td>
            <td class="action-buttons-cell">
                <button class="btn btn-outline btn-icon btn-view-invoice" title="View Invoice" data-id="${inv.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn btn-outline btn-icon btn-reprint" title="Reprint Invoice" data-id="${inv.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
                <button class="btn btn-outline btn-icon btn-pdf-invoice" title="Download PDF" data-id="${inv.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </button>
                <button class="btn btn-outline btn-icon btn-edit-invoice" title="Edit Invoice" data-id="${inv.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-icon btn-logout btn-delete-invoice" title="Delete Invoice" data-id="${inv.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </td>
        `;

        // View Invoice Action binding (opens read-only details modal)
        tr.querySelector(".btn-view-invoice").addEventListener("click", () => {
            openInvoiceViewModal(inv);
        });

        // Reprint Action binding
        tr.querySelector(".btn-reprint").addEventListener("click", () => {
            reprintSelectedInvoice(inv);
        });

        // PDF Download Action binding
        tr.querySelector(".btn-pdf-invoice").addEventListener("click", () => {
            downloadPDFInvoice(inv);
        });

        // Delete Invoice Action binding
        tr.querySelector(".btn-delete-invoice").addEventListener("click", async () => {
            if (confirm(`Delete invoice ${inv.invoiceId} for "${inv.customerName}"? This action cannot be undone.`)) {
                try {
                    await db.deleteInvoice(inv.id);
                    loadInvoiceHistory();
                    loadDashboardStats();
                } catch (err) {
                    console.error("Failed to delete invoice:", err);
                    alert("Error deleting invoice: " + err.message);
                }
            }
        });

        // Edit Invoice Action binding
        tr.querySelector(".btn-edit-invoice").addEventListener("click", () => {
            loadInvoiceForEditing(inv);
        });

        tbody.appendChild(tr);
    });
}

function reprintSelectedInvoice(inv) {
    DOM.printInvId.textContent = inv.invoiceId;
    DOM.printInvDate.textContent = new Date(inv.date).toLocaleDateString("en-IN");
    // Format time for reprint
    if (inv.time) {
        const [h, m] = inv.time.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        document.querySelector("#print-inv-time").textContent = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    } else {
        document.querySelector("#print-inv-time").textContent = "--";
    }
    DOM.printCustName.textContent = inv.customerName;
    DOM.printCustPhone.textContent = inv.customerPhone;

    DOM.printInvoiceBody.innerHTML = "";
    inv.items.forEach((item, index) => {
        const row = document.createElement("tr");
        const total = item.rate * item.qty;
        const gstVal = total * (item.gstRate / 100);

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item.rate.toFixed(2)}</td>
            <td>${item.qty}</td>
            <td class="print-gst-col">${item.gstRate}%</td>
            <td class="print-gst-col">${gstVal.toFixed(2)}</td>
            <td style="text-align: right;">${total.toFixed(2)}</td>
        `;
        DOM.printInvoiceBody.appendChild(row);
    });

    DOM.printSubtotal.textContent = `₹${inv.subtotal.toFixed(2)}`;
    
    if (inv.gstEnabled) {
        DOM.printCgst.textContent = `₹${(inv.gstTax/2).toFixed(2)}`;
        DOM.printSgst.textContent = `₹${(inv.gstTax/2).toFixed(2)}`;
        DOM.printGstRows.style.display = "";
        document.querySelectorAll(".print-gst-col").forEach(el => el.style.display = "");
    } else {
        DOM.printGstRows.style.display = "none";
        document.querySelectorAll(".print-gst-col").forEach(el => el.style.display = "none");
    }

    DOM.printGrandTotal.textContent = `₹${inv.total.toFixed(2)}`;

    window.print();
}

// Download an existing invoice as PDF (from invoice history)
async function downloadPDFInvoice(inv) {
    // Check jsPDF availability
    if (typeof window.jspdf === "undefined") {
        alert("PDF library not loaded. Falling back to print.");
        reprintSelectedInvoice(inv);
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title Header
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(22);
        doc.text("IMS HARDWARE SHOP", 14, 20);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Electrical, Plumbing, Paint & General Hardware", 14, 25);
        doc.text("Contact: +91 98765 43210 | GSTIN: 27AAAAA1111A1Z1", 14, 29);

        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Metadata details
        doc.setFont("Helvetica", "bold");
        doc.text("Invoice Details:", 14, 40);
        doc.setFont("Helvetica", "normal");
        doc.text(`Invoice ID: ${inv.invoiceId}`, 14, 45);

        // Format date
        const dateStr = inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-";
        doc.text(`Date: ${dateStr}`, 14, 49);

        // Format time
        if (inv.time) {
            const [h, m] = inv.time.split(":").map(Number);
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            doc.text(`Time: ${h12}:${String(m).padStart(2, "0")} ${ampm}`, 14, 53);
        }

        doc.setFont("Helvetica", "bold");
        doc.text("Customer Info:", 120, 40);
        doc.setFont("Helvetica", "normal");
        doc.text(`Name: ${inv.customerName || "Walk-in Customer"}`, 120, 45);
        doc.text(`Contact: ${inv.customerPhone || "-"}`, 120, 49);

        // Build table data from invoice items
        const items = inv.items || [];
        const isGstEnabled = inv.gstEnabled !== false;

        const headers = isGstEnabled
            ? [["#", "Product Description", "Rate (Rs)", "Qty", "GST %", "GST Amt (Rs)", "Total (Rs)"]]
            : [["#", "Product Description", "Rate (Rs)", "Qty", "Total (Rs)"]];

        const rows = items.map((item, idx) => {
            const total = (item.rate || 0) * (item.qty || 0);
            const gst = total * ((item.gstRate || 0) / 100);
            return isGstEnabled
                ? [idx + 1, item.name || "", (item.rate || 0).toFixed(2), item.qty || 0, `${item.gstRate || 0}%`, gst.toFixed(2), total.toFixed(2)]
                : [idx + 1, item.name || "", (item.rate || 0).toFixed(2), item.qty || 0, total.toFixed(2)];
        });

        // Render Table via AutoTable
        doc.autoTable({
            startY: 55,
            head: headers,
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: {
                0: { halign: "center", width: 10 },
                1: { halign: "left" },
                2: { halign: "right" },
                3: { halign: "center" },
                4: { halign: "right" },
                5: { halign: "right" }
            }
        });

        // Aggregation totals
        const finalY = doc.previousAutoTable.finalY + 10;

        doc.setFont("Helvetica", "normal");
        doc.text(`Subtotal: Rs. ${(inv.subtotal || 0).toFixed(2)}`, 140, finalY, { align: "left" });
        let taxOffset = 5;
        if (isGstEnabled) {
            doc.text(`CGST (9%): Rs. ${((inv.gstTax || 0) / 2).toFixed(2)}`, 140, finalY + 5, { align: "left" });
            doc.text(`SGST (9%): Rs. ${((inv.gstTax || 0) / 2).toFixed(2)}`, 140, finalY + 10, { align: "left" });
            taxOffset = 15;
        }

        doc.setFont("Helvetica", "bold");
        doc.text(`Grand Total: Rs. ${(inv.total || 0).toFixed(2)}`, 140, finalY + taxOffset, { align: "left" });

        // Download PDF
        doc.save(`${inv.invoiceId}_IMS_Receipt.pdf`);

    } catch (err) {
        console.error("PDF generation error:", err);
        alert("Error generating PDF. Falling back to print.");
        reprintSelectedInvoice(inv);
    }
}

// Export invoice history as CSV
function exportInvoiceHistoryCSV() {
    const invoices = AppState.allInvoices;
    if (invoices.length === 0) {
        alert("No invoice records to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header row
    csvContent += "Invoice ID,Date,Time,Customer Name,Customer Phone,Subtotal,GST Amount,Grand Total\n";

    invoices.forEach(inv => {
        const date = inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-";
        const time = inv.time || "-";
        const name = `"${(inv.customerName || "Walk-in Customer").replace(/"/g, '""')}"`;
        const phone = inv.customerPhone || "-";
        const subtotal = (inv.subtotal || 0).toFixed(2);
        const gstTax = (inv.gstTax || 0).toFixed(2);
        const total = (inv.total || 0).toFixed(2);

        csvContent += `${inv.invoiceId},${date},${time},${name},${phone},${subtotal},${gstTax},${total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IMS_Invoice_History_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Date filter event listeners
DOM.invoiceDateFrom.addEventListener("change", renderInvoiceHistoryRows);
DOM.invoiceDateTo.addEventListener("change", renderInvoiceHistoryRows);

// Clear date filter
DOM.btnClearDateFilter.addEventListener("click", () => {
    DOM.invoiceDateFrom.value = "";
    DOM.invoiceDateTo.value = "";
    renderInvoiceHistoryRows();
});

DOM.btnExportInvoices.addEventListener("click", exportInvoiceHistoryCSV);

DOM.invoiceHistorySearch.addEventListener("input", renderInvoiceHistoryRows);


// ================= DATABASE MAINTENANCE CONTROLLER =================

// Export JSON
DOM.btnDbExport.addEventListener("click", async () => {
    try {
        const products = await db.getAllProducts();
        const invoices = await db.getAllInvoices();
        
        const backupData = {
            exportDate: new Date().toISOString(),
            products,
            invoices
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `IMS_DB_Backup_${new Date().toISOString().split("T")[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        
        alert("Database JSON backup exported and downloaded successfully!");
    } catch (err) {
        alert("Error exporting database: " + err.message);
    }
});

// Import JSON
DOM.btnDbImport.addEventListener("click", () => {
    DOM.dbFileInput.click();
});

DOM.dbFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.products || !data.invoices) {
                throw new Error("Invalid backup file structure. Missing inventory or invoice tables.");
            }

            if (confirm("Warning: Restoring this database will delete all current inventory products and transaction records. Do you wish to continue?")) {
                await db.importDatabase(data);
                alert("Database successfully restored from JSON backup!");
                loadDashboardStats();
                navigateToScreen("dashboard");
            }
        } catch (err) {
            alert("Error importing database: " + err.message);
        }
        DOM.dbFileInput.value = "";
    };
    reader.readAsText(file);
});

// Clear DB
DOM.btnDbClear.addEventListener("click", async () => {
    if (confirm("CAUTION: Are you absolutely sure you want to completely wipe all products and invoices? This action is permanent and cannot be undone.")) {
        try {
            await db.clearDatabase();
            alert("Complete database wipe accomplished. Reinitializing empty environment.");
            loadDashboardStats();
            navigateToScreen("dashboard");
        } catch (err) {
            alert("Wipe operation failed: " + err.message);
        }
    }
});


// ================= CUSTOMERS CONTROLLER =================
async function loadCustomers() {
    try {
        AppState.customers = await db.getAllCustomers();
        AppState.editingCustomerId = null;
        DOM.btnSaveCustomer.textContent = "Add Customer";
        DOM.btnCancelCustomer.style.display = "none";
        DOM.custName.value = "";
        DOM.custPhone.value = "";
        DOM.custEmail.value = "";
        DOM.custAddress.value = "";
        renderCustomerRows();
    } catch (err) {
        console.error("Error loading customers:", err);
    }
}

function renderCustomerRows() {
    const tbody = DOM.customersTableBody;
    tbody.innerHTML = "";
    const query = DOM.customerSearch.value.toLowerCase().trim();

    const filtered = AppState.customers.filter(c => {
        return c.name.toLowerCase().includes(query) || c.phone.includes(query) || (c.email && c.email.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No customers found. Add a customer above.</td></tr>`;
        return;
    }

    filtered.forEach((cust, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center text-muted">${index + 1}</td>
            <td>${cust.name}</td>
            <td class="col-mono">${cust.phone}</td>
            <td class="col-mono fs-14">${cust.email || "-"}</td>
            <td class="fs-14">${cust.address || "-"}</td>
            <td class="action-buttons-cell" style="text-align: center;">
                <button class="btn btn-outline btn-icon btn-edit-customer" title="Edit" data-id="${cust.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-icon btn-logout btn-delete-customer" title="Delete" data-id="${cust.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </td>
        `;

        tr.querySelector(".btn-edit-customer").addEventListener("click", () => {
            DOM.custName.value = cust.name;
            DOM.custPhone.value = cust.phone;
            DOM.custEmail.value = cust.email || "";
            DOM.custAddress.value = cust.address || "";
            AppState.editingCustomerId = cust.id;
            DOM.btnSaveCustomer.textContent = "Update Customer";
            DOM.btnCancelCustomer.style.display = "inline-flex";
        });

        tr.querySelector(".btn-delete-customer").addEventListener("click", async () => {
            if (confirm(`Delete customer "${cust.name}"?`)) {
                await db.deleteCustomer(cust.id);
                loadCustomers();
            }
        });

        tbody.appendChild(tr);
    });
}

// Save / Update Customer
DOM.btnSaveCustomer.addEventListener("click", async () => {
    const name = DOM.custName.value.trim();
    const phone = DOM.custPhone.value.trim();
    const email = DOM.custEmail.value.trim();
    const address = DOM.custAddress.value.trim();

    if (!name || !phone) {
        alert("Please enter both customer name and phone number.");
        return;
    }

    try {
        if (AppState.editingCustomerId) {
            // Update existing
            await db.saveCustomer({ id: AppState.editingCustomerId, name, phone, email, address });
        } else {
            // Add new
            await db.saveCustomer({ name, phone, email, address });
        }
        loadCustomers();
    } catch (err) {
        alert("Error saving customer: " + err.message);
    }
});

// Cancel edit
DOM.btnCancelCustomer.addEventListener("click", () => {
    AppState.editingCustomerId = null;
    DOM.btnSaveCustomer.textContent = "Add Customer";
    DOM.btnCancelCustomer.style.display = "none";
    DOM.custName.value = "";
    DOM.custPhone.value = "";
    DOM.custEmail.value = "";
    DOM.custAddress.value = "";
});

// Customer search
DOM.customerSearch.addEventListener("input", renderCustomerRows);

// ================= APPLICATION INITIALIZATION =================
window.addEventListener("DOMContentLoaded", async () => {
    try {
        // Init Database
        await db.init();
        
        // Seed default user
        await db.seedDefaultUser();
        
        // Seed default catalog if database is fresh/empty
        await db.seedDemoData();
        
        // Seed demo customers if none exist
        await db.seedDemoCustomers();
        
        // Seed demo invoices if none exist (only after products are seeded)
        await db.seedDemoInvoices();
        
        // Check session credentials
        checkAuth();
        
        // Initial setup for routing states
        loadDashboardStats();
        
    } catch (err) {
        console.error("Critical failure during initialization:", err);
        alert("Critical failure loading database engine. The app might not persist data correctly.");
    }
});
