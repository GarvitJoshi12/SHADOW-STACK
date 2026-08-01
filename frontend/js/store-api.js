/* Shared client for the Shadow Stack Grocery Store API. */
(function () {
    const API = "/api";
    const TOKEN_KEY = "shadowStackToken";
    const USER_KEY = "shadowStackUser";
    const CUSTOMER_KEY = "shadowStackDelivery";
    const DISCOUNT_RATE = 0.12;

    const normalise = value => (value || "").trim().toLowerCase();
    const money = value => `₹${Number(value).toFixed(2).replace(".00", "")}`;
    const currentUser = () => JSON.parse(localStorage.getItem(USER_KEY) || "null");
    const cartKey = () => {
        const user = currentUser();
        return user ? `shadowStackCart:${user.id}` : null;
    };
    const cart = () => {
        const key = cartKey();
        return key ? JSON.parse(localStorage.getItem(key) || "[]") : [];
    };
    const saveCart = items => {
        const key = cartKey();
        if (key) localStorage.setItem(key, JSON.stringify(items));
    };
    const request = async (path, options = {}) => {
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(API + path, { ...options, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        return data;
    };
    const setMessage = (message, error = true) => {
        let box = document.getElementById("store-message");
        if (!box) {
            box = document.createElement("p"); box.id = "store-message";
            box.style.cssText = "text-align:center;padding:10px;font-family:Arial;";
            (document.querySelector("form") || document.body).prepend(box);
        }
        box.style.color = error ? "#b00020" : "#198754";
        box.textContent = message;
    };
    const showToast = message => {
        let toast = document.getElementById("store-toast");
        if (!toast) {
            toast = document.createElement("div"); toast.id = "store-toast";
            toast.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:9999;background:#198754;color:#fff;padding:14px 20px;border-radius:8px;box-shadow:0 6px 20px #0004;font:600 15px Arial;opacity:0;transform:translateY(12px);transition:.25s;";
            document.body.append(toast);
        }
        toast.textContent = message; toast.style.opacity = "1"; toast.style.transform = "translateY(0)";
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(12px)"; }, 2600);
    };
    const refreshBadges = () => {
        const count = cart().reduce((total, item) => total + item.quantity, 0);
        document.querySelectorAll(".cart span").forEach(badge => { badge.textContent = count; });
    };
    const productIcons = {
        apple: "🍎", chili: "🌶️", onion: "🧅", potato: "🥔", oranges: "🍊", tomato: "🍅", garlic: "🧄",
        "johnson's baby oil": "🍼", "little's baby wipes": "🧻", "mama earth baby moisturizer": "🧴",
        "himalaya baby shampoo": "🧴", "johnson's baby powder": "👶", "pampers baby pants": "👶",
        "lakme blush and glow face wash": "🧼", "ponds men pollution out facewash": "🧼", "nivea body milk": "🧴",
        "nivea lip balm": "💄", "berado hair growth oil": "🧴", "olay total effects day cream": "🧴",
        "cetirizine 10mg": "💊", "cufril-d cough syrup": "🧪", "cheston cold": "💊", "dolo 650": "💊",
        "metolar xr 50": "💊", "gelusil chewable tablets": "💊", "big pack": "🧺", "large pack": "🧺", "small pack": "🧺",
        "fruits & vegetables": "🥬", medicine: "💊", "baby care": "🍼", beauty: "🧴"
    };
    const productImages = {
        apple: "/images/apple.jfif", chili: "/images/chilli.jfif", onion: "/images/onion.jpg", potato: "/images/potato.png",
        oranges: "/images/oranges.jpg", tomato: "/images/tomato.png", garlic: "/images/garlic.png",
        "johnson's baby oil": "/images/johnson.jpg", "little's baby wipes": "/images/wipes.jpg",
        "mama earth baby moisturizer": "/images/mama%20earth.jpg", "himalaya baby shampoo": "/images/shampoo.jpg",
        "johnson's baby powder": "/images/powder.jpg", "pampers baby pants": "/images/pants.jpg",
        "lakme blush and glow face wash": "/images/lakme.jpg", "ponds men pollution out facewash": "/images/ponds%20men.jpg",
        "nivea body milk": "/images/nivea.jpg", "nivea lip balm": "/images/lip.jpg", "berado hair growth oil": "/images/beardo.jpg",
        "olay total effects day cream": "/images/olay.jpg", "cetirizine 10mg": "/images/cetirizine.jpg",
        "cufril-d cough syrup": "/images/cufril.jpg", "cheston cold": "/images/cheston.png", "dolo 650": "/images/dolo.jpg",
        "metolar xr 50": "/images/metolar.png", "gelusil chewable tablets": "/images/gelusil.jpg",
        "big pack": "/images/big%20pack.png", "large pack": "/images/large%20pack.jpg", "small pack": "/images/small%20pack.png"
    };
    const productImageUrl = product => productImages[normalise(product.name)] || `/images/products/${product.id}.svg`;
    const imageLabel = image => image.closest(".product")?.querySelector("h3")?.textContent ||
        image.closest(".product-box")?.querySelector("strong")?.textContent ||
        image.closest(".category-box")?.querySelector("span")?.textContent || image.alt || "Grocery product";
    const localProductImage = label => {
        const cleanLabel = label.trim().replace(/\s+/g, " ");
        const icon = productIcons[normalise(cleanLabel)] || "🛒";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#edf8ef"/><circle cx="320" cy="178" r="112" fill="#d5f1db"/><text x="320" y="215" text-anchor="middle" font-size="150">${icon}</text><text x="320" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="#276d37">${cleanLabel.replace(/&/g, "and")}</text></svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };
    const useImageFallbacks = () => {
        document.querySelectorAll("img").forEach(image => {
            const fallback = () => {
                if (!image.dataset.fallbackApplied) {
                    image.dataset.fallbackApplied = "true";
                    image.src = localProductImage(imageLabel(image));
                }
            };
            image.addEventListener("error", fallback, { once: true });
            if (image.complete && image.naturalWidth === 0) fallback();
        });
    };

    async function connectProductCards() {
        const cards = [...document.querySelectorAll(".product-box")];
        if (!cards.length) return;
        let products;
        try { products = await request("/products"); }
        catch (error) { console.warn("Product API is unavailable", error); return; }
        const byName = new Map(products.map(product => [normalise(product.name), product]));
        cards.forEach(card => {
            const name = normalise(card.querySelector("strong")?.textContent);
            const product = byName.get(name);
            const button = card.querySelector(".cart-btn");
            if (!product || !button) return;
            card.dataset.productId = product.id;
            const image = card.querySelector("img");
            if (image) {
                image.src = productImageUrl(product);
                image.alt = product.name;
            }
            const price = card.querySelector(".price");
            if (price) price.textContent = `Rs. ${product.price}`;
            button.addEventListener("click", event => {
                event.preventDefault();
                if (!currentUser() || !localStorage.getItem(TOKEN_KEY)) {
                    showToast("Please sign in before adding items to your cart.");
                    setTimeout(() => { window.location.href = "Login And Registration HTML.html"; }, 900);
                    return;
                }
                const items = cart();
                const existing = items.find(item => item.productId === product.id);
                if (existing) existing.quantity += 1;
                else items.push({ productId: product.id, name: product.name, price: product.price,
                    image: productImageUrl(product), quantity: 1 });
                saveCart(items); refreshBadges(); showToast(`${product.name} has been added to your cart.`);
            });
        });
    }

    function renderCart() {
        const container = document.querySelector(".products");
        if (!container || !document.querySelector(".cart-total")) return;
        const items = cart();
        const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
        if (!items.length) {
            container.innerHTML = `<div class="empty-cart"><div><div class="empty-cart-icon"><i class="fa-solid fa-basket-shopping"></i></div>
                <h2>Your cart is empty</h2><p>Add your everyday essentials and they will appear here.</p>
                <a class="shop-now" href="Home Page HTML.html">Start shopping</a></div></div>`;
        } else container.innerHTML = items.map(item => `<article class="product" data-id="${item.productId}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
            <div class="product-info"><h3>${escapeHtml(item.name)}</h3>
                <p class="unit-price">Unit price <strong>${money(item.price)}</strong></p>
                <div class="product-actions"><div class="quantity-control" aria-label="Quantity for ${escapeHtml(item.name)}">
                    <button class="quantity-btn" data-change="-1" type="button" aria-label="Decrease quantity">−</button>
                    <input type="number" class="qty" min="1" max="99" value="${item.quantity}" aria-label="Quantity">
                    <button class="quantity-btn" data-change="1" type="button" aria-label="Increase quantity">+</button>
                </div><button class="remove-btn" type="button"><i class="fa-regular fa-trash-can"></i> Remove</button></div>
            </div><div class="product-line-total"><span>Item total</span><strong>${money(Number(item.price) * Number(item.quantity))}</strong></div>
        </article>`).join("");
        useImageFallbacks();
        const update = () => {
            const current = cart();
            const subtotal = current.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
            const saving = subtotal * DISCOUNT_RATE;
            document.getElementById("originalPrice").textContent = money(subtotal);
            document.getElementById("totalSave").textContent = money(saving);
            document.getElementById("totalPrice").textContent = money(subtotal - saving);
            document.getElementById("totalItems").textContent = current.reduce((sum, item) => sum + item.quantity, 0);
            const itemLabel = document.getElementById("cartItemLabel");
            const count = current.reduce((sum, item) => sum + item.quantity, 0);
            if (itemLabel) itemLabel.textContent = `${count} ${count === 1 ? "item" : "items"}`;
            const checkout = document.querySelector(".checkout-button");
            if (checkout) {
                checkout.classList.toggle("is-disabled", !current.length);
                checkout.setAttribute("aria-disabled", String(!current.length));
            }
            refreshBadges();
        };
        if (!container.dataset.cartBound) {
            container.addEventListener("input", event => {
                if (!event.target.matches(".qty")) return;
                const current = cart();
                const item = current.find(entry => entry.productId === Number(event.target.closest(".product").dataset.id));
                if (item) { item.quantity = Math.min(99, Math.max(1, Number(event.target.value) || 1)); saveCart(current); renderCart(); }
            });
            container.addEventListener("click", event => {
                const quantityButton = event.target.closest(".quantity-btn");
                if (quantityButton) {
                    const current = cart();
                    const item = current.find(entry => entry.productId === Number(quantityButton.closest(".product").dataset.id));
                    if (item) { item.quantity = Math.min(99, Math.max(1, Number(item.quantity) + Number(quantityButton.dataset.change))); saveCart(current); renderCart(); }
                    return;
                }
                const button = event.target.closest(".remove-btn"); if (!button) return;
                saveCart(cart().filter(item => item.productId !== Number(button.closest(".product").dataset.id)));
                renderCart();
            });
            container.dataset.cartBound = "true";
        }
        update();
    }

    function connectDelivery() {
        const form = document.querySelector(".address_form"); if (!form) return;
        form.addEventListener("submit", event => {
            event.preventDefault();
            const customer = Object.fromEntries(["name", "address", "email", "locality", "pincode", "phone", "date", "time"]
                .map(id => [id, document.getElementById(id)?.value.trim() || ""]));
            if (Object.values(customer).some(value => !value)) return setMessage("Please complete every delivery field.");
            sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: customer.name, address: customer.address, email: customer.email,
                locality: customer.locality, pincode: customer.pincode, phone: customer.phone, deliveryDate: customer.date, deliveryTime: customer.time }));
            window.location.href = "Payment HTML.html";
        });
    }

    function connectAccounts() {
        const loginForm = document.querySelector(".sign_in_btn")?.closest("form");
        const registrationForm = document.querySelector(".sign_up_btn")?.closest("form");
        const submit = async (form, endpoint, fields) => {
            const button = form.querySelector("button[type=submit]"); if (button) button.disabled = true;
            try {
                const values = form.querySelectorAll("input"); const payload = {};
                fields.forEach((field, index) => payload[field] = values[index].value.trim());
                const data = await request(endpoint, { method: "POST", body: JSON.stringify(payload) });
                localStorage.setItem(TOKEN_KEY, data.token); localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                window.location.href = "Home Page HTML.html";
            } catch (error) { setMessage(error.message); }
            finally { if (button) button.disabled = false; }
        };
        if (loginForm) loginForm.addEventListener("submit", event => { event.preventDefault(); submit(loginForm, "/auth/login", ["email", "password"]); });
        if (registrationForm) registrationForm.addEventListener("submit", event => { event.preventDefault(); submit(registrationForm, "/auth/register", ["name", "email", "password", "phone"]); });
    }

    function connectPayment() {
        const form = document.querySelector(".submit-btn")?.closest("form"); if (!form) return;
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const customer = JSON.parse(sessionStorage.getItem(CUSTOMER_KEY) || "null");
            if (!customer || !cart().length) return setMessage("Your delivery details or cart are missing. Please return to checkout.");
            try {
                const result = await request("/orders", { method: "POST", body: JSON.stringify({ customer, items: cart() }) });
                saveCart([]); sessionStorage.removeItem(CUSTOMER_KEY);
                window.location.href = `Payment Confirmation HTML and CSS.html?order=${result.orderId}`;
            } catch (error) { setMessage(error.message); }
        });
    }

    document.addEventListener("DOMContentLoaded", () => { useImageFallbacks(); refreshBadges(); connectProductCards(); renderCart(); connectDelivery(); connectAccounts(); connectPayment(); });
})();
