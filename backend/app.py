"""Shadow Stack Grocery Store backend.

Run this file after installing requirements. It serves both the API and the
existing frontend, so the browser and API always use the same address.
"""
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from html import escape

from flask import Flask, Response, g, jsonify, request, send_from_directory
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent.parent
DATABASE = Path(__file__).resolve().parent / "grocery.db"
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-before-deploying")
app = Flask(__name__, static_folder=None)
CORS(app)
serializer = URLSafeTimedSerializer(SECRET_KEY)

PRODUCTS = [
    ("Apple", "Fruits & Vegetables", 100), ("Chili", "Fruits & Vegetables", 80),
    ("Onion", "Fruits & Vegetables", 50), ("Potato", "Fruits & Vegetables", 60),
    ("Oranges", "Fruits & Vegetables", 80), ("Tomato", "Fruits & Vegetables", 80),
    ("Garlic", "Fruits & Vegetables", 50), ("Johnson's Baby Oil", "Baby Care", 180),
    ("Little's Baby Wipes", "Baby Care", 120), ("Mama Earth Baby Moisturizer", "Baby Care", 250),
    ("Himalaya Baby Shampoo", "Baby Care", 160), ("Johnson's Baby Powder", "Baby Care", 130),
    ("Pampers Baby Pants", "Baby Care", 420), ("Lakme Blush and Glow Face Wash", "Beauty", 210),
    ("Ponds Men Pollution Out Facewash", "Beauty", 190), ("Nivea Body Milk", "Beauty", 225),
    ("Nivea Lip Balm", "Beauty", 120), ("Berado Hair Growth Oil", "Beauty", 300),
    ("Olay Total Effects Day Cream", "Beauty", 450), ("Cetirizine 10mg", "Medicine", 35),
    ("CUFRIL-D Cough Syrup", "Medicine", 110), ("Cheston Cold", "Medicine", 55),
    ("Dolo 650", "Medicine", 30), ("Metolar XR 50", "Medicine", 90),
    ("Gelusil Chewable Tablets", "Medicine", 75), ("Big Pack", "Packages", 500),
    ("Large Pack", "Packages", 800), ("Small Pack", "Packages", 300)
]

PRODUCT_ICONS = {
    "apple": "🍎", "chili": "🌶️", "onion": "🧅", "potato": "🥔", "oranges": "🍊", "tomato": "🍅", "garlic": "🧄",
    "johnson's baby oil": "🍼", "little's baby wipes": "🧻", "mama earth baby moisturizer": "🧴",
    "himalaya baby shampoo": "🧴", "johnson's baby powder": "👶", "pampers baby pants": "👶",
    "lakme blush and glow face wash": "🧼", "ponds men pollution out facewash": "🧼", "nivea body milk": "🧴",
    "nivea lip balm": "💄", "berado hair growth oil": "🧴", "olay total effects day cream": "🧴",
    "cetirizine 10mg": "💊", "cufril-d cough syrup": "🧪", "cheston cold": "💊", "dolo 650": "💊",
    "metolar xr 50": "💊", "gelusil chewable tablets": "💊", "big pack": "🧺", "large pack": "🧺", "small pack": "🧺"
}

def db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(_error=None):
    connection = g.pop("db", None)
    if connection:
        connection.close()

def initialise_database():
    connection = sqlite3.connect(DATABASE)
    connection.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, phone TEXT, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, category TEXT NOT NULL,
            price REAL NOT NULL CHECK(price >= 0), active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY, user_id INTEGER, customer_name TEXT NOT NULL, email TEXT NOT NULL,
            phone TEXT NOT NULL, address TEXT NOT NULL, locality TEXT NOT NULL, pincode TEXT NOT NULL,
            delivery_date TEXT NOT NULL, delivery_time TEXT NOT NULL, total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'placed', created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL, unit_price REAL NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0),
            FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(product_id) REFERENCES products(id)
        );
    """)
    connection.executemany("INSERT OR IGNORE INTO products (name, category, price) VALUES (?, ?, ?)", PRODUCTS)
    connection.commit()
    connection.close()

def user_from_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        user_id = serializer.loads(header[7:], max_age=timedelta(days=7).total_seconds())
    except (BadSignature, SignatureExpired):
        return None
    return db().execute("SELECT id, name, email, phone, role FROM users WHERE id = ?", (user_id,)).fetchone()

def require_role(role=None):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            user = user_from_token()
            if not user or (role and user["role"] != role):
                return jsonify(error="You are not authorised for this action."), 401
            return handler(user, *args, **kwargs)
        return wrapped
    return decorator

def token_for(user_id):
    return serializer.dumps(user_id)

def public_user(user):
    return {key: user[key] for key in ("id", "name", "email", "phone", "role")}

@app.get("/api/health")
def health():
    return jsonify(status="ok")

@app.get("/api/products")
def products():
    category = request.args.get("category")
    query = "SELECT id, name, category, price FROM products WHERE active = 1"
    values = []
    if category:
        query += " AND category = ?"
        values.append(category)
    return jsonify([dict(row) for row in db().execute(query + " ORDER BY name", values)])

@app.get("/images/products/<int:product_id>.svg")
def product_illustration(product_id):
    """Local, offline-friendly illustration for every seeded product."""
    product = db().execute("SELECT name, category FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        return jsonify(error="Product image not found."), 404
    name = product["name"]
    icon = PRODUCT_ICONS.get(name.lower(), "🛒")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="{escape(name)}">
      <rect width="640" height="420" fill="#edf8ef"/><circle cx="320" cy="178" r="112" fill="#d5f1db"/>
      <text x="320" y="215" text-anchor="middle" font-size="150">{icon}</text>
      <text x="320" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="#276d37">{escape(name)}</text>
    </svg>'''
    return Response(svg, mimetype="image/svg+xml")

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = (str(data.get(key, "")).strip() for key in ("name", "email", "password"))
    if not name or not email or len(password) < 8:
        return jsonify(error="Name, email, and a password of at least 8 characters are required."), 400
    try:
        role = "admin" if email.lower() == os.getenv("ADMIN_EMAIL", "").strip().lower() else "customer"
        cursor = db().execute("INSERT INTO users (name, email, password_hash, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                              (name, email.lower(), generate_password_hash(password), str(data.get("phone", "")).strip(), role, datetime.now(timezone.utc).isoformat()))
        db().commit()
    except sqlite3.IntegrityError:
        return jsonify(error="An account with this email already exists."), 409
    user = db().execute("SELECT id, name, email, phone, role FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(token=token_for(user["id"]), user=public_user(user)), 201

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    user = db().execute("SELECT * FROM users WHERE email = ?", (str(data.get("email", "")).strip().lower(),)).fetchone()
    if not user or not check_password_hash(user["password_hash"], str(data.get("password", ""))):
        return jsonify(error="Incorrect email or password."), 401
    return jsonify(token=token_for(user["id"]), user=public_user(user))

@app.get("/api/auth/me")
@require_role()
def me(user):
    return jsonify(public_user(user))

@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    customer = data.get("customer") or {}
    required = ("name", "email", "phone", "address", "locality", "pincode", "deliveryDate", "deliveryTime")
    if any(not str(customer.get(field, "")).strip() for field in required):
        return jsonify(error="Please complete every delivery field."), 400
    requested_items = data.get("items") or []
    if not requested_items:
        return jsonify(error="Your cart is empty."), 400
    product_ids = [item.get("productId") for item in requested_items]
    rows = db().execute("SELECT id, name, price FROM products WHERE active = 1 AND id IN ({})".format(",".join("?" * len(product_ids))), product_ids).fetchall()
    product_map = {row["id"]: row for row in rows}
    if len(product_map) != len(set(product_ids)):
        return jsonify(error="One or more cart products are unavailable."), 400
    items, subtotal = [], 0
    for item in requested_items:
        product = product_map[item["productId"]]
        quantity = int(item.get("quantity", 0))
        if quantity < 1 or quantity > 99:
            return jsonify(error="Each quantity must be between 1 and 99."), 400
        subtotal += product["price"] * quantity
        items.append((product, quantity))
    discount = round(subtotal * 0.12, 2)
    total = round(subtotal - discount, 2)
    signed_in_user = user_from_token()
    cursor = db().execute("""INSERT INTO orders (user_id, customer_name, email, phone, address, locality, pincode, delivery_date, delivery_time, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (signed_in_user["id"] if signed_in_user else None, *[str(customer[field]).strip() for field in required], total, datetime.now(timezone.utc).isoformat()))
    db().executemany("INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)",
                     [(cursor.lastrowid, product["id"], product["name"], product["price"], quantity) for product, quantity in items])
    db().commit()
    return jsonify(orderId=cursor.lastrowid, subtotal=round(subtotal, 2), discount=discount, total=total, status="placed"), 201

@app.get("/api/orders")
@require_role()
def my_orders(user):
    orders = [dict(row) for row in db().execute("""SELECT id, customer_name, email, phone, address, locality, pincode,
        delivery_date, delivery_time, total, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC""", (user["id"],))]
    for order in orders:
        order["items"] = [dict(item) for item in db().execute("SELECT product_name, unit_price, quantity FROM order_items WHERE order_id = ?", (order["id"],))]
    return jsonify(orders)

@app.get("/api/admin/orders")
@require_role("admin")
def admin_orders(_user):
    return jsonify([dict(row) for row in db().execute("SELECT id, customer_name, email, total, status, created_at FROM orders ORDER BY id DESC")])

@app.post("/api/admin/products")
@require_role("admin")
def add_product(_user):
    data = request.get_json(silent=True) or {}
    try:
        cursor = db().execute("INSERT INTO products (name, category, price) VALUES (?, ?, ?)", (data["name"].strip(), data["category"].strip(), float(data["price"])))
        db().commit()
    except (KeyError, ValueError, sqlite3.IntegrityError):
        return jsonify(error="Provide a unique name, category, and non-negative price."), 400
    return jsonify(dict(db().execute("SELECT id, name, category, price FROM products WHERE id = ?", (cursor.lastrowid,)).fetchone())), 201

@app.get("/")
def index():
    return send_from_directory(ROOT / "frontend" / "html", "Home Page HTML.html")

@app.get("/favicon.ico")
def favicon():
    return send_from_directory(ROOT / "frontend" / "images", "Logo.PNG", mimetype="image/png")

@app.get("/<path:page>.html")
def html_page(page):
    """Existing navigation links point to pages beside the home page."""
    return send_from_directory(ROOT / "frontend" / "html", f"{page}.html")

@app.get("/<path:path>")
def frontend(path):
    return send_from_directory(ROOT / "frontend", path)

if __name__ == "__main__":
    initialise_database()
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
