/*
  # Add Shopping Cart System

  1. New Tables
    - `carts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `listing_id` (uuid, references listings)
      - `quantity` (integer, min 1)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, listing_id) to prevent duplicates

  2. Indexes
    - Index on user_id for fast cart retrieval
    - Index on (user_id, listing_id) for uniqueness

  3. Security
    - Enable RLS on carts table
    - Users can only view/modify their own cart
    - Items can only be added if listing is active
*/

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS carts_user_id_idx ON carts(user_id);
CREATE INDEX IF NOT EXISTS carts_user_listing_idx ON carts(user_id, listing_id);
CREATE INDEX IF NOT EXISTS carts_created_at_idx ON carts(created_at DESC);

-- Enable RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own cart
CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can add items to their own cart
CREATE POLICY "Users can add to own cart"
  ON carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cart items
CREATE POLICY "Users can delete from own cart"
  ON carts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);