-- College Marketplace Reporting Queries
-- These queries generate comprehensive reports for the marketplace system

-- ===========================
-- 1. TOTAL ORDERS & SALES REPORTS
-- ===========================

-- Total Orders Report: Shows total number of orders by analyzing cart history
-- (Aggregate cart transactions to simulate completed orders)
SELECT
  COUNT(DISTINCT DATE(carts.created_at)) as total_order_days,
  COUNT(DISTINCT carts.user_id) as total_customers,
  SUM(listings.price * carts.quantity) as total_sales_value,
  AVG(listings.price * carts.quantity) as avg_order_value
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
WHERE listings.status = 'sold';

-- Daily Sales Report
SELECT
  DATE(carts.created_at) as sale_date,
  COUNT(DISTINCT carts.user_id) as customers,
  COUNT(*) as items_sold,
  SUM(listings.price * carts.quantity) as daily_sales
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
WHERE listings.status = 'sold'
GROUP BY DATE(carts.created_at)
ORDER BY sale_date DESC;

-- Sales by Category Report
SELECT
  listings.category,
  COUNT(*) as items_sold,
  SUM(listings.price * carts.quantity) as category_sales,
  AVG(listings.price) as avg_price,
  MIN(listings.price) as min_price,
  MAX(listings.price) as max_price
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
WHERE listings.status = 'sold'
GROUP BY listings.category
ORDER BY category_sales DESC;

-- ===========================
-- 2. INVENTORY & PRODUCT REPORTS
-- ===========================

-- Low Stock or Low Quantity Items
-- (Items with quantity = 1 or few units available)
SELECT
  id,
  title,
  price,
  category,
  condition,
  location,
  created_at
FROM listings
WHERE status = 'active'
ORDER BY price ASC
LIMIT 20;

-- High-Value Products Report
SELECT
  id,
  title,
  price,
  category,
  condition,
  location,
  profiles.full_name as seller_name
FROM listings
INNER JOIN profiles ON listings.user_id = profiles.id
WHERE listings.status = 'active'
ORDER BY price DESC
LIMIT 20;

-- Products by Condition Distribution
SELECT
  condition,
  COUNT(*) as count,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM listings
WHERE status = 'active'
GROUP BY condition
ORDER BY count DESC;

-- ===========================
-- 3. USER & SELLER REPORTS
-- ===========================

-- Top Sellers Report: Users with most sold items
SELECT
  profiles.id,
  profiles.full_name,
  profiles.location,
  COUNT(listings.id) as total_listings,
  COUNT(CASE WHEN listings.status = 'sold' THEN 1 END) as items_sold,
  SUM(listings.price) as total_sales_value
FROM profiles
LEFT JOIN listings ON profiles.id = listings.user_id
GROUP BY profiles.id, profiles.full_name, profiles.location
HAVING COUNT(listings.id) > 0
ORDER BY items_sold DESC
LIMIT 10;

-- Active Sellers Report
SELECT
  profiles.id,
  profiles.full_name,
  profiles.location,
  COUNT(listings.id) as active_listings,
  AVG(listings.price) as avg_listing_price
FROM profiles
LEFT JOIN listings ON profiles.id = listings.user_id
  AND listings.status = 'active'
GROUP BY profiles.id, profiles.full_name, profiles.location
HAVING COUNT(listings.id) > 0
ORDER BY COUNT(listings.id) DESC;

-- ===========================
-- 4. CUSTOMER & PURCHASE REPORTS
-- ===========================

-- Top Buyers Report
SELECT
  carts.user_id,
  profiles.full_name,
  COUNT(DISTINCT carts.listing_id) as items_purchased,
  SUM(listings.price * carts.quantity) as total_spent,
  AVG(listings.price) as avg_item_price
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
INNER JOIN profiles ON carts.user_id = profiles.id
GROUP BY carts.user_id, profiles.full_name
ORDER BY total_spent DESC
LIMIT 10;

-- Purchase Frequency Report
SELECT
  carts.user_id,
  profiles.full_name,
  COUNT(*) as purchase_count,
  COUNT(DISTINCT DATE(carts.created_at)) as days_active
FROM carts
INNER JOIN profiles ON carts.user_id = profiles.id
GROUP BY carts.user_id, profiles.full_name
ORDER BY purchase_count DESC;

-- ===========================
-- 5. CART & INVENTORY HEALTH
-- ===========================

-- Current Cart Status: Items in active carts
SELECT
  COUNT(*) as items_in_carts,
  COUNT(DISTINCT user_id) as users_with_carts,
  SUM(quantity) as total_quantity_in_carts,
  SUM(listings.price * carts.quantity) as total_cart_value
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
WHERE listings.status = 'active';

-- Cart Abandonment Insights: Old carts not yet checked out
SELECT
  carts.user_id,
  profiles.full_name,
  COUNT(carts.id) as items_in_cart,
  SUM(listings.price * carts.quantity) as potential_sale_value,
  MAX(carts.created_at) as last_updated
FROM carts
INNER JOIN listings ON carts.listing_id = listings.id
INNER JOIN profiles ON carts.user_id = profiles.id
WHERE listings.status = 'active'
  AND carts.created_at < NOW() - INTERVAL '7 days'
GROUP BY carts.user_id, profiles.full_name
ORDER BY potential_sale_value DESC;

-- ===========================
-- 6. DATA INTEGRITY & CONSTRAINTS TESTS
-- ===========================

-- Foreign Key Integrity Check: Carts referencing non-existent listings
SELECT
  carts.id,
  carts.listing_id,
  carts.user_id
FROM carts
WHERE carts.listing_id NOT IN (SELECT id FROM listings)
   OR carts.user_id NOT IN (SELECT id FROM profiles);

-- Foreign Key Integrity Check: Listings with non-existent users
SELECT
  listings.id,
  listings.user_id
FROM listings
WHERE listings.user_id NOT IN (SELECT id FROM profiles);

-- Unique Constraint Check: Duplicate cart items (should be 0)
SELECT
  user_id,
  listing_id,
  COUNT(*) as duplicate_count
FROM carts
GROUP BY user_id, listing_id
HAVING COUNT(*) > 1;

-- Price Validation: Items with invalid prices (negative or zero)
SELECT
  id,
  title,
  price,
  category
FROM listings
WHERE price <= 0;

-- Quantity Validation: Cart items with invalid quantities
SELECT
  id,
  user_id,
  listing_id,
  quantity
FROM carts
WHERE quantity <= 0;

-- ===========================
-- 7. MARKETPLACE HEALTH METRICS
-- ===========================

-- Marketplace Overview Dashboard
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM listings WHERE status = 'active') as active_listings,
  (SELECT COUNT(*) FROM listings WHERE status = 'sold') as sold_items,
  (SELECT AVG(price) FROM listings WHERE status = 'active') as avg_listing_price,
  (SELECT COUNT(DISTINCT user_id) FROM carts) as users_with_carts,
  (SELECT SUM(price * quantity) FROM carts INNER JOIN listings ON carts.listing_id = listings.id) as total_cart_value;

-- Category Performance Metrics
SELECT
  listings.category,
  COUNT(*) as total_listings,
  COUNT(CASE WHEN listings.status = 'sold' THEN 1 END) as sold_count,
  COUNT(CASE WHEN listings.status = 'active' THEN 1 END) as active_count,
  ROUND(100.0 * COUNT(CASE WHEN listings.status = 'sold' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as sell_through_rate,
  AVG(CASE WHEN listings.status = 'active' THEN listings.price END) as avg_active_price
FROM listings
GROUP BY listings.category
ORDER BY active_count DESC;

-- Geographic Distribution (by seller location)
SELECT
  location,
  COUNT(*) as sellers,
  COUNT(DISTINCT user_id) as unique_sellers,
  AVG(price) as avg_listing_price,
  SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_items
FROM listings
GROUP BY location
ORDER BY sellers DESC;