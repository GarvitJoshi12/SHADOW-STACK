(function () {
    const token = localStorage.getItem("shadowStackToken");
    const userKey = "shadowStackUser";
    const loginPage = "Login And Registration HTML.html";
    if (!token) { window.location.replace(loginPage); return; }
    const request = async path => {
        const response = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your profile.");
        return data;
    };
    const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
    const formatMoney = value => `₹${Number(value).toFixed(2).replace(".00", "")}`;
    const formatDate = value => value ? new Date(value).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";
    const renderUser = user => {
        document.getElementById("profile-name").textContent = user.name;
        document.getElementById("profile-email").textContent = user.email;
        document.getElementById("account-details").innerHTML = [
            ["Full name", user.name], ["Email address", user.email], ["Phone number", user.phone || "Not provided"], ["Account type", user.role]
        ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
        localStorage.setItem(userKey, JSON.stringify(user));
    };
    const renderOrders = orders => {
        const container = document.getElementById("orders");
        if (!orders.length) { container.innerHTML = '<p class="muted">No orders yet. Start shopping to see your orders here.</p>'; return; }
        container.innerHTML = orders.map(order => `<article class="order"><div class="order-top"><div><h3>Order #${order.id}</h3><p>Placed ${formatDate(order.created_at)}</p></div><span class="status">${escapeHtml(order.status)}</span></div>
            <p class="order-items">${order.items.map(item => `${escapeHtml(item.product_name)} × ${item.quantity}`).join(", ")}</p>
            <p><strong>Total: ${formatMoney(order.total)}</strong></p><p class="delivery"><strong>Delivery:</strong> ${escapeHtml(order.address)}, ${escapeHtml(order.locality)}, ${escapeHtml(order.pincode)}<br>${formatDate(order.delivery_date)} · ${escapeHtml(order.delivery_time)} · ${escapeHtml(order.phone)}</p></article>`).join("");
    };
    document.getElementById("logout-button").addEventListener("click", () => { localStorage.removeItem("shadowStackToken"); localStorage.removeItem(userKey); window.location.href = loginPage; });
    Promise.all([request("/auth/me"), request("/orders")]).then(([user, orders]) => { renderUser(user); renderOrders(orders); }).catch(error => { localStorage.removeItem("shadowStackToken"); localStorage.removeItem(userKey); window.location.replace(loginPage); });
})();
