-- +migrate Up
-- Create expense categories table
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Create expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_user_id ON expenses(recorded_by_user_id);
CREATE INDEX idx_expenses_warehouse_id ON expenses(warehouse_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- Insert default categories
INSERT INTO expense_categories (name, description) VALUES
    ('Rent', 'Business premises rent'),
    ('Utilities', 'Electricity, water, gas, internet'),
    ('Salaries', 'Employee wages and bonuses'),
    ('Fuel', 'Vehicle fuel and transportation costs'),
    ('Marketing', 'Advertising and promotional activities'),
    ('Maintenance', 'Equipment and building repairs'),
    ('Office Supplies', 'Stationery, printer ink, etc.'),
    ('Other', 'Miscellaneous business expenses');

-- Insert new permissions
INSERT INTO permissions (slug, description) VALUES
    ('expenses.view', 'View recorded expenses'),
    ('expenses.create', 'Record new business expenses'),
    ('expenses.update', 'Modify existing expense records'),
    ('expenses.delete', 'Remove expense records'),
    ('expense_categories.manage', 'Manage expense categories');

-- Assign new permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN (
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete', 'expense_categories.manage'
);

-- +migrate Down
-- Revoke permissions first
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE slug IN (
        'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete', 'expense_categories.manage'
    )
);
DELETE FROM permissions WHERE slug IN (
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete', 'expense_categories.manage'
);

DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;
