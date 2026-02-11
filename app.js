/* ============================================
   ระบบสั่งอาหารผ่าน QR Code - JavaScript รวม
   ============================================ */

// ============================================
// ส่วนกลาง - Utilities & Storage
// ============================================

/**
 * จัดการ localStorage อย่างปลอดภัย
 * @param {string} key - คีย์สำหรับเก็บข้อมูล
 * @param {any} value - ข้อมูลที่จะเก็บ
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Error saving to storage:', e);
        return false;
    }
}

/**
 * อ่านข้อมูลจาก localStorage
 * @param {string} key - คีย์ของข้อมูล
 * @param {any} defaultValue - ค่าเริ่มต้นถ้าไม่มีข้อมูล
 */
function getFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Error reading from storage:', e);
        return defaultValue;
    }
}

/**
 * สร้าง ID แบบสุ่ม
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * จัดรูปแบบวันที่
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * แสดงข้อความแจ้งเตือน (Toast)
 */
function showToast(message, type = 'success') {
    // สร้าง container ถ้ายังไม่มี
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // สร้าง toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
    toast.innerHTML = `
        <span style="font-size: 1.25rem;">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // ลบหลัง 3 วินาที
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// ระบบสมาชิก (Authentication)
// ============================================

const Auth = {
    // คีย์สำหรับเก็บข้อมูล
    KEYS: {
        USERS: 'food_order_users',
        CURRENT_USER: 'food_order_current_user'
    },

    /**
     * เริ่มต้นระบบ - สร้างข้อมูลตัวอย่าง
     */
    init() {
        // สร้างผู้ใช้ตัวอย่างถ้ายังไม่มี
        const users = getFromStorage(this.KEYS.USERS, []);
        if (users.length === 0) {
            const defaultUsers = [
                {
                    id: generateId(),
                    username: 'admin',
                    password: 'admin123',
                    name: 'ผู้ดูแลระบบ',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    username: 'staff',
                    password: 'staff123',
                    name: 'พนักงานครัว',
                    role: 'staff',
                    createdAt: new Date().toISOString()
                }
            ];
            saveToStorage(this.KEYS.USERS, defaultUsers);
        }
    },

    /**
     * สมัครสมาชิกใหม่
     */
    register(username, password, name, role = 'customer') {
        const users = getFromStorage(this.KEYS.USERS, []);

        // ตรวจสอบชื่อผู้ใช้ซ้ำ
        if (users.find(u => u.username === username)) {
            return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
        }

        const newUser = {
            id: generateId(),
            username,
            password, // ในระบบจริงควรเข้ารหัส
            name,
            role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveToStorage(this.KEYS.USERS, users);

        return { success: true, message: 'สมัครสมาชิกสำเร็จ' };
    },

    /**
     * เข้าสู่ระบบ
     */
    login(username, password) {
        const users = getFromStorage(this.KEYS.USERS, []);
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        }

        // เก็บข้อมูลผู้ใช้ปัจจุบัน (ไม่รวมรหัสผ่าน)
        const sessionUser = { ...user };
        delete sessionUser.password;
        saveToStorage(this.KEYS.CURRENT_USER, sessionUser);

        return { success: true, user: sessionUser };
    },

    /**
     * ออกจากระบบ
     */
    logout() {
        localStorage.removeItem(this.KEYS.CURRENT_USER);
        return { success: true };
    },

    /**
     * ดึงข้อมูลผู้ใช้ปัจจุบัน
     */
    getCurrentUser() {
        return getFromStorage(this.KEYS.CURRENT_USER);
    },

    /**
     * ตรวจสอบสิทธิ์การเข้าถึง
     */
    checkRole(allowedRoles) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return allowedRoles.includes(user.role);
    },

    /**
     * เปลี่ยนหน้าตามสิทธิ์
     */
    redirectByRole() {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const currentPage = window.location.pathname.split('/').pop();

        switch (user.role) {
            case 'admin':
                if (currentPage !== 'admin.html') window.location.href = 'admin.html';
                break;
            case 'staff':
                if (currentPage !== 'staff.html') window.location.href = 'staff.html';
                break;
            default:
                // ลูกค้าอยู่หน้า customer ได้
                break;
        }
    }
};

// ============================================
// ระบบเมนูอาหาร (Menu Management)
// ============================================

const Menu = {
    KEY: 'food_order_menus',

    /**
     * เริ่มต้นระบบ - สร้างเมนูตัวอย่าง
     */
    init() {
        const menus = getFromStorage(this.KEY, []);
        if (menus.length === 0) {
            const defaultMenus = [
                {
                    id: generateId(),
                    name: 'ข้าวผัดกระเพราหมูสับ',
                    description: 'ข้าวผัดกระเพราร้อนๆ ใส่ไข่ดาว',
                    price: 65,
                    category: 'อาหารจานเดียว',
                    image: '🍛',
                    tags: ['ขายดี'],
                    available: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'ต้มยำกุ้ง',
                    description: 'ต้มยำน้ำข้น กุ้งสดๆ',
                    price: 120,
                    category: 'อาหารทะเล',
                    image: '🦐',
                    tags: ['แนะนำ'],
                    available: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'ผัดไทยกุ้งสด',
                    description: 'ผัดไทยเส้นเหนียวนุ่ม กุ้งสดตัวใหญ่',
                    price: 80,
                    category: 'อาหารจานเดียว',
                    image: '🍜',
                    tags: ['ขายดี'],
                    available: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'ชาเย็น',
                    description: 'ชาเย็นหวานหอม',
                    price: 35,
                    category: 'เครื่องดื่ม',
                    image: '🧋',
                    tags: [],
                    available: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'น้ำส้มคั้น',
                    description: 'น้ำส้มคั้นสด ไม่添加น้ำตาล',
                    price: 45,
                    category: 'เครื่องดื่ม',
                    image: '🍊',
                    tags: ['สุขภาพ'],
                    available: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'ส้มตำไทย',
                    description: 'ส้มตำรสแซ่บ ถั่วฝักยาว',
                    price: 55,
                    category: 'อาหารอีสาน',
                    image: '🥗',
                    tags: ['เผ็ด'],
                    available: true,
                    createdAt: new Date().toISOString()
                }
            ];
            saveToStorage(this.KEY, defaultMenus);
        }
    },

    /**
     * ดึงรายการเมนูทั้งหมด
     */
    getAll() {
        return getFromStorage(this.KEY, []);
    },

    /**
     * ดึงเมนูตาม ID
     */
    getById(id) {
        const menus = this.getAll();
        return menus.find(m => m.id === id);
    },

    /**
     * ดึงเมนูตามหมวดหมู่
     */
    getByCategory(category) {
        const menus = this.getAll();
        if (category === 'all') return menus.filter(m => m.available);
        return menus.filter(m => m.category === category && m.available);
    },

    /**
     * ดึงหมวดหมู่ทั้งหมด
     */
    getCategories() {
        const menus = this.getAll();
        const categories = [...new Set(menus.map(m => m.category))];
        return categories;
    },

    /**
     * เพิ่มเมนูใหม่
     */
    add(menuData) {
        const menus = this.getAll();
        const newMenu = {
            id: generateId(),
            ...menuData,
            createdAt: new Date().toISOString()
        };
        menus.push(newMenu);
        saveToStorage(this.KEY, menus);
        return newMenu;
    },

    /**
     * แก้ไขเมนู
     */
    update(id, updates) {
        const menus = this.getAll();
        const index = menus.findIndex(m => m.id === id);
        if (index !== -1) {
            menus[index] = { ...menus[index], ...updates };
            saveToStorage(this.KEY, menus);
            return menus[index];
        }
        return null;
    },

    /**
     * ลบเมนู
     */
    delete(id) {
        const menus = this.getAll();
        const filtered = menus.filter(m => m.id !== id);
        saveToStorage(this.KEY, filtered);
        return true;
    }
};

// ============================================
// ระบบตะกร้า (Cart)
// ============================================

const Cart = {
    KEY: 'food_order_cart',

    /**
     * ดึงข้อมูลตะกร้า
     */
    get() {
        const tableId = new URLSearchParams(window.location.search).get('table') || '1';
        const carts = getFromStorage(this.KEY, {});
        return carts[tableId] || { items: [], tableId };
    },

    /**
     * บันทึกตะกร้า
     */
    save(cart) {
        const tableId = new URLSearchParams(window.location.search).get('table') || '1';
        const carts = getFromStorage(this.KEY, {});
        carts[tableId] = cart;
        saveToStorage(this.KEY, carts);
    },

    /**
     * เพิ่มสินค้า
     */
    addItem(menuItem, quantity = 1, note = '') {
        const cart = this.get();
        const existingIndex = cart.items.findIndex(item => item.menuId === menuItem.id);

        if (existingIndex !== -1) {
            cart.items[existingIndex].quantity += quantity;
            if (note) cart.items[existingIndex].note = note;
        } else {
            cart.items.push({
                menuId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity,
                note,
                image: menuItem.image
            });
        }

        this.save(cart);
        return cart;
    },

    /**
     * อัพเดทจำนวน
     */
    updateQuantity(menuId, quantity) {
        const cart = this.get();
        const index = cart.items.findIndex(item => item.menuId === menuId);

        if (index !== -1) {
            if (quantity <= 0) {
                cart.items.splice(index, 1);
            } else {
                cart.items[index].quantity = quantity;
            }
            this.save(cart);
        }

        return cart;
    },

    /**
     * ลบสินค้า
     */
    removeItem(menuId) {
        const cart = this.get();
        cart.items = cart.items.filter(item => item.menuId !== menuId);
        this.save(cart);
        return cart;
    },

    /**
     * ล้างตะกร้า
     */
    clear() {
        const cart = this.get();
        cart.items = [];
        this.save(cart);
        return cart;
    },

    /**
     * คำนวณยอดรวม
     */
    getTotal() {
        const cart = this.get();
        return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    /**
     * นับจำนวนสินค้า
     */
    getCount() {
        const cart = this.get();
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }
};

// ============================================
// ระบบออเดอร์ (Order Management)
// ============================================

const Order = {
    KEY: 'food_order_orders',

    /**
     * ดึงออเดอร์ทั้งหมด
     */
    getAll() {
        return getFromStorage(this.KEY, []);
    },

    /**
     * ดึงออเดอร์ตาม ID
     */
    getById(id) {
        const orders = this.getAll();
        return orders.find(o => o.id === id);
    },

    /**
     * ดึงออเดอร์ตามโต๊ะ
     */
    getByTable(tableId) {
        const orders = this.getAll();
        return orders.filter(o => o.tableId === tableId).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    },

    /**
     * สร้างออเดอร์ใหม่
     */
    create(cartItems, tableId, note = '') {
        const orders = this.getAll();

        const newOrder = {
            id: generateId(),
            tableId,
            items: cartItems.map(item => ({
                ...item,
                status: 'pending'
            })),
            note,
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: null,
            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        orders.push(newOrder);
        saveToStorage(this.KEY, orders);

        // สร้างการแจ้งเตือน
        Notification.create('order', `ออเดอร์ใหม่จากโต๊ะ ${tableId}`, newOrder.id);

        return newOrder;
    },

    /**
     * อัพเดทสถานะออเดอร์
     */
    updateStatus(orderId, status) {
        const orders = this.getAll();
        const index = orders.findIndex(o => o.id === orderId);

        if (index !== -1) {
            orders[index].status = status;
            orders[index].updatedAt = new Date().toISOString();
            saveToStorage(this.KEY, orders);

            // สร้างการแจ้งเตือน
            Notification.create('status', `ออเดอร์ #${orderId.slice(-6)} เปลี่ยนสถานะเป็น ${this.getStatusText(status)}`, orderId);

            return orders[index];
        }
        return null;
    },

    /**
     * อัพเดทสถานะรายการอาหาร
     */
    updateItemStatus(orderId, itemIndex, status) {
        const orders = this.getAll();
        const index = orders.findIndex(o => o.id === orderId);

        if (index !== -1 && orders[index].items[itemIndex]) {
            orders[index].items[itemIndex].status = status;
            orders[index].updatedAt = new Date().toISOString();
            saveToStorage(this.KEY, orders);
            return orders[index];
        }
        return null;
    },

    /**
     * อัพเดทการชำระเงิน
     */
    updatePayment(orderId, paymentMethod) {
        const orders = this.getAll();
        const index = orders.findIndex(o => o.id === orderId);

        if (index !== -1) {
            orders[index].paymentStatus = 'paid';
            orders[index].paymentMethod = paymentMethod;
            orders[index].updatedAt = new Date().toISOString();
            saveToStorage(this.KEY, orders);
            return orders[index];
        }
        return null;
    },

    /**
     * แปลงสถานะเป็นข้อความ
     */
    getStatusText(status) {
        const statusMap = {
            'pending': 'รอดำเนินการ',
            'cooking': 'กำลังทำ',
            'ready': 'พร้อมเสิร์ฟ',
            'served': 'เสิร์ฟแล้ว',
            'cancelled': 'ยกเลิก'
        };
        return statusMap[status] || status;
    },

    /**
     * ดึงสีของสถานะ
     */
    getStatusColor(status) {
        const colorMap = {
            'pending': 'badge-pending',
            'cooking': 'badge-cooking',
            'ready': 'badge-ready',
            'served': 'badge-served',
            'cancelled': 'badge-cancelled'
        };
        return colorMap[status] || 'badge-pending';
    },

    /**
     * คำนวณยอดขาย
     */
    getSalesReport(startDate = null, endDate = null) {
        const orders = this.getAll().filter(o => o.paymentStatus === 'paid');

        let filteredOrders = orders;
        if (startDate && endDate) {
            filteredOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
            });
        }

        const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        const totalOrders = filteredOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // ยอดขายตามหมวดหมู่
        const menuIds = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!menuIds[item.menuId]) {
                    menuIds[item.menuId] = { name: item.name, quantity: 0, revenue: 0 };
                }
                menuIds[item.menuId].quantity += item.quantity;
                menuIds[item.menuId].revenue += item.price * item.quantity;
            });
        });

        return {
            totalSales,
            totalOrders,
            avgOrderValue,
            topItems: Object.values(menuIds).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
        };
    }
};

// ============================================
// ระบบแชท (Chat)
// ============================================

const Chat = {
    KEY: 'food_order_messages',

    /**
     * ส่งข้อความ
     */
    send(tableId, orderId, message, sender) {
        const messages = getFromStorage(this.KEY, []);
        const newMessage = {
            id: generateId(),
            tableId,
            orderId,
            message,
            sender, // 'customer' หรือ 'staff'
            timestamp: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        saveToStorage(this.KEY, messages);
        return newMessage;
    },

    /**
     * ดึงข้อความตามโต๊ะ
     */
    getByTable(tableId) {
        const messages = getFromStorage(this.KEY, []);
        return messages.filter(m => m.tableId === tableId).sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
    },

    /**
     * ดึงข้อความทั้งหมด
     */
    getAll() {
        const messages = getFromStorage(this.KEY, []);
        return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    /**
     * ทำเครื่องหมายว่าอ่านแล้ว
     */
    markAsRead(tableId) {
        const messages = getFromStorage(this.KEY, []);
        messages.forEach(m => {
            if (m.tableId === tableId && m.sender === 'staff') {
                m.read = true;
            }
        });
        saveToStorage(this.KEY, messages);
    }
};

// ============================================
// ระบบแจ้งเตือน (Notifications)
// ============================================

const Notification = {
    KEY: 'food_order_notifications',

    /**
     * สร้างการแจ้งเตือน
     */
    create(type, message, referenceId = null) {
        const notifications = getFromStorage(this.KEY, []);
        const newNotification = {
            id: generateId(),
            type, // 'order', 'status', 'call', 'system'
            message,
            referenceId,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifications.unshift(newNotification);

        // เก็บแค่ 50 รายการล่าสุด
        if (notifications.length > 50) {
            notifications.pop();
        }

        saveToStorage(this.KEY, notifications);
        return newNotification;
    },

    /**
     * ดึงการแจ้งเตือนทั้งหมด
     */
    getAll() {
        return getFromStorage(this.KEY, []);
    },

    /**
     * ดึงการแจ้งเตือนที่ยังไม่อ่าน
     */
    getUnread() {
        const notifications = this.getAll();
        return notifications.filter(n => !n.read);
    },

    /**
     * ทำเครื่องหมายว่าอ่านแล้ว
     */
    markAsRead(id) {
        const notifications = this.getAll();
        const index = notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications[index].read = true;
            saveToStorage(this.KEY, notifications);
        }
    },

    /**
     * ทำเครื่องหมายว่าอ่านทั้งหมด
     */
    markAllAsRead() {
        const notifications = this.getAll();
        notifications.forEach(n => n.read = true);
        saveToStorage(this.KEY, notifications);
    }
};

// ============================================
// ระบบแจ้งปัญหา (Issues)
// ============================================

const Issue = {
    KEY: 'food_order_issues',

    /**
     * สร้างรายงานปัญหา
     */
    create(title, description, reportedBy, tableId = null) {
        const issues = getFromStorage(this.KEY, []);
        const newIssue = {
            id: generateId(),
            title,
            description,
            reportedBy,
            tableId,
            status: 'open', // open, in-progress, resolved
            resolution: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        issues.push(newIssue);
        saveToStorage(this.KEY, issues);

        Notification.create('system', `มีการแจ้งปัญหาใหม่: ${title}`, newIssue.id);

        return newIssue;
    },

    /**
     * ดึงรายการปัญหาทั้งหมด
     */
    getAll() {
        return getFromStorage(this.KEY, []);
    },

    /**
     * อัพเดทสถานะปัญหา
     */
    updateStatus(id, status, resolution = null) {
        const issues = this.getAll();
        const index = issues.findIndex(i => i.id === id);
        if (index !== -1) {
            issues[index].status = status;
            if (resolution) issues[index].resolution = resolution;
            issues[index].updatedAt = new Date().toISOString();
            saveToStorage(this.KEY, issues);
            return issues[index];
        }
        return null;
    }
};

// ============================================
// เริ่มต้นระบบ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // เริ่มต้นระบบทั้งหมด
    Auth.init();
    Menu.init();
});
