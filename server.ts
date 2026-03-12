import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import multer from 'multer';
import Razorpay from 'razorpay';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import helmet from 'helmet';

const db = new Database('society_saree.db');

try {
  db.prepare("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'COD'").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'Sarees'").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE products ADD COLUMN rating REAL DEFAULT 4.4').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE products ADD COLUMN product_id TEXT').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE products ADD COLUMN subcategory TEXT DEFAULT ''").run();
} catch (e) {}

const inferCategory = (title: string) => {
  const value = title.toLowerCase();
  if (value.includes('blouse')) return 'Blouses';
  if (value.includes('kurta set') || value.includes('co-ord') || value.includes('coord') || value.includes('set')) return 'Kurta Sets';
  if (value.includes('dress')) return 'Dresses';
  if (value.includes('kurta')) return 'Kurtas';
  return 'Sarees';
};

const inferSubcategory = (title: string, category?: string) => {
  const value = title.toLowerCase();
  const resolvedCategory = category || inferCategory(title);

  if (resolvedCategory === 'Sarees') {
    if (value.includes('kanchi') || value.includes('kanjee') || value.includes('kanchipuram')) return 'Kanchipuram Sarees';
    if (value.includes('banarasi')) return 'Banarasi Sarees';
    if (value.includes('linen')) return 'Linen Sarees';
    if (value.includes('organza')) return 'Organza Sarees';
    return 'Cotton Sarees';
  }

  if (resolvedCategory === 'Blouses') {
    if (value.includes('brocade')) return 'Brocade Blouses';
    if (value.includes('cotton')) return 'Cotton Blouses';
    if (value.includes('ready')) return 'Readymade Blouses';
    if (value.includes('designer')) return 'Designer Blouses';
    return 'Silk Blouses';
  }

  if (resolvedCategory === 'Kurtas') {
    if (value.includes('anarkali')) return 'Anarkali Kurtas';
    if (value.includes('straight')) return 'Straight Kurtas';
    if (value.includes('embroider')) return 'Embroidered Kurtas';
    if (value.includes('a-line') || value.includes('aline')) return 'A-Line Kurtas';
    return 'Printed Kurtas';
  }

  if (resolvedCategory === 'Dresses') {
    if (value.includes('anarkali')) return 'Anarkali Dresses';
    if (value.includes('indo')) return 'Indo-Western Dresses';
    if (value.includes('festive')) return 'Festive Dresses';
    if (value.includes('printed')) return 'Printed Dresses';
    return 'Ethnic Maxi Dresses';
  }

  if (value.includes('chanderi')) return 'Chanderi Kurta Sets';
  if (value.includes('festive')) return 'Festive Kurta Sets';
  if (value.includes('printed')) return 'Printed Kurta Sets';
  if (value.includes('anarkali')) return 'Anarkali Kurta Sets';
  return 'Cotton Kurta Sets';
};

const fallbackProductId = (id: number) => `FASHIONNEST-${String(id).padStart(4, '0')}`;
const serializeProduct = (product: any) => ({
  ...product,
  productId: product.product_id || fallbackProductId(product.id),
  name: product.title,
  image: product.image_url,
  subcategory: product.subcategory || inferSubcategory(product.title, product.category),
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('customer', 'rwa', 'admin')) NOT NULL,
    community_role TEXT DEFAULT '',
    apartment_block TEXT DEFAULT '',
    society_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Sarees',
    subcategory TEXT DEFAULT '',
    product_id TEXT,
    fabric TEXT,
    color TEXT,
    occasion TEXT,
    price REAL NOT NULL,
    rating REAL DEFAULT 4.4,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_price REAL NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'Order Placed',
    payment_method TEXT DEFAULT 'COD',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    delivery_partner TEXT,
    tracking_id TEXT,
    tracking_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS group_buy_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    society_name TEXT,
    rwa_id INTEGER,
    deadline DATETIME,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (rwa_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_buy_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    customer_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY (event_id) REFERENCES group_buy_events(id),
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_db_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    rating REAL NOT NULL,
    review_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_db_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS addresses (
    address_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipient_name TEXT DEFAULT '',
    phone_number TEXT DEFAULT '',
    house_number TEXT DEFAULT '',
    street TEXT DEFAULT '',
    area TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    postal_code TEXT DEFAULT '',
    country TEXT DEFAULT 'India',
    latitude REAL,
    longitude REAL,
    address_type TEXT DEFAULT 'home',
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try {
  db.prepare("ALTER TABLE users ADD COLUMN user_id TEXT").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE users ADD COLUMN last_login DATETIME').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN verification_code_hash TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE users ADD COLUMN verification_code_expires_at DATETIME').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN verification_target TEXT DEFAULT 'email'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN security_question TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN security_answer_hash TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN community_role TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN apartment_block TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN coupon_code TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN coupon_discount REAL DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN community_discount REAL DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN tax_amount REAL DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_name TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_phone TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_house_number TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_street TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_area TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_city TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_state TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_postal_code TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_country TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN delivery_latitude REAL').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN delivery_longitude REAL').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE orders ADD COLUMN cancellation_note TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN cancelled_at DATETIME').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE orders ADD COLUMN payment_converted_at DATETIME').run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE community_events ADD COLUMN event_title TEXT DEFAULT ''").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE community_events ADD COLUMN event_duration_days INTEGER DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE community_events ADD COLUMN start_date DATETIME').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE community_events ADD COLUMN end_date DATETIME').run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS cart_coupon_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    event_title TEXT DEFAULT '',
    minimum_quantity INTEGER NOT NULL,
    current_participants INTEGER NOT NULL DEFAULT 0,
    discount_percentage REAL NOT NULL,
    event_duration_days INTEGER DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    event_deadline DATETIME NOT NULL,
    created_by INTEGER NOT NULL,
    society_name TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES community_events(event_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_code TEXT NOT NULL UNIQUE,
    discount_type TEXT CHECK(discount_type IN ('percentage', 'flat')) NOT NULL,
    discount_value REAL NOT NULL,
    minimum_order_value REAL NOT NULL DEFAULT 0,
    expiry_date DATETIME NOT NULL,
    max_usage INTEGER NOT NULL DEFAULT 1,
    current_usage INTEGER NOT NULL DEFAULT 0,
    user_type TEXT CHECK(user_type IN ('customer', 'first_time_user', 'community_user')) NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_owner_product ON cart_items(user_id, user_role, product_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_coupon_owner ON cart_coupon_applications(user_id, user_role)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_community_participant_owner ON community_event_participants(event_id, user_id, user_role)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_sid ON user_sessions(session_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_addresses_owner ON addresses(user_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_default_owner ON addresses(user_id) WHERE is_default = 1');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_unique ON users(user_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(lower(email))');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL');

db.prepare("UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL").run();
db.prepare("UPDATE users SET phone = NULL WHERE phone IS NOT NULL AND trim(phone) = ''").run();
db.prepare("UPDATE users SET verification_target = 'email' WHERE verification_target IS NULL OR trim(verification_target) = ''").run();
const legacyVerifiedEmails = [
  'admin@saree.com',
  'robin@admin.com',
  'tedmosby@rwa.com',
  'varshamuniswamy96@gmail.com',
  'lily@gmail.com',
];

const usersMissingUuid = db.prepare("SELECT id FROM users WHERE user_id IS NULL OR trim(user_id) = ''").all() as { id: number }[];
const assignUserUuid = db.prepare('UPDATE users SET user_id = ? WHERE id = ?');
usersMissingUuid.forEach((user) => assignUserUuid.run(crypto.randomUUID(), user.id));
db.prepare("UPDATE users SET is_verified = 1 WHERE role = 'admin'").run();
const markLegacyUsersVerified = db.prepare('UPDATE users SET is_verified = 1 WHERE lower(email) = ?');
legacyVerifiedEmails.forEach((email) => markLegacyUsersVerified.run(email));

db.prepare(`
  UPDATE users
  SET security_question = CASE
        WHEN COALESCE(TRIM(security_question), '') = '' THEN ?
        ELSE security_question
      END,
      security_answer_hash = CASE
        WHEN COALESCE(TRIM(security_answer_hash), '') = '' THEN ?
        ELSE security_answer_hash
      END
`).run('What is the name of this app?', bcrypt.hashSync('fashionnest', 10));

db.prepare(`
  UPDATE users
  SET community_role = CASE
        WHEN role = 'rwa' AND COALESCE(TRIM(community_role), '') = '' THEN 'coordinator'
        WHEN role = 'customer' AND COALESCE(TRIM(community_role), '') = '' THEN 'customer'
        ELSE community_role
      END,
      apartment_block = CASE
        WHEN role = 'rwa' AND COALESCE(TRIM(apartment_block), '') = '' THEN COALESCE(NULLIF(TRIM(society_name), ''), 'Main Block')
        ELSE apartment_block
      END
`).run();

db.prepare(`
  UPDATE community_events
  SET event_title = COALESCE(NULLIF(TRIM(event_title), ''), 'Community Deal'),
      event_duration_days = CASE
        WHEN COALESCE(event_duration_days, 0) <= 0 THEN 5
        ELSE event_duration_days
      END,
      start_date = COALESCE(start_date, created_at),
      end_date = COALESCE(end_date, event_deadline)
`).run();

const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Platform Admin',
    'admin@saree.com',
    hash,
    'admin'
  );
}

const placeholderSeedTitles = [
  'Kanjeevaram Wedding Saree',
  'Banarasi Tissue Saree',
  'Chanderi Cotton Saree',
  'Organza Party Saree',
  'Linen Printed Saree',
  'Embroidered Readymade Blouse',
  'Boat Neck Silk Blouse',
  'Straight Cotton Kurta',
  'Festive Anarkali Kurta',
  'Printed Peplum Top',
  'Rayon Workwear Top',
  'Floral Ready-made Set',
  'Comfort Co-ord Set',
  'Kanchipuram Silk Wedding Saree',
  'Banarasi Silk Occasion Saree',
  'Linen Everyday Saree',
  'Cotton Temple Border Saree',
  'Readymade Embroidered Blouse',
  'Festive Sequinned Saree Set',
  'Temple Border Festive Kurta Set',
];
const staleSampleProductIds = ['SAR-KS-001', 'SAR-BS-002', 'SAR-LN-003', 'SAR-OR-004', 'SAR-CT-005', 'BLO-RM-006', 'BLO-SL-007', 'KUR-EV-008', 'KUR-FE-009', 'TOP-FU-010', 'TOP-WR-011', 'FES-SR-012', 'FES-KS-013'];
const categoryImageAnchors: Record<string, string> = {
  Sarees: 'indian saree woman studio fashion',
  Kurtas: 'women kurta ethnic wear studio',
  Blouses: 'saree blouse women fashion studio',
  Dresses: 'women ethnic dress fashion studio',
  'Kurta Sets': 'women kurta set ethnic fashion studio',
};
const buildUnsplashImage = (
  query: string,
  seed: number,
  options: { category: string; subcategory: string; fabric: string; color: string; descriptor: string }
) => {
  const searchTerms = [
    query,
    options.subcategory,
    options.fabric,
    options.color,
    options.descriptor,
    categoryImageAnchors[options.category] || 'women ethnic fashion',
  ]
    .filter(Boolean)
    .join(', ');

  return `https://source.unsplash.com/featured/900x1200/?${encodeURIComponent(searchTerms)}&sig=${seed}`;
};
const catalogBlueprints = [
  {
    category: 'Sarees', prefix: 'SAR', productLabel: 'Saree', subcategories: [
      { code: 'KAN', name: 'Kanchipuram Sarees', titleBase: 'Kanchipuram Silk', query: 'kanchipuram saree', fabric: 'Pure Silk', occasion: 'Wedding', basePrice: 6290, priceStep: 260, descriptors: ['Temple Border', 'Heritage', 'Bridal', 'Zari Weave', 'Festive', 'Handloom'], colors: ['Ruby Red', 'Peacock Blue', 'Emerald Green', 'Deep Maroon', 'Sun Gold', 'Royal Purple'] },
      { code: 'BAN', name: 'Banarasi Sarees', titleBase: 'Banarasi Silk', query: 'banarasi saree', fabric: 'Silk Blend', occasion: 'Festive', basePrice: 5490, priceStep: 240, descriptors: ['Classic', 'Rani Pink', 'Wedding', 'Brocade', 'Heritage', 'Occasion'], colors: ['Sun Gold', 'Wine', 'Magenta', 'Midnight Blue', 'Bottle Green', 'Rose Pink'] },
      { code: 'LIN', name: 'Linen Sarees', titleBase: 'Linen', query: 'linen saree women', fabric: 'Linen', occasion: 'Daily Wear', basePrice: 2490, priceStep: 180, descriptors: ['Breezy', 'Printed', 'Workday', 'Soft Drape', 'Minimal', 'Everyday'], colors: ['Mint Green', 'Powder Blue', 'Beige', 'Lavender', 'Ivory', 'Stone Grey'] },
      { code: 'ORG', name: 'Organza Sarees', titleBase: 'Organza', query: 'organza saree women', fabric: 'Organza', occasion: 'Party', basePrice: 3390, priceStep: 210, descriptors: ['Floral', 'Evening', 'Statement', 'Sheer', 'Pearl', 'Embellished'], colors: ['Blush Pink', 'Champagne', 'Lilac', 'Coral', 'Dusty Rose', 'Ice Blue'] },
      { code: 'COT', name: 'Cotton Sarees', titleBase: 'Cotton', query: 'cotton saree women', fabric: 'Cotton', occasion: 'Office', basePrice: 1990, priceStep: 150, descriptors: ['Classic', 'Handloom', 'Temple Border', 'Soft Weave', 'Daily Edit', 'Printed'], colors: ['Sky Blue', 'Mustard', 'Teal', 'Brick Red', 'Olive', 'Off White'] },
    ],
  },
  {
    category: 'Kurtas', prefix: 'KUR', productLabel: 'Kurta', subcategories: [
      { code: 'ANK', name: 'Anarkali Kurtas', titleBase: 'Anarkali', query: 'anarkali kurta', fabric: 'Rayon', occasion: 'Festive', basePrice: 2390, priceStep: 160, descriptors: ['Mirror Work', 'Festive', 'Flared', 'Embroidered', 'Panelled', 'Occasion'], colors: ['Maroon', 'Bottle Green', 'Royal Blue', 'Rust', 'Wine', 'Plum'] },
      { code: 'STR', name: 'Straight Kurtas', titleBase: 'Straight', query: 'straight kurta women', fabric: 'Cotton', occasion: 'Office', basePrice: 1490, priceStep: 140, descriptors: ['Tailored', 'Pocket', 'Everyday', 'Minimal', 'Workwear', 'Clean Line'], colors: ['Ivory', 'Sage', 'Navy', 'Rose Brown', 'Taupe', 'Black'] },
      { code: 'PRT', name: 'Printed Kurtas', titleBase: 'Printed', query: 'printed kurta women', fabric: 'Viscose', occasion: 'Casual', basePrice: 1590, priceStep: 135, descriptors: ['Block Print', 'Floral', 'Indigo', 'Weekend', 'Fusion', 'Garden'], colors: ['Indigo', 'Terracotta', 'Mustard', 'Mint', 'Berry', 'Cream'] },
      { code: 'EMB', name: 'Embroidered Kurtas', titleBase: 'Embroidered', query: 'embroidered kurta women', fabric: 'Chanderi Blend', occasion: 'Festive', basePrice: 2190, priceStep: 165, descriptors: ['Threadwork', 'Zari Accent', 'Statement', 'Elegant', 'Festive', 'Heirloom'], colors: ['Rose Pink', 'Olive', 'Peach', 'Slate Blue', 'Sand', 'Crimson'] },
      { code: 'ALN', name: 'A-Line Kurtas', titleBase: 'A-Line', query: 'a line kurta women', fabric: 'Cotton Blend', occasion: 'Daily Wear', basePrice: 1690, priceStep: 145, descriptors: ['Flowy', 'Modern', 'Easy Fit', 'Soft Drape', 'City Edit', 'Pleated'], colors: ['Lilac', 'Aqua', 'Mocha', 'Brick', 'Ivory', 'Forest Green'] },
    ],
  },
  {
    category: 'Blouses', prefix: 'BLO', productLabel: 'Blouse', subcategories: [
      { code: 'SLK', name: 'Silk Blouses', titleBase: 'Silk', query: 'silk blouse', fabric: 'Silk', occasion: 'Wedding', basePrice: 1490, priceStep: 120, descriptors: ['Boat Neck', 'Classic', 'Princess Cut', 'Sleeveless', 'Elbow Sleeve', 'Festive'], colors: ['Emerald', 'Ruby', 'Champagne', 'Wine', 'Royal Blue', 'Copper'] },
      { code: 'BRO', name: 'Brocade Blouses', titleBase: 'Brocade', query: 'brocade blouse women', fabric: 'Brocade', occasion: 'Festive', basePrice: 1690, priceStep: 130, descriptors: ['Embroidered', 'Zari Detail', 'Regal', 'Temple Border', 'Statement', 'Occasion'], colors: ['Gold', 'Maroon', 'Magenta', 'Navy', 'Olive', 'Plum'] },
      { code: 'COT', name: 'Cotton Blouses', titleBase: 'Cotton', query: 'cotton blouse women', fabric: 'Cotton', occasion: 'Daily Wear', basePrice: 990, priceStep: 100, descriptors: ['Printed', 'Comfort Fit', 'Soft Weave', 'Everyday', 'Tailored', 'Minimal'], colors: ['Sky Blue', 'Sand', 'Ivory', 'Black', 'Coral', 'Olive'] },
      { code: 'RMD', name: 'Readymade Blouses', titleBase: 'Readymade', query: 'readymade blouse women', fabric: 'Silk Blend', occasion: 'Festive', basePrice: 1190, priceStep: 110, descriptors: ['Padded', 'Hook Back', 'Quick Fit', 'Ready Party', 'Sculpted', 'Easy Wear'], colors: ['Rose Gold', 'Teal', 'Rani Pink', 'Bottle Green', 'Copper', 'Pearl White'] },
      { code: 'DSG', name: 'Designer Blouses', titleBase: 'Designer', query: 'designer blouse women', fabric: 'Georgette Blend', occasion: 'Party', basePrice: 1890, priceStep: 140, descriptors: ['Cutwork', 'Mirror Detail', 'Contemporary', 'Studio Edit', 'Fashion', 'Evening'], colors: ['Black', 'Mauve', 'Silver', 'Cherry Red', 'Midnight Blue', 'Saffron'] },
    ],
  },
  {
    category: 'Dresses', prefix: 'DRE', productLabel: 'Dress', subcategories: [
      { code: 'ETM', name: 'Ethnic Maxi Dresses', titleBase: 'Ethnic Maxi', query: 'ethnic dress women', fabric: 'Rayon Blend', occasion: 'Casual', basePrice: 2290, priceStep: 155, descriptors: ['Flowy', 'Printed', 'Gathered', 'Weekend', 'Easy Glam', 'Garden'], colors: ['Rose Pink', 'Indigo', 'Mustard', 'Ivory', 'Olive', 'Berry'] },
      { code: 'ANA', name: 'Anarkali Dresses', titleBase: 'Anarkali', query: 'anarkali dress women', fabric: 'Georgette', occasion: 'Festive', basePrice: 2890, priceStep: 170, descriptors: ['Festive', 'Panelled', 'Twirl', 'Mirror Work', 'Occasion', 'Graceful'], colors: ['Maroon', 'Peach', 'Royal Blue', 'Bottle Green', 'Wine', 'Mauve'] },
      { code: 'FES', name: 'Festive Dresses', titleBase: 'Festive', query: 'festive dress women', fabric: 'Silk Blend', occasion: 'Party', basePrice: 3190, priceStep: 180, descriptors: ['Shimmer', 'Embellished', 'Evening', 'Celebration', 'Classic', 'Statement'], colors: ['Gold', 'Rose Gold', 'Plum', 'Teal', 'Crimson', 'Silver'] },
      { code: 'PRT', name: 'Printed Dresses', titleBase: 'Printed', query: 'printed ethnic dress women', fabric: 'Cotton Blend', occasion: 'Daily Wear', basePrice: 1890, priceStep: 130, descriptors: ['Floral', 'Block Print', 'Soft Drape', 'Everyday', 'Day Out', 'Minimal'], colors: ['Mint', 'Sky Blue', 'Terracotta', 'Lemon', 'Sage', 'Blush'] },
      { code: 'IND', name: 'Indo-Western Dresses', titleBase: 'Indo-Western', query: 'indo western dress women', fabric: 'Crepe', occasion: 'Party', basePrice: 2690, priceStep: 165, descriptors: ['Contemporary', 'Cape Detail', 'Layered', 'Fusion', 'Cocktail', 'Modern'], colors: ['Black', 'Champagne', 'Rust', 'Emerald', 'Navy', 'Lilac'] },
    ],
  },
  {
    category: 'Kurta Sets', prefix: 'KST', productLabel: 'Kurta Set', subcategories: [
      { code: 'COT', name: 'Cotton Kurta Sets', titleBase: 'Cotton', query: 'kurta set women', fabric: 'Cotton', occasion: 'Daily Wear', basePrice: 2390, priceStep: 150, descriptors: ['Everyday', 'Pocket', 'Soft Weave', 'Minimal', 'Workday', 'Comfort'], colors: ['Ivory', 'Sage', 'Dusty Blue', 'Mocha', 'Brick', 'Mustard'] },
      { code: 'FES', name: 'Festive Kurta Sets', titleBase: 'Festive', query: 'festive kurta set women', fabric: 'Silk Blend', occasion: 'Festive', basePrice: 3290, priceStep: 185, descriptors: ['Mirror Work', 'Occasion', 'Gota Detail', 'Celebration', 'Classic', 'Evening'], colors: ['Wine', 'Royal Blue', 'Deep Green', 'Rose Gold', 'Magenta', 'Amber'] },
      { code: 'PRT', name: 'Printed Kurta Sets', titleBase: 'Printed', query: 'printed kurta set women', fabric: 'Rayon', occasion: 'Casual', basePrice: 2490, priceStep: 145, descriptors: ['Floral', 'Block Print', 'Weekend', 'Fusion', 'Fresh', 'Soft Drape'], colors: ['Berry', 'Teal', 'Peach', 'Ivory', 'Indigo', 'Olive'] },
      { code: 'CHN', name: 'Chanderi Kurta Sets', titleBase: 'Chanderi', query: 'chanderi kurta set women', fabric: 'Chanderi', occasion: 'Festive', basePrice: 3590, priceStep: 190, descriptors: ['Zari Trim', 'Heritage', 'Temple Border', 'Festive', 'Elegant', 'Handcrafted'], colors: ['Champagne', 'Blush Pink', 'Bottle Green', 'Copper', 'Plum', 'Saffron'] },
      { code: 'ANA', name: 'Anarkali Kurta Sets', titleBase: 'Anarkali', query: 'anarkali kurta set women', fabric: 'Georgette Blend', occasion: 'Wedding', basePrice: 3890, priceStep: 210, descriptors: ['Flared', 'Wedding', 'Statement', 'Twirl', 'Graceful', 'Bridal'], colors: ['Maroon', 'Peach', 'Royal Blue', 'Wine', 'Emerald', 'Lilac'] },
    ],
  },
];

const catalogProducts = catalogBlueprints.flatMap((blueprint, categoryIndex) =>
  blueprint.subcategories.flatMap((subcategory, subIndex) =>
    subcategory.descriptors.map((descriptor, variationIndex) => {
      const sequence = categoryIndex * 30 + subIndex * 6 + variationIndex + 1;
      const productId = `${blueprint.prefix}-${subcategory.code}-${String(sequence).padStart(3, '0')}`;
      const price = subcategory.basePrice + subcategory.priceStep * variationIndex;
      const rating = Number((4.1 + ((variationIndex + subIndex + categoryIndex) % 5) * 0.18).toFixed(1));
      const stock = 8 + ((sequence * 3) % 35);
      const color = subcategory.colors[variationIndex % subcategory.colors.length];
      return {
        productId,
        name: `${descriptor} ${subcategory.titleBase} ${blueprint.productLabel}`,
        category: blueprint.category,
        subcategory: subcategory.name,
        description: `${descriptor} ${subcategory.titleBase.toLowerCase()} ${blueprint.productLabel.toLowerCase()} crafted in ${subcategory.fabric.toLowerCase()} for ${subcategory.occasion.toLowerCase()} styling and modern women's ethnic wardrobes.`,
        fabric: subcategory.fabric,
        color,
        occasion: subcategory.occasion,
        price,
        rating,
        image: buildUnsplashImage(subcategory.query, sequence, {
          category: blueprint.category,
          subcategory: subcategory.name,
          fabric: subcategory.fabric,
          color,
          descriptor,
        }),
        stock,
      };
    })
  )
);

const insertCatalogProduct = db.prepare(`
  INSERT INTO products (
    product_id, title, description, category, subcategory, price, fabric, color, occasion, rating, image_url, stock
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateCatalogProduct = db.prepare(`
  UPDATE products
  SET product_id = ?,
      title = ?,
      description = ?,
      category = ?,
      subcategory = ?,
      price = ?,
      fabric = ?,
      color = ?,
      occasion = ?,
      rating = ?,
      image_url = ?,
      stock = ?
  WHERE id = ?
`);

catalogProducts.forEach((product, index) => {
  const staleProductId = staleSampleProductIds[index] || '';
  const placeholderTitle = placeholderSeedTitles[index] || '';
  const existingProduct: any = db.prepare('SELECT id FROM products WHERE product_id = ? OR product_id = ? OR title = ? OR title = ?').get(
    product.productId,
    staleProductId,
    product.name,
    placeholderTitle
  );

  if (existingProduct) {
    updateCatalogProduct.run(
      product.productId,
      product.name,
      product.description,
      product.category,
      product.subcategory,
      product.price,
      product.fabric,
      product.color,
      product.occasion,
      product.rating,
      product.image,
      product.stock,
      existingProduct.id
    );
    return;
  }

  insertCatalogProduct.run(
    product.productId,
    product.name,
    product.description,
    product.category,
    product.subcategory,
    product.price,
    product.fabric,
    product.color,
    product.occasion,
    product.rating,
    product.image,
    product.stock
  );
});
const existingProducts: any[] = db.prepare('SELECT id, title, category, rating, product_id, subcategory FROM products').all();
existingProducts.forEach((product) => {
  const nextCategory = product.category && String(product.category).trim() ? product.category : inferCategory(product.title);
  const nextSubcategory = product.subcategory && String(product.subcategory).trim() ? product.subcategory : inferSubcategory(product.title, nextCategory);
  const nextRating = product.rating && Number(product.rating) > 0 ? product.rating : 4.4;
  const nextProductId = product.product_id && String(product.product_id).trim() ? product.product_id : fallbackProductId(product.id);
  db.prepare('UPDATE products SET category = ?, subcategory = ?, rating = ?, product_id = ? WHERE id = ?').run(
    nextCategory,
    nextSubcategory,
    nextRating,
    nextProductId,
    product.id
  );
});

db.prepare("UPDATE users SET role = 'rwa' WHERE email = 'tedmosby@rwa.com'").run();

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const REVIEWS_CSV_PATH = path.resolve(process.cwd(), 'reviews.csv');
const SESSION_COOKIE_NAME = 'fashionnest_session';
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24;
const VERIFICATION_TTL_MS = 1000 * 60 * 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 1000 * 60;
const LOGIN_BLOCK_MS = 1000 * 60 * 10;
const isProduction = process.env.NODE_ENV === 'production';
const loginAttemptStore = new Map<string, { count: number; windowStartedAt: number; blockedUntil: number }>();
const deliveryServiceRegex = /^560\d{3}$/;

const normalizePhone = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? digits.slice(-10) : '';
};

const parseCookies = (cookieHeader: string | undefined) => {
  const cookies: Record<string, string> = {};
  String(cookieHeader || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const separator = segment.indexOf('=');
      if (separator === -1) return;
      const key = decodeURIComponent(segment.slice(0, separator));
      const value = decodeURIComponent(segment.slice(separator + 1));
      cookies[key] = value;
    });
  return cookies;
};

const getTokenFromRequest = (req: any) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  if (bearerToken) return bearerToken;
  return parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME] || '';
};

const setSessionCookie = (res: any, token: string) => {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: AUTH_SESSION_TTL_MS,
  });
};

const clearSessionCookie = (res: any) => {
  res.cookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    expires: new Date(0),
  });
};

const serializeAddress = (address: any) => {
  if (!address) return null;
  return {
    id: address.address_id,
    address_id: address.address_id,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    house_number: address.house_number,
    street: address.street,
    area: address.area,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    latitude: address.latitude,
    longitude: address.longitude,
    address_type: address.address_type,
    is_default: Boolean(address.is_default),
    location_label: [address.area, address.city].filter(Boolean).join(', ') || address.city || 'Add address',
    full_address: [address.house_number, address.street, address.area, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(', '),
  };
};

const getDefaultAddressForUser = (userId: number) => {
  const address = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC, address_id DESC LIMIT 1').get(userId);
  return serializeAddress(address);
};

const getActiveLoginAttemptState = (key: string) => {
  const now = Date.now();
  const current = loginAttemptStore.get(key);
  if (!current) {
    return { count: 0, windowStartedAt: now, blockedUntil: 0 };
  }
  if (current.blockedUntil > now) {
    return current;
  }
  if (now - current.windowStartedAt > LOGIN_WINDOW_MS) {
    const reset = { count: 0, windowStartedAt: now, blockedUntil: 0 };
    loginAttemptStore.set(key, reset);
    return reset;
  }
  return current;
};

const markFailedLoginAttempt = (key: string) => {
  const now = Date.now();
  const current = getActiveLoginAttemptState(key);
  const count = current.count + 1;
  const nextState = {
    count,
    windowStartedAt: current.windowStartedAt,
    blockedUntil: count >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_MS : 0,
  };
  loginAttemptStore.set(key, nextState);
  return nextState;
};

const clearFailedLoginAttempts = (key: string) => loginAttemptStore.delete(key);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (_req, file, callback) => {
      const safeBase = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
      callback(null, `${Date.now()}-${safeBase}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const normalizeEmail = (value: string) => String(value || '').trim().toLowerCase();
const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const singularCategoryLabel = (category: string) => {
  if (category === 'Sarees') return 'saree';
  if (category === 'Kurtas') return 'kurta';
  if (category === 'Blouses') return 'blouse';
  if (category === 'Dresses') return 'dress';
  if (category === 'Kurta Sets') return 'kurta set';
  return 'fashion item';
};

const ensureReviewsCsvExists = () => {
  if (!fs.existsSync(REVIEWS_CSV_PATH)) {
    fs.writeFileSync(REVIEWS_CSV_PATH, 'Product,User,Rating,Review,Date\n', 'utf8');
  }
};

const escapeCsvValue = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const appendReviewCsv = (review: { product: string; user: string; rating: number; review: string; date: string }) => {
  ensureReviewsCsvExists();
  const row = [
    escapeCsvValue(review.product),
    escapeCsvValue(review.user),
    escapeCsvValue(review.rating),
    escapeCsvValue(review.review),
    escapeCsvValue(review.date),
  ].join(',');
  fs.appendFileSync(REVIEWS_CSV_PATH, `${row}\n`, 'utf8');
};

const getValidResetToken = (token: string) => {
  const tokenHash = hashResetToken(token);
  return db.prepare(`
    SELECT prt.*, u.email, u.name
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = ?
      AND prt.used_at IS NULL
      AND prt.expires_at > ?
    ORDER BY prt.id DESC
    LIMIT 1
  `).get(tokenHash, new Date().toISOString());
};

const buildAssetUrl = (req: any, fileName: string) => `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
const normalizeCommunityRole = (value: any) => String(value || '').trim().toLowerCase();
const getCommunityRole = (user: any) => {
  if (!user) return '';
  if (user.role === 'admin') return 'admin';
  if (user.role !== 'rwa') return 'customer';
  return normalizeCommunityRole(user.community_role) === 'resident' ? 'resident' : 'coordinator';
};
const getEffectiveRole = (user: any) => {
  if (!user) return '';
  if (user.role === 'admin') return 'admin';
  if (user.role === 'customer') return 'customer';
  return getCommunityRole(user) === 'resident' ? 'rwa_resident' : 'rwa_coordinator';
};
const canCreateCommunityDeals = (user: any) => user?.role === 'admin';
const canJoinCommunityDeals = (user: any) => user?.role === 'rwa';
const generateVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));
const getEventDeadline = (event: any) => String(event?.end_date || event?.event_deadline || '');
const formatApartmentBlock = (value: any, societyName: string) => String(value || '').trim() || String(societyName || '').trim() || 'Apartment resident';
const belongsToEventSociety = (user: any, event: any) => user?.role === 'admin' || String(user?.society_name || '').trim() === String(event?.society_name || '').trim();
const serializeAuthUser = (user: any) => ({
  id: user.id,
  user_id: user.user_id,
  name: user.name,
  role: user.role,
  effective_role: getEffectiveRole(user),
  email: user.email,
  phone: normalizePhone(user.phone || ''),
  society_name: user.society_name,
  community_role: getCommunityRole(user),
  apartment_block: formatApartmentBlock(user.apartment_block, user.society_name),
});
const getAuthUserRecord = (userId: number) => db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
const createSessionToken = (user: any) => {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO user_sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);
  const token = jwt.sign({ id: user.id, user_id: user.user_id, role: user.role, session_id: sessionId }, JWT_SECRET, { expiresIn: '7d' });
  return { token, sessionId, expiresAt };
};
const buildOrderTimeline = (order: any) => {
  const labels = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
  const status = String(order?.order_status || 'Order Placed');
  if (status === 'Cancelled') {
    return labels.map((label, index) => ({
      label,
      state: index === 0 ? 'completed' : 'cancelled',
    }));
  }
  const activeIndex = Math.max(labels.indexOf(status), 0);
  return labels.map((label, index) => ({
    label,
    state: index < activeIndex ? 'completed' : index === activeIndex ? 'current' : 'pending',
  }));
};
const isOrderCancelable = (order: any) => !['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(String(order?.order_status || ''));
const canConvertCodOrder = (order: any) => String(order?.payment_method || '').toUpperCase() === 'COD' && !['PAID', 'PAID ONLINE'].includes(String(order?.payment_status || '').toUpperCase()) && String(order?.order_status || '') !== 'Cancelled';
const resolveProductRecord = (identifier: string | number) => {
  if (identifier === undefined || identifier === null || identifier === '') {
    return null;
  }

  if (/^\d+$/.test(String(identifier))) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(Number(identifier));
  }

  return db.prepare('SELECT * FROM products WHERE product_id = ?').get(String(identifier));
};

const buildAiImagePrompt = (payload: Record<string, any>) => {
  const title = String(payload.title || payload.name || singularCategoryLabel(payload.category || 'fashion item')).trim();
  const fabric = String(payload.fabric || '').trim();
  return `studio product photo of ${[fabric, title].filter(Boolean).join(' ')}, plain white background, high resolution, ecommerce product catalog style`;
};

const buildAiProductImage = (payload: Record<string, any>) => {
  const category = String(payload.category || 'Sarees');
  const fabric = String(payload.fabric || 'Silk');
  const color = String(payload.color || 'Ivory');
  const subcategory = String(payload.subcategory || singularCategoryLabel(category));
  const title = String(payload.title || payload.name || 'FASHIONest Product');
  const prompt = buildAiImagePrompt(payload);
  const accentMap: Record<string, string> = {
    Sarees: '#c0265b',
    Kurtas: '#1d4ed8',
    Blouses: '#9333ea',
    Dresses: '#ea580c',
    'Kurta Sets': '#0f766e',
  };
  const accent = accentMap[category] || '#c0265b';
  const secondary = color.toLowerCase().includes('blue') ? '#60a5fa' : color.toLowerCase().includes('green') ? '#34d399' : color.toLowerCase().includes('gold') ? '#fbbf24' : color.toLowerCase().includes('pink') ? '#f472b6' : '#f3e8ff';
  const fabricLabel = fabric.slice(0, 18);
  const titleLabel = title.slice(0, 26);
  const subcategoryLabel = subcategory.slice(0, 24);

  const garmentMarkup = category === 'Sarees'
    ? `<rect x="180" y="120" width="360" height="470" rx="18" fill="${secondary}" opacity="0.18" />\n       <path d="M210 170 L470 170 L520 300 L520 520 L215 520 Z" fill="${accent}" />\n       <path d="M250 190 L430 190 L470 305 L470 490 L250 490 Z" fill="#ffffff" opacity="0.18" />\n       <path d="M420 170 L520 300 L520 520 L420 520 Z" fill="#ffffff" opacity="0.18" />`
    : category === 'Blouses'
      ? `<rect x="185" y="150" width="350" height="390" rx="26" fill="${secondary}" opacity="0.18" />\n         <path d="M250 210 L318 170 L402 170 L470 210 L500 315 L440 335 L420 275 L420 500 L300 500 L300 275 L280 335 L220 315 Z" fill="${accent}" />`
      : category === 'Dresses'
        ? `<rect x="190" y="120" width="340" height="470" rx="24" fill="${secondary}" opacity="0.16" />\n           <path d="M305 175 L415 175 L455 255 L520 540 L200 540 L265 255 Z" fill="${accent}" />\n           <rect x="315" y="145" width="90" height="55" rx="18" fill="#fbbf24" opacity="0.8" />`
        : category === 'Kurta Sets'
          ? `<rect x="170" y="120" width="380" height="470" rx="24" fill="${secondary}" opacity="0.16" />\n             <path d="M245 185 L310 145 L410 145 L475 185 L510 300 L455 325 L430 270 L430 525 L290 525 L290 270 L265 325 L210 300 Z" fill="${accent}" />\n             <rect x="330" y="185" width="26" height="220" rx="13" fill="#ffffff" opacity="0.22" />`
          : `<rect x="170" y="120" width="380" height="470" rx="24" fill="${secondary}" opacity="0.16" />\n             <path d="M245 185 L310 145 L410 145 L475 185 L510 300 L455 325 L430 270 L430 525 L290 525 L290 270 L265 325 L210 300 Z" fill="${accent}" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900" fill="none"><rect width="720" height="900" rx="36" fill="#ffffff" /><rect x="36" y="36" width="648" height="828" rx="32" fill="#f8fafc" /><rect x="72" y="72" width="576" height="756" rx="28" fill="#ffffff" stroke="#e2e8f0" />${garmentMarkup}<rect x="130" y="610" width="460" height="150" rx="24" fill="#ffffff" stroke="#e2e8f0" /><text x="160" y="652" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${titleLabel}</text><text x="160" y="690" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="20">${subcategoryLabel}</text><text x="160" y="725" fill="#64748b" font-family="Arial, Helvetica, sans-serif" font-size="18">${fabricLabel} | ${color.slice(0, 16)}</text><text x="160" y="780" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="16">${prompt.slice(0, 64)}</text></svg>`;

  return {
    prompt,
    imageUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
};

const refreshCommunityEventStatus = (eventId: number) => {
  const event: any = db.prepare('SELECT * FROM community_events WHERE event_id = ?').get(eventId);
  if (!event) return null;
  const currentParticipants = Number(db.prepare('SELECT COUNT(*) as count FROM community_event_participants WHERE event_id = ?').get(eventId)?.count || 0);
  const now = new Date().toISOString();
  const minimumParticipants = Number(event.minimum_participants || event.minimum_quantity || 0);
  const deadline = getEventDeadline(event);
  const status = currentParticipants >= minimumParticipants ? 'active' : deadline <= now ? 'expired' : 'open';
  db.prepare('UPDATE community_events SET current_participants = ?, status = ?, end_date = COALESCE(end_date, event_deadline) WHERE event_id = ?').run(currentParticipants, status, eventId);
  return db.prepare('SELECT * FROM community_events WHERE event_id = ?').get(eventId);
};

const refreshAllCommunityEventStatuses = () => {
  const ids = db.prepare('SELECT event_id FROM community_events').all() as { event_id: number }[];
  ids.forEach((entry) => refreshCommunityEventStatus(entry.event_id));
};

const formatRemainingTime = (deadline: string, status: string) => {
  if (status === 'expired') return 'Expired';
  if (status === 'active') return 'Deal active';
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days === 1 ? 'Ends in 1 day' : `Ends in ${days} days`;
};

const serializeCommunityEvent = (event: any, currentUser?: any) => {
  const syncedEvent: any = refreshCommunityEventStatus(event.event_id) || event;
  const product: any = db.prepare('SELECT id, title, image_url, price, product_id FROM products WHERE id = ?').get(syncedEvent.product_id);
  const joined = currentUser ? db.prepare('SELECT id FROM community_event_participants WHERE event_id = ? AND user_id = ? AND user_role = ?').get(syncedEvent.event_id, currentUser.id, currentUser.role) : null;
  const minimumParticipants = Number(syncedEvent.minimum_participants || syncedEvent.minimum_quantity || 0);
  const currentParticipants = Number(syncedEvent.current_participants || 0);
  const progressPercentage = minimumParticipants > 0 ? Math.min(100, Math.round((currentParticipants / minimumParticipants) * 100)) : 0;
  const originalPrice = Number(product?.price || 0);
  const participantsNeeded = Math.max(0, minimumParticipants - currentParticipants);
  return {
    ...syncedEvent,
    id: syncedEvent.event_id,
    event_id: syncedEvent.event_id,
    product_id: syncedEvent.product_id,
    event_title: syncedEvent.event_title || product?.title || 'Community Deal',
    product_name: product?.title || 'Community style',
    product_image: product?.image_url || '',
    product_product_id: product?.product_id || (product ? fallbackProductId(product.id) : ''),
    current_participants: currentParticipants,
    minimum_quantity: minimumParticipants,
    minimum_participants: minimumParticipants,
    discount_percentage: Number(syncedEvent.discount_percentage || 0),
    event_duration_days: Number(syncedEvent.event_duration_days || 0),
    start_date: syncedEvent.start_date || syncedEvent.created_at,
    end_date: syncedEvent.end_date || syncedEvent.event_deadline,
    event_deadline: syncedEvent.end_date || syncedEvent.event_deadline,
    remaining_time_label: formatRemainingTime(getEventDeadline(syncedEvent), syncedEvent.status),
    progress_label: `Participants Joined: ${currentParticipants} / ${minimumParticipants}`,
    participants_needed: participantsNeeded,
    participants_needed_label: syncedEvent.status === 'active'
      ? 'Discount unlocked for all joined participants.'
      : syncedEvent.status === 'expired'
        ? 'This community deal expired before reaching the target.'
        : `${participantsNeeded} more participant${participantsNeeded === 1 ? '' : 's'} needed to unlock discount`,
    progress_percentage: progressPercentage,
    joined: Boolean(joined),
    original_price: originalPrice,
    final_price: roundCurrency(originalPrice * (1 - Number(syncedEvent.discount_percentage || 0) / 100)),
  };
};

const hasJoinedCommunityEvent = (user: any) => Boolean(db.prepare('SELECT id FROM community_event_participants WHERE user_id = ? AND user_role = ? LIMIT 1').get(user.id, user.role));

const getActiveCommunityDealForUser = (user: any, productDbId: number) => {
  refreshAllCommunityEventStatuses();
  return db.prepare(`
    SELECT e.*
    FROM community_events e
    JOIN community_event_participants p ON p.event_id = e.event_id
    WHERE p.user_id = ? AND p.user_role = ? AND e.product_id = ? AND e.status = 'active'
    ORDER BY e.discount_percentage DESC, e.current_participants DESC
    LIMIT 1
  `).get(user.id, user.role, productDbId);
};

const getStoredCouponCode = (user: any) => db.prepare('SELECT coupon_code FROM cart_coupon_applications WHERE user_id = ? AND user_role = ? ORDER BY id DESC LIMIT 1').get(user.id, user.role)?.coupon_code || null;

const validateCouponForUser = (user: any, couponCode: string, subtotal: number) => {
  const coupon: any = db.prepare('SELECT * FROM coupons WHERE UPPER(coupon_code) = UPPER(?)').get(String(couponCode || '').trim());
  if (!coupon) return { valid: false, error: 'Coupon code not found.' };
  if (new Date(coupon.expiry_date).getTime() < Date.now()) return { valid: false, error: 'This coupon has expired.' };
  if (Number(coupon.current_usage || 0) >= Number(coupon.max_usage || 0)) return { valid: false, error: 'This coupon has reached its usage limit.' };
  if (subtotal < Number(coupon.minimum_order_value || 0)) return { valid: false, error: `Minimum order value is Rs. ${coupon.minimum_order_value}.` };
  if (coupon.user_type === 'customer' && user.role !== 'customer') return { valid: false, error: 'This coupon is valid for customer accounts only.' };
  if (coupon.user_type === 'first_time_user' && Number(db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?').get(user.id)?.count || 0) > 0) return { valid: false, error: 'This coupon is only for first-time users.' };
  if (coupon.user_type === 'community_user' && !(user.role === 'rwa' || hasJoinedCommunityEvent(user))) return { valid: false, error: 'This coupon is reserved for community buyers.' };
  const rawDiscount = coupon.discount_type === 'percentage' ? subtotal * (Number(coupon.discount_value || 0) / 100) : Number(coupon.discount_value || 0);
  return { valid: true, coupon, discount: roundCurrency(Math.min(subtotal, rawDiscount)) };
};

const buildCartSnapshot = (user: any) => {
  refreshAllCommunityEventStatuses();
  const rows = db.prepare(`
    SELECT ci.quantity, p.*
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ? AND ci.user_role = ?
    ORDER BY ci.created_at DESC, ci.id DESC
  `).all(user.id, user.role) as any[];

  const items = rows.map((row) => {
    const serialized = serializeProduct(row);
    const activeCommunityDeal: any = getActiveCommunityDealForUser(user, row.id);
    const quantity = Number(row.quantity || 1);
    const lineSubtotal = roundCurrency(Number(row.price || 0) * quantity);
    const communityDiscountPercentage = Number(activeCommunityDeal?.discount_percentage || 0);
    const communityDiscountAmount = roundCurrency(lineSubtotal * (communityDiscountPercentage / 100));
    return {
      ...serialized,
      quantity,
      community_discount_percentage: communityDiscountPercentage,
      community_discount_amount: communityDiscountAmount,
      community_discount_applied: communityDiscountPercentage > 0,
      community_event_id: activeCommunityDeal?.event_id || null,
      line_subtotal: lineSubtotal,
      line_total: roundCurrency(lineSubtotal - communityDiscountAmount),
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, item) => sum + Number(item.line_subtotal || 0), 0));
  const communityDiscount = roundCurrency(items.reduce((sum, item) => sum + Number(item.community_discount_amount || 0), 0));
  const discountedSubtotalBeforeCoupon = roundCurrency(subtotal - communityDiscount);
  let appliedCoupon: any = null;
  let couponDiscount = 0;
  const storedCouponCode = getStoredCouponCode(user);
  if (storedCouponCode) {
    const validation = validateCouponForUser(user, storedCouponCode, discountedSubtotalBeforeCoupon);
    if (validation.valid) {
      appliedCoupon = {
        coupon_code: validation.coupon.coupon_code,
        discount_type: validation.coupon.discount_type,
        discount_value: Number(validation.coupon.discount_value || 0),
        user_type: validation.coupon.user_type,
      };
      couponDiscount = validation.discount;
    } else {
      db.prepare('DELETE FROM cart_coupon_applications WHERE user_id = ? AND user_role = ?').run(user.id, user.role);
    }
  }

  const discountedSubtotal = roundCurrency(Math.max(0, discountedSubtotalBeforeCoupon - couponDiscount));
  const tax = roundCurrency(discountedSubtotal * 0.18);
  const total = roundCurrency(discountedSubtotal + tax);
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    summary: { subtotal, communityDiscount, discountedSubtotalBeforeCoupon, couponDiscount, discountedSubtotal, tax, total },
    appliedCoupon,
  };
};

const isServiceablePostalCode = (postalCode: string) => deliveryServiceRegex.test(String(postalCode || '').trim());
const getServiceabilityMessage = (postalCode: string) => isServiceablePostalCode(postalCode)
  ? 'Delivery is available in this area.'
  : 'Delivery not available in this area yet.';
const getOwnedAddressRecord = (userId: number, addressId?: number | null) => {
  if (addressId) {
    return db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(addressId, userId);
  }
  return db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC, address_id DESC LIMIT 1').get(userId);
};
const getOrderItems = (orderId: number) => db.prepare(`
  SELECT oi.quantity, oi.price, p.id as product_db_id, p.product_id, p.title, p.image_url, p.fabric, p.color, p.category, p.subcategory
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = ?
  ORDER BY oi.id ASC
`).all(orderId).map((item: any) => ({
  product_db_id: item.product_db_id,
  product_id: item.product_id || fallbackProductId(item.product_db_id),
  title: item.title,
  image_url: item.image_url,
  fabric: item.fabric,
  color: item.color,
  category: item.category,
  subcategory: item.subcategory,
  quantity: Number(item.quantity || 0),
  price: Number(item.price || 0),
  line_total: roundCurrency(Number(item.quantity || 0) * Number(item.price || 0)),
}));
const serializeOrderSummary = (order: any) => ({
  ...order,
  can_cancel: isOrderCancelable(order),
  can_pay_online: canConvertCodOrder(order),
  payment_method_label: String(order.payment_method || '').toUpperCase() === 'COD' ? 'Cash on Delivery' : 'UPI / Card / Netbanking',
  delivery_preview: [order.delivery_area, order.delivery_city].filter(Boolean).join(', ') || 'Address to be confirmed',
});
const getOrderDetailForUser = (orderId: number, userId: number) => {
  const order: any = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(orderId, userId);
  if (!order) return null;
  return {
    ...serializeOrderSummary(order),
    items: getOrderItems(order.id),
    address: {
      recipient_name: order.delivery_name,
      phone_number: order.delivery_phone,
      house_number: order.delivery_house_number,
      street: order.delivery_street,
      area: order.delivery_area,
      city: order.delivery_city,
      state: order.delivery_state,
      postal_code: order.delivery_postal_code,
      country: order.delivery_country,
      latitude: order.delivery_latitude,
      longitude: order.delivery_longitude,
    },
    tracking_partner: order.delivery_partner || 'To be assigned',
    tracking_number: order.tracking_id || 'Available once shipped',
    timeline: buildOrderTimeline(order),
  };
};
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

const authenticateToken = (req: any, res: any, next: any) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, sessionUser: any) => {
    if (err) {
      clearSessionCookie(res);
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (sessionUser.session_id) {
      const activeSession = db.prepare('SELECT * FROM user_sessions WHERE session_id = ? AND revoked_at IS NULL AND expires_at > ?').get(sessionUser.session_id, new Date().toISOString());
      if (!activeSession) {
        clearSessionCookie(res);
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const dbUser: any = getAuthUserRecord(sessionUser.id);
    if (!dbUser) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = { ...serializeAuthUser(dbUser), session_id: sessionUser.session_id || null };
    next();
  });
};

const authorizeRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    const userRoles = [req.user.role, req.user.effective_role].filter(Boolean);
    if (!roles.some((role) => userRoles.includes(role))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({ user: req.user, defaultAddress: getDefaultAddressForUser(req.user.id) });
});

app.post('/api/auth/logout', authenticateToken, (req: any, res) => {
  if (req.user.session_id) {
    db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE session_id = ?').run(new Date().toISOString(), req.user.session_id);
  }
  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password, society_name, security_question, security_answer } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!name || !normalizedEmail || !password || !security_question || !security_answer) {
    return res.status(400).json({ error: 'Name, email, password, security question, and security answer are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail)) {
    return res.status(400).json({ error: 'Email already exists.' });
  }

  if (normalizedPhone && db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone)) {
    return res.status(400).json({ error: 'Phone number already exists.' });
  }

  try {
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
    db.prepare(`
      INSERT INTO users (
        user_id, name, email, phone, password_hash, role, society_name,
        security_question, security_answer_hash, is_verified,
        verification_code_hash, verification_code_expires_at, verification_target
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      name,
      normalizedEmail,
      normalizedPhone || null,
      bcrypt.hashSync(String(password), 12),
      'customer',
      society_name || '',
      security_question,
      bcrypt.hashSync(String(security_answer).trim().toLowerCase(), 12),
      0,
      bcrypt.hashSync(verificationCode, 10),
      expiresAt,
      'email',
    );

    res.json({
      message: 'Account created. Verify your account to continue.',
      requiresVerification: true,
      email: normalizedEmail,
      devVerificationCode: isProduction ? undefined : verificationCode,
    });
  } catch (_error) {
    res.status(400).json({ error: 'Unable to create account right now.' });
  }
});

app.post('/api/auth/verify-account', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'No account was found for that email address.' });
  }

  if (user.is_verified) {
    return res.json({ message: 'Account already verified.' });
  }

  if (!user.verification_code_hash || !user.verification_code_expires_at || new Date(user.verification_code_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This verification code has expired. Request a new code.' });
  }

  if (!bcrypt.compareSync(code, user.verification_code_hash)) {
    return res.status(400).json({ error: 'Verification code did not match.' });
  }

  db.prepare(`
    UPDATE users
    SET is_verified = 1,
        verification_code_hash = '',
        verification_code_expires_at = NULL
    WHERE id = ?
  `).run(user.id);

  res.json({ message: 'Account verified successfully. You can now sign in.' });
});

app.post('/api/auth/resend-verification', (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'No account was found for that email address.' });
  }

  if (user.is_verified) {
    return res.json({ message: 'Account already verified.' });
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  db.prepare('UPDATE users SET verification_code_hash = ?, verification_code_expires_at = ?, verification_target = ? WHERE id = ?').run(
    bcrypt.hashSync(verificationCode, 10),
    expiresAt,
    'email',
    user.id,
  );

  res.json({
    message: 'A new verification code has been generated.',
    devVerificationCode: isProduction ? undefined : verificationCode,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const attemptKey = `${normalizedEmail}:${req.ip}`;
  const attemptState = getActiveLoginAttemptState(attemptKey);

  if (attemptState.blockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 10 minutes.' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normalizedEmail);

  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    markFailedLoginAttempt(attemptKey);
    return res.status(401).json({ error: 'Invalid email or password. Please try again or reset your password.' });
  }

  if (!user.is_verified) {
    return res.status(403).json({ error: 'Please verify your account before signing in.', requiresVerification: true, email: user.email });
  }

  clearFailedLoginAttempts(attemptKey);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);
  const refreshedUser: any = getAuthUserRecord(user.id);
  const authUser = serializeAuthUser(refreshedUser);
  const session = createSessionToken(refreshedUser);
  setSessionCookie(res, session.token);

  res.json({
    token: session.token,
    user: authUser,
    defaultAddress: getDefaultAddressForUser(refreshedUser.id),
  });
});

app.post('/api/auth/forgot-password/question', (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }

  const user: any = db.prepare('SELECT id, email, security_question FROM users WHERE lower(email) = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'No account was found for that email address.' });
  }

  res.json({ email: user.email, securityQuestion: user.security_question });
});

app.post('/api/auth/forgot-password/verify', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const securityAnswer = String(req.body.securityAnswer || '').trim().toLowerCase();

  if (!email || !securityAnswer) {
    return res.status(400).json({ error: 'Email and security answer are required.' });
  }

  const user: any = db.prepare('SELECT id, security_answer_hash FROM users WHERE lower(email) = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'No account was found for that email address.' });
  }

  if (!bcrypt.compareSync(securityAnswer, user.security_answer_hash)) {
    return res.status(401).json({ error: 'Security answer did not match our records.' });
  }

  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?').run(user.id, new Date().toISOString());
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  db.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    hashResetToken(rawToken),
    expiresAt,
  );

  res.json({ resetToken: rawToken, message: 'Security answer verified. You can now reset your password.' });
});

app.get('/api/auth/reset-password/:token', (req, res) => {
  const record: any = getValidResetToken(String(req.params.token || ''));

  if (!record) {
    return res.status(400).json({ error: 'This password reset session is invalid or has expired. Please try again.' });
  }

  res.json({ message: 'Password reset session verified.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirm password must match.' });
  }

  const record: any = getValidResetToken(token);
  if (!record) {
    return res.status(400).json({ error: 'This password reset session is invalid or has expired. Please try again.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 12), record.user_id);
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(new Date().toISOString(), record.user_id);

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC, id DESC').all();
  res.json(products.map(serializeProduct));
});

app.get('/api/products/:id', (req, res) => {
  const product: any = resolveProductRecord(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(serializeProduct(product));
});

app.get('/api/cart', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  res.json(buildCartSnapshot(req.user));
});

app.post('/api/cart/items', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const product: any = resolveProductRecord(req.body.productId || req.body.id);
  const quantity = Math.max(1, Number(req.body.quantity || 1));

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const existing: any = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND user_role = ? AND product_id = ?').get(req.user.id, req.user.role, product.id);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(Number(existing.quantity || 0) + quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, user_role, product_id, quantity) VALUES (?, ?, ?, ?)').run(req.user.id, req.user.role, product.id, quantity);
  }

  res.json(buildCartSnapshot(req.user));
});

app.patch('/api/cart/items/:productId', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const product: any = resolveProductRecord(req.params.productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const quantity = Number(req.body.quantity || 0);
  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND user_role = ? AND product_id = ?').run(req.user.id, req.user.role, product.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND user_role = ? AND product_id = ?').run(quantity, req.user.id, req.user.role, product.id);
  }

  res.json(buildCartSnapshot(req.user));
});

app.delete('/api/cart/items/:productId', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const product: any = resolveProductRecord(req.params.productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND user_role = ? AND product_id = ?').run(req.user.id, req.user.role, product.id);
  res.json(buildCartSnapshot(req.user));
});

app.delete('/api/cart/clear', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);
  db.prepare('DELETE FROM cart_coupon_applications WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);
  res.json(buildCartSnapshot(req.user));
});

app.post('/api/cart/apply-coupon', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const couponCode = String(req.body.couponCode || '').trim().toUpperCase();
  if (!couponCode) {
    return res.status(400).json({ error: 'Enter a coupon code to apply.' });
  }

  db.prepare('DELETE FROM cart_coupon_applications WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);
  const snapshot = buildCartSnapshot(req.user);
  const validation = validateCouponForUser(req.user, couponCode, Number(snapshot.summary.discountedSubtotalBeforeCoupon || 0));
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  db.prepare('INSERT INTO cart_coupon_applications (user_id, user_role, coupon_code) VALUES (?, ?, ?)').run(req.user.id, req.user.role, validation.coupon.coupon_code);
  res.json(buildCartSnapshot(req.user));
});

app.delete('/api/cart/coupon', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  db.prepare('DELETE FROM cart_coupon_applications WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);
  res.json(buildCartSnapshot(req.user));
});

app.post('/api/reviews', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const { productId, rating, reviewText } = req.body;
  if (!productId || !rating || !String(reviewText || '').trim()) {
    return res.status(400).json({ error: 'Rating and review text are required' });
  }

  const product: any = /^\d+$/.test(String(productId))
    ? db.prepare('SELECT id, product_id, title FROM products WHERE id = ?').get(Number(productId))
    : db.prepare('SELECT id, product_id, title FROM products WHERE product_id = ?').get(String(productId));

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.prepare(
    'INSERT INTO reviews (product_db_id, product_id, user_id, rating, review_text) VALUES (?, ?, ?, ?, ?)'
  ).run(
    product.id,
    product.product_id || fallbackProductId(product.id),
    req.user.id,
    Number(rating),
    String(reviewText).trim()
  );

  appendReviewCsv({
    product: product.title,
    user: req.user.name || ('User ' + req.user.id),
    rating: Number(rating),
    review: String(reviewText).trim(),
    date: new Date().toISOString(),
  });

  res.json({ message: 'Review submitted successfully' });
});

app.get('/api/addresses/serviceability', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const postalCode = String(req.query.postalCode || req.query.postal_code || '').trim();
  res.json({ serviceable: isServiceablePostalCode(postalCode), message: getServiceabilityMessage(postalCode) });
});

app.get('/api/addresses', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC, address_id DESC').all(req.user.id);
  res.json(addresses.map(serializeAddress));
});

app.post('/api/addresses', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const payload = req.body || {};
  const postalCode = String(payload.postal_code || '').trim();
  if (!payload.house_number || !payload.street || !payload.area || !payload.city || !payload.state || !postalCode) {
    return res.status(400).json({ error: 'Complete the full address before saving.' });
  }

  const isDefault = Boolean(payload.is_default) || !db.prepare('SELECT address_id FROM addresses WHERE user_id = ? LIMIT 1').get(req.user.id);
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  const result = db.prepare(`
    INSERT INTO addresses (
      user_id, recipient_name, phone_number, house_number, street, area, city, state,
      postal_code, country, latitude, longitude, address_type, is_default, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    payload.recipient_name || req.user.name,
    normalizePhone(payload.phone_number || req.user.phone || ''),
    String(payload.house_number || '').trim(),
    String(payload.street || '').trim(),
    String(payload.area || '').trim(),
    String(payload.city || '').trim(),
    String(payload.state || '').trim(),
    postalCode,
    String(payload.country || 'India').trim(),
    payload.latitude || null,
    payload.longitude || null,
    String(payload.address_type || 'home').trim() || 'home',
    isDefault ? 1 : 0,
    new Date().toISOString(),
  );

  const address = db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(result.lastInsertRowid, req.user.id);
  res.json({ address: serializeAddress(address), serviceable: isServiceablePostalCode(postalCode), message: getServiceabilityMessage(postalCode) });
});

app.put('/api/addresses/:id', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const addressId = Number(req.params.id);
  const existing: any = db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(addressId, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Address not found.' });
  }

  const payload = req.body || {};
  const postalCode = String(payload.postal_code || '').trim();
  if (!payload.house_number || !payload.street || !payload.area || !payload.city || !payload.state || !postalCode) {
    return res.status(400).json({ error: 'Complete the full address before saving.' });
  }

  const isDefault = Boolean(payload.is_default);
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  db.prepare(`
    UPDATE addresses
    SET recipient_name = ?, phone_number = ?, house_number = ?, street = ?, area = ?, city = ?, state = ?, postal_code = ?,
        country = ?, latitude = ?, longitude = ?, address_type = ?, is_default = ?, updated_at = ?
    WHERE address_id = ? AND user_id = ?
  `).run(
    payload.recipient_name || req.user.name,
    normalizePhone(payload.phone_number || req.user.phone || ''),
    String(payload.house_number || '').trim(),
    String(payload.street || '').trim(),
    String(payload.area || '').trim(),
    String(payload.city || '').trim(),
    String(payload.state || '').trim(),
    postalCode,
    String(payload.country || 'India').trim(),
    payload.latitude || null,
    payload.longitude || null,
    String(payload.address_type || 'home').trim() || 'home',
    isDefault ? 1 : 0,
    new Date().toISOString(),
    addressId,
    req.user.id,
  );

  const address = db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(addressId, req.user.id);
  res.json({ address: serializeAddress(address), serviceable: isServiceablePostalCode(postalCode), message: getServiceabilityMessage(postalCode) });
});

app.post('/api/addresses/:id/default', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const addressId = Number(req.params.id);
  const existing: any = db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(addressId, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Address not found.' });
  }
  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  db.prepare('UPDATE addresses SET is_default = 1, updated_at = ? WHERE address_id = ? AND user_id = ?').run(new Date().toISOString(), addressId, req.user.id);
  res.json({ address: serializeAddress(db.prepare('SELECT * FROM addresses WHERE address_id = ?').get(addressId)) });
});

app.delete('/api/addresses/:id', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const addressId = Number(req.params.id);
  const existing: any = db.prepare('SELECT * FROM addresses WHERE address_id = ? AND user_id = ?').get(addressId, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Address not found.' });
  }
  db.prepare('DELETE FROM addresses WHERE address_id = ? AND user_id = ?').run(addressId, req.user.id);
  if (existing.is_default) {
    const nextAddress: any = db.prepare('SELECT address_id FROM addresses WHERE user_id = ? ORDER BY updated_at DESC, address_id DESC LIMIT 1').get(req.user.id);
    if (nextAddress) {
      db.prepare('UPDATE addresses SET is_default = 1 WHERE address_id = ? AND user_id = ?').run(nextAddress.address_id, req.user.id);
    }
  }
  res.json({ message: 'Address removed.' });
});

app.post('/api/payments/create-order', authenticateToken, async (req: any, res) => {
  const { amount } = req.body;
  try {
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

app.post('/api/payments/verify', authenticateToken, (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    res.json({ status: 'success' });
  } else {
    res.status(400).json({ status: 'failure' });
  }
});

app.post('/api/orders/create', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const snapshot = buildCartSnapshot(req.user);
  if (snapshot.items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const addressRecord: any = getOwnedAddressRecord(req.user.id, Number(req.body.address_id || req.body.addressId || 0) || null);
  if (!addressRecord) {
    return res.status(400).json({ error: 'Select a delivery address before checkout.' });
  }
  if (!isServiceablePostalCode(addressRecord.postal_code)) {
    return res.status(400).json({ error: getServiceabilityMessage(addressRecord.postal_code) });
  }

  const { payment_method, razorpay_order_id, razorpay_payment_id, payment_status } = req.body;
  const result = db.prepare(`
    INSERT INTO orders (
      customer_id, total_price, payment_method, razorpay_order_id, razorpay_payment_id,
      payment_status, coupon_code, coupon_discount, community_discount, tax_amount,
      delivery_name, delivery_phone, delivery_house_number, delivery_street, delivery_area,
      delivery_city, delivery_state, delivery_postal_code, delivery_country, delivery_latitude, delivery_longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    snapshot.summary.total,
    payment_method || 'COD',
    razorpay_order_id || null,
    razorpay_payment_id || null,
    payment_status || 'Pending',
    snapshot.appliedCoupon?.coupon_code || null,
    snapshot.summary.couponDiscount,
    snapshot.summary.communityDiscount,
    snapshot.summary.tax,
    addressRecord.recipient_name || req.user.name,
    addressRecord.phone_number || req.user.phone || '',
    addressRecord.house_number || '',
    addressRecord.street || '',
    addressRecord.area || '',
    addressRecord.city || '',
    addressRecord.state || '',
    addressRecord.postal_code || '',
    addressRecord.country || 'India',
    addressRecord.latitude || null,
    addressRecord.longitude || null,
  );
  const orderId = Number(result.lastInsertRowid);

  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  snapshot.items.forEach((item: any) => {
    insertItem.run(orderId, item.id, item.quantity, roundCurrency(item.line_total / Math.max(1, item.quantity)));
  });

  if (snapshot.appliedCoupon?.coupon_code) {
    db.prepare('UPDATE coupons SET current_usage = current_usage + 1 WHERE UPPER(coupon_code) = UPPER(?)').run(snapshot.appliedCoupon.coupon_code);
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);
  db.prepare('DELETE FROM cart_coupon_applications WHERE user_id = ? AND user_role = ?').run(req.user.id, req.user.role);

  res.json({ order_id: orderId, total_price: snapshot.summary.total, message: 'Order created' });
});

app.get('/api/orders/history', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const orders = db.prepare(`
    SELECT o.*, GROUP_CONCAT(p.title) as items_list
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json((orders as any[]).map(serializeOrderSummary));
});

app.get('/api/orders/:id', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const order = getOrderDetailForUser(Number(req.params.id), req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  res.json(order);
});

app.post('/api/orders/:id/pay-online/create-order', authenticateToken, authorizeRole(['customer', 'rwa']), async (req: any, res) => {
  const order = getOrderDetailForUser(Number(req.params.id), req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (!canConvertCodOrder(order)) {
    return res.status(400).json({ error: 'This order is not eligible for online payment conversion.' });
  }

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.total_price || 0) * 100),
      currency: 'INR',
      receipt: `order_${order.id}_${Date.now()}`,
    });
    res.json(razorpayOrder);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

app.post('/api/orders/:id/pay-online', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const order = getOrderDetailForUser(Number(req.params.id), req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (!canConvertCodOrder(order)) {
    return res.status(400).json({ error: 'This order is not eligible for online payment conversion.' });
  }

  db.prepare(`
    UPDATE orders
    SET payment_method = 'ONLINE',
        payment_status = 'Paid Online',
        razorpay_order_id = ?,
        razorpay_payment_id = ?,
        payment_converted_at = ?
    WHERE id = ? AND customer_id = ?
  `).run(
    req.body.razorpay_order_id || null,
    req.body.razorpay_payment_id || null,
    new Date().toISOString(),
    order.id,
    req.user.id,
  );

  res.json({ message: 'Payment status updated.', order: getOrderDetailForUser(order.id, req.user.id) });
});

app.post('/api/orders/:id/cancel', authenticateToken, authorizeRole(['customer', 'rwa']), (req: any, res) => {
  const order = getOrderDetailForUser(Number(req.params.id), req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (!isOrderCancelable(order)) {
    return res.status(400).json({ error: 'This order can no longer be cancelled.' });
  }

  const reason = String(req.body.reason || '').trim();
  const otherReason = String(req.body.otherReason || '').trim();
  if (!reason) {
    return res.status(400).json({ error: 'Select a cancellation reason.' });
  }
  if (reason === 'Other' && !otherReason) {
    return res.status(400).json({ error: 'Enter your cancellation note.' });
  }

  db.prepare(`
    UPDATE orders
    SET order_status = 'Cancelled',
        cancellation_reason = ?,
        cancellation_note = ?,
        cancelled_at = ?
    WHERE id = ? AND customer_id = ?
  `).run(reason, reason === 'Other' ? otherReason : '', new Date().toISOString(), order.id, req.user.id);

  res.json({ message: 'Your order has been cancelled successfully.', order: getOrderDetailForUser(order.id, req.user.id) });
});

app.get('/api/group-buy/list', authenticateToken, authorizeRole(['rwa', 'admin']), (req: any, res) => {
  refreshAllCommunityEventStatuses();
  const productFilter = req.query.productId ? Number(req.query.productId) : null;
  const requestedSociety = String(req.query.societyName || '').trim();
  let rows: any[] = [];

  if (req.user.role === 'admin') {
    if (productFilter && requestedSociety) {
      rows = db.prepare('SELECT * FROM community_events WHERE product_id = ? AND society_name = ? ORDER BY end_date ASC, created_at DESC').all(productFilter, requestedSociety) as any[];
    } else if (productFilter) {
      rows = db.prepare('SELECT * FROM community_events WHERE product_id = ? ORDER BY end_date ASC, created_at DESC').all(productFilter) as any[];
    } else if (requestedSociety) {
      rows = db.prepare('SELECT * FROM community_events WHERE society_name = ? ORDER BY end_date ASC, created_at DESC').all(requestedSociety) as any[];
    } else {
      rows = db.prepare('SELECT * FROM community_events ORDER BY end_date ASC, created_at DESC').all() as any[];
    }
  } else {
    const societyName = String(req.user.society_name || '').trim();
    if (productFilter) {
      rows = db.prepare('SELECT * FROM community_events WHERE product_id = ? AND society_name = ? ORDER BY end_date ASC, created_at DESC').all(productFilter, societyName) as any[];
    } else {
      rows = db.prepare('SELECT * FROM community_events WHERE society_name = ? ORDER BY end_date ASC, created_at DESC').all(societyName) as any[];
    }
  }

  res.json((rows as any[]).map((entry) => serializeCommunityEvent(entry, req.user)));
});

app.post('/api/group-buy/create', authenticateToken, authorizeRole(['admin']), (req: any, res) => {
  const product = resolveProductRecord(req.body.product_id || req.body.productId);
  const minimumParticipants = Math.max(1, Number(req.body.minimum_participants || req.body.minimum_quantity || 0));
  const discountPercentage = Math.max(1, Number(req.body.discount_percentage || 0));
  const durationDays = Math.max(1, Number(req.body.event_duration_days || 0));
  const eventTitle = String(req.body.event_title || '').trim();
  const societyName = String(req.body.society_name || '').trim();
  const rawStartDate = String(req.body.start_date || '').trim();
  const startDate = rawStartDate ? new Date(rawStartDate) : new Date();

  if (!product) {
    return res.status(404).json({ error: 'Select a valid product for the event.' });
  }

  if (!eventTitle || !minimumParticipants || !discountPercentage || !durationDays) {
    return res.status(400).json({ error: 'Event title, product, minimum participants, discount, and duration are required.' });
  }

  if (!societyName) {
    return res.status(400).json({ error: 'Select the RWA society for this deal.' });
  }

  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'Choose a valid start date.' });
  }

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(`
    INSERT INTO community_events (
      product_id, event_title, minimum_quantity, current_participants, discount_percentage,
      event_duration_days, start_date, end_date, event_deadline, created_by, society_name, status
    )
    VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(product.id, eventTitle, minimumParticipants, discountPercentage, durationDays, startDate.toISOString(), endDate, endDate, req.user.id, societyName);

  const event = db.prepare('SELECT * FROM community_events WHERE event_id = ?').get(result.lastInsertRowid);
  res.json(serializeCommunityEvent(event, req.user));
});

app.put('/api/admin/community-deals/:eventId', authenticateToken, authorizeRole(['admin']), (req: any, res) => {
  const eventId = Number(req.params.eventId);
  const existingEvent: any = db.prepare('SELECT * FROM community_events WHERE event_id = ?').get(eventId);

  if (!existingEvent) {
    return res.status(404).json({ error: 'Community deal not found.' });
  }

  const product = resolveProductRecord(req.body.product_id || req.body.productId || existingEvent.product_id);
  const minimumParticipants = Math.max(1, Number(req.body.minimum_participants || req.body.minimum_quantity || existingEvent.minimum_quantity || 0));
  const discountPercentage = Math.max(1, Number(req.body.discount_percentage || existingEvent.discount_percentage || 0));
  const durationDays = Math.max(1, Number(req.body.event_duration_days || existingEvent.event_duration_days || 0));
  const eventTitle = String(req.body.event_title || existingEvent.event_title || '').trim();
  const societyName = String(req.body.society_name || existingEvent.society_name || '').trim();
  const rawStartDate = String(req.body.start_date || existingEvent.start_date || '').trim();
  const startDate = rawStartDate ? new Date(rawStartDate) : new Date();

  if (!product) {
    return res.status(404).json({ error: 'Select a valid product for the event.' });
  }

  if (!eventTitle || !minimumParticipants || !discountPercentage || !durationDays) {
    return res.status(400).json({ error: 'Event title, product, minimum participants, discount, and duration are required.' });
  }

  if (!societyName) {
    return res.status(400).json({ error: 'Select the RWA society for this deal.' });
  }

  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'Choose a valid start date.' });
  }

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE community_events
    SET product_id = ?,
        event_title = ?,
        minimum_quantity = ?,
        discount_percentage = ?,
        event_duration_days = ?,
        start_date = ?,
        end_date = ?,
        event_deadline = ?,
        society_name = ?,
        status = CASE
          WHEN COALESCE(current_participants, 0) >= ? THEN 'active'
          WHEN ? < datetime('now') THEN 'expired'
          ELSE 'open'
        END
    WHERE event_id = ?
  `).run(product.id, eventTitle, minimumParticipants, discountPercentage, durationDays, startDate.toISOString(), endDate, endDate, societyName, minimumParticipants, endDate, eventId);

  const updatedEvent = refreshCommunityEventStatus(eventId);
  res.json(serializeCommunityEvent(updatedEvent, req.user));
});

app.post('/api/group-buy/join', authenticateToken, authorizeRole(['rwa']), (req: any, res) => {
  if (!canJoinCommunityDeals(req.user)) {
    return res.status(403).json({ error: 'Only RWA members can join community deals.' });
  }

  const eventId = Number(req.body.event_id || req.body.eventId);
  if (!eventId) {
    return res.status(400).json({ error: 'Choose a community deal to join.' });
  }

  const event: any = refreshCommunityEventStatus(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Community deal not found.' });
  }

  if (!belongsToEventSociety(req.user, event)) {
    return res.status(403).json({ error: 'This community deal belongs to a different apartment community.' });
  }

  if (event.status === 'expired') {
    return res.status(400).json({ error: 'This community deal has expired.' });
  }

  const alreadyJoined = db.prepare('SELECT id FROM community_event_participants WHERE event_id = ? AND user_id = ? AND user_role = ?').get(eventId, req.user.id, req.user.role);
  if (alreadyJoined) {
    return res.status(400).json({ error: 'You have already joined this community deal.' });
  }

  db.prepare('INSERT INTO community_event_participants (event_id, user_id, user_role) VALUES (?, ?, ?)').run(eventId, req.user.id, req.user.role);
  const updatedEvent = refreshCommunityEventStatus(eventId);

  res.json({
    message: updatedEvent?.status === 'active' ? 'Community deal is now active.' : 'You joined the community deal.',
    event: serializeCommunityEvent(updatedEvent, req.user),
  });
});

app.get('/api/group-buy/participants/:eventId', authenticateToken, authorizeRole(['rwa', 'admin']), (req: any, res) => {
  const event: any = db.prepare('SELECT * FROM community_events WHERE event_id = ?').get(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'Community deal not found.' });
  }

  if (!belongsToEventSociety(req.user, event)) {
    return res.status(403).json({ error: 'You can only view participants for your apartment community.' });
  }

  const participants = db.prepare(`
    SELECT p.id,
           u.name as customer_name,
           u.apartment_block,
           u.society_name,
           p.joined_at
    FROM community_event_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.joined_at ASC, p.id ASC
  `).all(req.params.eventId).map((participant: any) => ({
    id: participant.id,
    customer_name: participant.customer_name,
    apartment_block: formatApartmentBlock(participant.apartment_block, participant.society_name),
    joined_at: participant.joined_at,
  }));
  res.json(participants);
});

app.get('/api/rwa/orders', authenticateToken, authorizeRole(['rwa']), (req: any, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as customer_name, GROUP_CONCAT(p.title) as items_list
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json((orders as any[]).map(serializeOrderSummary));
});

app.post('/api/admin/create-rwa', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { name, email, phone, password, society_name, community_role, apartment_block, security_question, security_answer } = req.body;
  const normalizedRole = normalizeCommunityRole(community_role);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!name || !normalizedEmail || !password || !society_name || !['coordinator', 'resident'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Name, email, password, society name, and RWA account type are required.' });
  }
  if (db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail)) {
    return res.status(400).json({ error: 'Email already exists.' });
  }
  if (normalizedPhone && db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone)) {
    return res.status(400).json({ error: 'Phone number already exists.' });
  }

  try {
    db.prepare(`
      INSERT INTO users (
        user_id, name, email, phone, password_hash, role, community_role,
        apartment_block, society_name, security_question, security_answer_hash,
        is_verified, verification_target
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      name,
      normalizedEmail,
      normalizedPhone || null,
      bcrypt.hashSync(password, 12),
      'rwa',
      normalizedRole,
      apartment_block || society_name,
      society_name,
      security_question || 'What is your apartment block?',
      bcrypt.hashSync(String(security_answer || apartment_block || society_name).trim().toLowerCase(), 12),
      1,
      'email',
    );
    res.json({ message: 'RWA account created' });
  } catch (_err) {
    res.status(400).json({ error: 'Unable to create the RWA account.' });
  }
});

app.post('/api/admin/upload-image', authenticateToken, authorizeRole(['admin']), upload.single('image'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please choose an image to upload.' });
  }

  res.json({ imageUrl: buildAssetUrl(req, req.file.filename) });
});

app.post('/api/admin/products/generate-image', authenticateToken, authorizeRole(['admin']), (req, res) => {
  res.json(buildAiProductImage(req.body || {}));
});

app.post('/api/admin/products', authenticateToken, authorizeRole(['admin']), (req: any, res) => {
  const title = req.body.title || req.body.name;
  const category = req.body.category || inferCategory(title || '');
  const subcategory = req.body.subcategory || inferSubcategory(title || '', category);
  const productId = req.body.productId || req.body.product_id;
  const imageUrl = req.body.image_url || req.body.image;

  try {
    db.prepare('INSERT INTO products (product_id, title, description, category, subcategory, fabric, color, occasion, price, image_url, stock, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      productId || null,
      title,
      req.body.description,
      category,
      subcategory,
      req.body.fabric,
      req.body.color,
      req.body.occasion,
      Number(req.body.price || 0),
      imageUrl,
      Number(req.body.stock || 0),
      Number(req.body.rating || 4.4),
    );

    const created: any = db.prepare('SELECT id FROM products ORDER BY id DESC LIMIT 1').get();
    if (created) {
      db.prepare('UPDATE products SET product_id = COALESCE(product_id, ?) WHERE id = ?').run(productId || fallbackProductId(created.id), created.id);
    }

    res.json({ message: 'Product added' });
  } catch (error) {
    res.status(400).json({ error: 'Unable to add this product. Check the product id and details.' });
  }
});

app.put('/api/admin/products/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const title = req.body.title || req.body.name;
  const category = req.body.category || inferCategory(title || '');
  const subcategory = req.body.subcategory || inferSubcategory(title || '', category);
  const productId = req.body.productId || req.body.product_id;
  const imageUrl = req.body.image_url || req.body.image;

  try {
    db.prepare(`
      UPDATE products
      SET product_id = ?,
          title = ?,
          description = ?,
          category = ?,
          subcategory = ?,
          fabric = ?,
          color = ?,
          occasion = ?,
          price = ?,
          image_url = ?,
          stock = ?,
          rating = ?
      WHERE id = ?
    `).run(
      productId || fallbackProductId(Number(req.params.id)),
      title,
      req.body.description,
      category,
      subcategory,
      req.body.fabric,
      req.body.color,
      req.body.occasion,
      Number(req.body.price || 0),
      imageUrl,
      Number(req.body.stock || 0),
      Number(req.body.rating || 4.4),
      req.params.id,
    );
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(400).json({ error: 'Unable to update this product.' });
  }
});

app.post('/api/admin/coupons', authenticateToken, authorizeRole(['admin']), (req: any, res) => {
  const { coupon_code, discount_type, discount_value, minimum_order_value, expiry_date, max_usage, user_type } = req.body;
  if (!coupon_code || !discount_type || !discount_value || !expiry_date || !max_usage || !user_type) {
    return res.status(400).json({ error: 'Complete all coupon fields before saving.' });
  }

  try {
    db.prepare(`
      INSERT INTO coupons (coupon_code, discount_type, discount_value, minimum_order_value, expiry_date, max_usage, user_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(String(coupon_code).trim().toUpperCase(), discount_type, Number(discount_value), Number(minimum_order_value || 0), expiry_date, Number(max_usage), user_type, req.user.id);
    res.json({ message: 'Coupon created' });
  } catch (error) {
    res.status(400).json({ error: 'Coupon code already exists or is invalid.' });
  }
});

app.get('/api/admin/coupons', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC, id DESC').all();
  res.json(coupons);
});

app.get('/api/admin/orders', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as customer_name, u.society_name, GROUP_CONCAT(p.title) as items_list
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

app.post('/api/admin/orders/:id/update', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { order_status, delivery_partner, tracking_id, tracking_url } = req.body;
  db.prepare(`
    UPDATE orders
    SET order_status = ?, delivery_partner = ?, tracking_id = ?, tracking_url = ?
    WHERE id = ?
  `).run(order_status, delivery_partner, tracking_id, tracking_url, req.params.id);
  res.json({ message: 'Order updated' });
});

app.get('/api/admin/users', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  const users = db.prepare('SELECT id, name, email, role, community_role, apartment_block, society_name FROM users').all();
  res.json(users);
});

app.get('/api/admin/reviews/download', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  ensureReviewsCsvExists();
  res.download(REVIEWS_CSV_PATH, 'reviews.csv');
});

app.get('/api/admin/reviews', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  const reviews = db.prepare(`
    SELECT r.id,
           r.product_id,
           p.title as product_name,
           u.name as user_name,
           r.rating,
           r.review_text,
           r.created_at
    FROM reviews r
    LEFT JOIN products p ON p.id = r.product_db_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC, r.id DESC
  `).all();
  res.json(reviews);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

































