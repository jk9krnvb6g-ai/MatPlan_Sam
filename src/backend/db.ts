import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { RequestItem, User, Department, WorkGroup, LogEntry } from '../frontend/types';
import { SEED_USERS, seedRequests, INITIAL_WORK_GROUPS, DEPARTMENTS, CATALOG } from '../frontend/data/catalog';

// Helper for synchronous password hashing
export function hashPasswordSync(password: string): string {
  if (!password) return '';
  if (password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$')) {
    return password; // Already hashed
  }
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Helper for verifying password
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash || !plain) return false;
  if (plain === hash) return true;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      const isMatch = await bcrypt.compare(plain, hash);
      if (isMatch) return true;
    } catch (e) {
      // ignore error and try fallbacks
    }
  }
  return plain === hash;
}

interface DbSchema {
  requests: RequestItem[];
  users: User[];
  departments: Department[];
  workGroups: WorkGroup[];
  customItems: Record<string, string[]>;
  itemPrices: Record<string, number>;
  materialActive: Record<string, boolean>;
  isPlanFrozen: boolean;
  fiscalYear: string;
  isCatalogCleared?: boolean;
  logs?: LogEntry[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'backend', 'db.json');

// Helper to ensure db.json exists with seed data
function initializeDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const loaded = JSON.parse(raw);
      loaded.logs = loaded.logs || [];
      // Ensure existing users have hashed passwords
      if (loaded.users) {
        loaded.users = loaded.users.map((u: any) => ({
          ...u,
          password: hashPasswordSync(u.password)
        }));
      }
      return loaded;
    }
  } catch (err) {
    console.error('Error reading DB, re-initializing...', err);
  }

  // Create default state
  const defaultState: DbSchema = {
    requests: [],
    users: SEED_USERS.map(u => ({ ...u, password: hashPasswordSync(u.password) })),
    departments: DEPARTMENTS,
    workGroups: INITIAL_WORK_GROUPS,
    customItems: {},
    itemPrices: {},
    materialActive: {},
    isPlanFrozen: false,
    fiscalYear: '2569',
    logs: []
  };

  // Ensure directories exist
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
  return defaultState;
}

let dbCache: DbSchema = initializeDb();

// MySQL Configuration & Initialization
let mysqlPool: mysql.Pool | null = null;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME || 'MatPlan';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

if (DB_HOST && DB_USER) {
  console.log(`[MySQL] Configuring connection pool for host: ${DB_HOST}:${DB_PORT}, database: ${DB_NAME}`);
  mysqlPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
  });

  // Setup MySQL tables and load state
  setupMySQLTables().catch(err => {
    console.error('[MySQL] Setup / Load error:', err);
  });
} else {
  console.log('[MySQL] DB_HOST or DB_USER not set. Using local file-based db.json storage.');
}

// Setup MySQL tables and load state
export async function setupMySQLTables(): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!mysqlPool) {
    return { success: false, error: 'MySQL connection pool is not initialized. Please check DB_HOST and DB_USER in .env file.' };
  }
  try {
    // 1. Create system_settings & system_state tables
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS system_state (
        id INT PRIMARY KEY,
        state_data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if migration is already done
    const [settingRows]: any = await mysqlPool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'migrated_to_relational'"
    );
    const alreadyMigrated = settingRows && settingRows.length > 0 && settingRows[0].setting_value === 'true';

    // 2. Create other relational tables
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS work_groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        code VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        work_group_id VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        roles TEXT,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        dept_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id VARCHAR(255) PRIMARY KEY,
        dept_id VARCHAR(255) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        qty_last_year INT NOT NULL DEFAULT 0,
        qty_requested INT NOT NULL DEFAULT 0,
        status VARCHAR(100) NOT NULL DEFAULT 'draft',
        comment TEXT,
        reason TEXT,
        unit_price DECIMAL(15,2),
        fiscal_year VARCHAR(50),
        created_at VARCHAR(100),
        updated_at VARCHAR(100),
        requester_name VARCHAR(255),
        requester_sub_dept VARCHAR(255),
        qty_original INT,
        qty_adjusted INT,
        adjusted_by_role VARCHAR(100),
        adjusted_by_name VARCHAR(255),
        adjusted_at VARCHAR(100),
        rejected_by_role VARCHAR(100),
        rejected_by_name VARCHAR(255),
        rejected_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(100) NOT NULL,
        username VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    let sourceState: DbSchema | null = null;

    // Check if we need to migrate from old system_state table
    if (!alreadyMigrated) {
      try {
        const [tableCheck]: any = await mysqlPool.query(`
          SELECT COUNT(*) as cnt FROM information_schema.tables 
          WHERE table_schema = ? AND table_name = 'system_state'
        `, [DB_NAME]);
        
        if (tableCheck && tableCheck[0] && tableCheck[0].cnt > 0) {
          const [rows]: any = await mysqlPool.query('SELECT state_data FROM system_state WHERE id = 1');
          if (rows && rows.length > 0) {
            console.log('[MySQL Migration] Found legacy system_state data. Migrating to relational tables...');
            sourceState = JSON.parse(rows[0].state_data);
          }
        }
      } catch (err) {
        console.log('[MySQL Migration] No legacy system_state table found or query failed. Skipping migration.');
      }
    }

    if (sourceState) {
      // Migrate legacy state to relational tables
      await saveRelationalState(sourceState);
      await mysqlPool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('migrated_to_relational', 'true') ON DUPLICATE KEY UPDATE setting_value = 'true'"
      );
      console.log('[MySQL Migration] Legacy state successfully migrated to relational tables!');
    }

    // Now load current state from relational tables
    const loadedState = await loadRelationalState();
    if (loadedState) {
      dbCache = loadedState;
      console.log('[MySQL] Successfully loaded state from relational tables!');
      // Dual-Sync: Sync local db.json with MySQL state on startup
      try {
        const dir = path.dirname(DB_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbCache, null, 2), 'utf-8');
        console.log('[Dual-Sync] Local db.json updated with latest MySQL database state.');
      } catch (e) {
        console.error('[Dual-Sync] Error updating db.json from MySQL state:', e);
      }
    } else {
      console.log('[MySQL] No relational state found. Seeding default state to relational tables...');
      await saveRelationalState(dbCache);
      await mysqlPool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('migrated_to_relational', 'true') ON DUPLICATE KEY UPDATE setting_value = 'true'"
      );
    }
    return { success: true, message: 'MySQL tables and default data setup completed successfully!' };
  } catch (err: any) {
    console.error('[MySQL] Failed to setup MySQL database tables:', err);
    return { success: false, error: err.message || String(err) };
  }
}

async function loadRelationalState(): Promise<DbSchema | null> {
  if (!mysqlPool) return null;
  try {
    // Check if any work_groups exist. If nothing exists, return null so it seeds.
    const [wgRows]: any = await mysqlPool.query('SELECT * FROM work_groups');
    if (!wgRows || wgRows.length === 0) {
      return null;
    }

    const workGroups: WorkGroup[] = wgRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      code: row.code || undefined
    }));

    // Load departments
    const [deptRows]: any = await mysqlPool.query('SELECT * FROM departments');
    const departments: Department[] = deptRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      workGroupId: row.work_group_id || undefined
    }));

    // Load users
    const [userRows]: any = await mysqlPool.query('SELECT * FROM users');
    const users: User[] = userRows.map((row: any) => {
      let extraRoles: string[] = [];
      try {
        if (row.roles) {
          extraRoles = JSON.parse(row.roles);
        }
      } catch (e) {}
      return {
        username: row.username,
        password: row.password,
        role: row.role,
        roles: extraRoles.length > 0 ? extraRoles : undefined,
        name: row.name,
        category: row.category || undefined,
        deptId: row.dept_id,
        status: row.status
      };
    });

    // Load requests
    const [reqRows]: any = await mysqlPool.query('SELECT * FROM requests');
    const requests: RequestItem[] = reqRows.map((row: any) => ({
      id: row.id,
      deptId: row.dept_id,
      itemName: row.item_name,
      unit: row.unit,
      qtyLastYear: row.qty_last_year,
      qtyRequested: row.qty_requested,
      status: row.status,
      comment: row.comment || '',
      reason: row.reason || '',
      unitPrice: row.unit_price !== null ? Number(row.unit_price) : null,
      fiscalYear: row.fiscal_year || undefined,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
      requesterName: row.requester_name || undefined,
      requesterSubDept: row.requester_sub_dept || undefined,
      qtyOriginal: row.qty_original !== null ? Number(row.qty_original) : undefined,
      qtyAdjusted: row.qty_adjusted !== null ? Number(row.qty_adjusted) : undefined,
      adjustedByRole: row.adjusted_by_role || undefined,
      adjustedByName: row.adjusted_by_name || undefined,
      adjustedAt: row.adjusted_at || undefined,
      rejectedByRole: row.rejected_by_role || undefined,
      rejectedByName: row.rejected_by_name || undefined,
      rejectedAt: row.rejected_at || undefined
    }));

    // Load logs
    const [logRows]: any = await mysqlPool.query('SELECT * FROM system_logs');
    const logs: LogEntry[] = logRows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      username: row.username,
      name: row.name,
      actionType: row.action_type,
      module: row.module,
      description: row.description
    }));

    // Load settings
    const [settingRows]: any = await mysqlPool.query('SELECT * FROM system_settings');
    const settingsMap: Record<string, string> = {};
    for (const r of settingRows) {
      settingsMap[r.setting_key] = r.setting_value;
    }

    let customItems: Record<string, string[]> = {};
    try {
      if (settingsMap['customItems']) {
        customItems = JSON.parse(settingsMap['customItems']);
      }
    } catch (e) {}

    let itemPrices: Record<string, number> = {};
    try {
      if (settingsMap['itemPrices']) {
        itemPrices = JSON.parse(settingsMap['itemPrices']);
      }
    } catch (e) {}

    let materialActive: Record<string, boolean> = {};
    try {
      if (settingsMap['materialActive']) {
        materialActive = JSON.parse(settingsMap['materialActive']);
      }
    } catch (e) {}

    const isPlanFrozen = settingsMap['isPlanFrozen'] === 'true';
    const isCatalogCleared = settingsMap['isCatalogCleared'] === 'true';
    const fiscalYear = settingsMap['fiscalYear'] || '2569';

    return {
      workGroups,
      departments,
      users,
      requests,
      customItems,
      itemPrices,
      materialActive,
      isPlanFrozen,
      fiscalYear,
      isCatalogCleared,
      logs
    };
  } catch (err) {
    console.error('[MySQL] Error in loadRelationalState:', err);
    return null;
  }
}

async function saveRelationalState(state: Partial<DbSchema>) {
  if (!mysqlPool) return;
  try {
    // 1. Save workGroups if provided
    if (state.workGroups) {
      const ids = state.workGroups.map(w => w.id);
      if (ids.length > 0) {
        await mysqlPool.query('DELETE FROM work_groups WHERE id NOT IN (?)', [ids]);
      } else {
        await mysqlPool.query('DELETE FROM work_groups');
      }
      for (const w of state.workGroups) {
        await mysqlPool.query(`
          INSERT INTO work_groups (id, name, description, code)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            code = VALUES(code)
        `, [w.id, w.name, w.description || null, w.code || null]);
      }
    }

    // 2. Save departments if provided
    if (state.departments) {
      const ids = state.departments.map(d => d.id);
      if (ids.length > 0) {
        await mysqlPool.query('DELETE FROM departments WHERE id NOT IN (?)', [ids]);
      } else {
        await mysqlPool.query('DELETE FROM departments');
      }
      for (const d of state.departments) {
        await mysqlPool.query(`
          INSERT INTO departments (id, name, category, work_group_id)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            category = VALUES(category),
            work_group_id = VALUES(work_group_id)
        `, [d.id, d.name, d.category, d.workGroupId || null]);
      }
    }

    // 3. Save users if provided
    if (state.users) {
      const usernames = state.users.map(u => u.username);
      if (usernames.length > 0) {
        await mysqlPool.query('DELETE FROM users WHERE username NOT IN (?)', [usernames]);
      } else {
        await mysqlPool.query('DELETE FROM users');
      }
      for (const u of state.users) {
        await mysqlPool.query(`
          INSERT INTO users (username, password, role, roles, name, category, dept_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            password = VALUES(password),
            role = VALUES(role),
            roles = VALUES(roles),
            name = VALUES(name),
            category = VALUES(category),
            dept_id = VALUES(dept_id),
            status = VALUES(status)
        `, [
          u.username,
          u.password,
          u.role,
          u.roles ? JSON.stringify(u.roles) : null,
          u.name,
          u.category || null,
          u.deptId,
          u.status
        ]);
      }
    }

    // 4. Save requests if provided
    if (state.requests) {
      const ids = state.requests.map(r => r.id);
      if (ids.length > 0) {
        await mysqlPool.query('DELETE FROM requests WHERE id NOT IN (?)', [ids]);
      } else {
        await mysqlPool.query('DELETE FROM requests');
      }
      for (const r of state.requests) {
        await mysqlPool.query(`
          INSERT INTO requests (
            id, dept_id, item_name, unit, qty_last_year, qty_requested, status, comment, reason, unit_price, fiscal_year,
            created_at, updated_at, requester_name, requester_sub_dept, qty_original, qty_adjusted, adjusted_by_role,
            adjusted_by_name, adjusted_at, rejected_by_role, rejected_by_name, rejected_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            dept_id = VALUES(dept_id),
            item_name = VALUES(item_name),
            unit = VALUES(unit),
            qty_last_year = VALUES(qty_last_year),
            qty_requested = VALUES(qty_requested),
            status = VALUES(status),
            comment = VALUES(comment),
            reason = VALUES(reason),
            unit_price = VALUES(unit_price),
            fiscal_year = VALUES(fiscal_year),
            created_at = VALUES(created_at),
            updated_at = VALUES(updated_at),
            requester_name = VALUES(requester_name),
            requester_sub_dept = VALUES(requester_sub_dept),
            qty_original = VALUES(qty_original),
            qty_adjusted = VALUES(qty_adjusted),
            adjusted_by_role = VALUES(adjusted_by_role),
            adjusted_by_name = VALUES(adjusted_by_name),
            adjusted_at = VALUES(adjusted_at),
            rejected_by_role = VALUES(rejected_by_role),
            rejected_by_name = VALUES(rejected_by_name),
            rejected_at = VALUES(rejected_at)
        `, [
          r.id,
          r.deptId || 'office',
          r.itemName || 'รายการ',
          r.unit || 'ชิ้น',
          r.qtyLastYear !== undefined && r.qtyLastYear !== null ? Number(r.qtyLastYear) : 0,
          r.qtyRequested !== undefined && r.qtyRequested !== null ? Number(r.qtyRequested) : 0,
          r.status || 'draft',
          r.comment || '',
          r.reason || '',
          r.unitPrice !== undefined && r.unitPrice !== null && !isNaN(Number(r.unitPrice)) ? Number(r.unitPrice) : null,
          r.fiscalYear || null,
          r.createdAt || null,
          r.updatedAt || null,
          r.requesterName || null,
          r.requesterSubDept || null,
          r.qtyOriginal !== undefined && r.qtyOriginal !== null ? Number(r.qtyOriginal) : null,
          r.qtyAdjusted !== undefined && r.qtyAdjusted !== null ? Number(r.qtyAdjusted) : null,
          r.adjustedByRole || null,
          r.adjustedByName || null,
          r.adjustedAt || null,
          r.rejectedByRole || null,
          r.rejectedByName || null,
          r.rejectedAt || null
        ]);
      }
    }

    // 5. Save logs if provided
    if (state.logs) {
      const ids = state.logs.map(l => l.id);
      if (ids.length > 0) {
        await mysqlPool.query('DELETE FROM system_logs WHERE id NOT IN (?)', [ids]);
      } else {
        await mysqlPool.query('DELETE FROM system_logs');
      }
      for (const l of state.logs) {
        await mysqlPool.query(`
          INSERT INTO system_logs (id, timestamp, username, name, action_type, module, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            timestamp = VALUES(timestamp),
            username = VALUES(username),
            name = VALUES(name),
            action_type = VALUES(action_type),
            module = VALUES(module),
            description = VALUES(description)
        `, [
          l.id,
          l.timestamp,
          l.username,
          l.name,
          l.actionType,
          l.module,
          l.description
        ]);
      }
    }

    // 6. Save metadata settings
    const settingsToSave: Record<string, string> = {};

    if (state.customItems !== undefined) {
      settingsToSave['customItems'] = JSON.stringify(state.customItems);
    }
    if (state.itemPrices !== undefined) {
      settingsToSave['itemPrices'] = JSON.stringify(state.itemPrices);
    }
    if (state.materialActive !== undefined) {
      settingsToSave['materialActive'] = JSON.stringify(state.materialActive);
    }
    if (state.isPlanFrozen !== undefined) {
      settingsToSave['isPlanFrozen'] = state.isPlanFrozen ? 'true' : 'false';
    }
    if (state.isCatalogCleared !== undefined) {
      settingsToSave['isCatalogCleared'] = state.isCatalogCleared ? 'true' : 'false';
    }
    if (state.fiscalYear !== undefined) {
      settingsToSave['fiscalYear'] = state.fiscalYear;
    }

    for (const [key, val] of Object.entries(settingsToSave)) {
      await mysqlPool.query(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [key, val]);
    }

    // 7. Save JSON state to system_state table as well (for direct viewing in Navicat & backward compatibility)
    try {
      await mysqlPool.query(`
        INSERT INTO system_state (id, state_data)
        VALUES (1, ?)
        ON DUPLICATE KEY UPDATE state_data = VALUES(state_data)
      `, [JSON.stringify(state)]);
    } catch (e) {
      console.error('[MySQL] Error updating system_state table:', e);
    }
  } catch (err) {
    console.error('[MySQL] Error in saveRelationalState:', err);
  }
}

export function getDb(): DbSchema {
  return dbCache;
}

// Helper to get items in a category for sql filtering
function getItemsInCategory(category: string): string[] {
  const defaultList = CATALOG[category] || [];
  const customList = dbCache.customItems[category] || [];
  return Array.from(new Set([...defaultList, ...customList]));
}

export async function getPaginatedRequests(filters: {
  page?: number;
  limit?: number;
  deptId?: string;
  status?: string;
  search?: string;
  category?: string;
}) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const deptId = filters.deptId;
  const status = filters.status;
  const search = filters.search;
  const category = filters.category;

  if (mysqlPool) {
    try {
      let query = 'SELECT * FROM requests WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as cnt, SUM(qty_requested * COALESCE(unit_price, 0)) as total_budget FROM requests WHERE 1=1';
      const params: any[] = [];
      const countParams: any[] = [];

      if (deptId && deptId !== 'all') {
        query += ' AND dept_id = ?';
        countQuery += ' AND dept_id = ?';
        params.push(deptId);
        countParams.push(deptId);
      }

      if (status && status !== 'all') {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
        countParams.push(status);
      }

      if (search && search.trim()) {
        query += ' AND item_name LIKE ?';
        countQuery += ' AND item_name LIKE ?';
        const likeParam = `%${search.trim()}%`;
        params.push(likeParam);
        countParams.push(likeParam);
      }

      // If category filter is requested, map item category
      if (category && category !== 'all') {
        const itemsInCategory = getItemsInCategory(category);
        if (itemsInCategory.length > 0) {
          query += ' AND item_name IN (?)';
          countQuery += ' AND item_name IN (?)';
          params.push(itemsInCategory);
          countParams.push(itemsInCategory);
        } else {
          // If no items in category, return empty
          return { requests: [], total: 0, pages: 0, totalBudget: 0 };
        }
      }

      // Add ORDER BY and LIMIT / OFFSET
      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows]: any = await mysqlPool.query(query, params);
      const [countRows]: any = await mysqlPool.query(countQuery, countParams);

      const requests: RequestItem[] = rows.map((row: any) => ({
        id: row.id,
        deptId: row.dept_id,
        itemName: row.item_name,
        unit: row.unit,
        qtyLastYear: row.qty_last_year,
        qtyRequested: row.qty_requested,
        status: row.status,
        comment: row.comment || '',
        reason: row.reason || '',
        unitPrice: row.unit_price !== null ? Number(row.unit_price) : null,
        fiscalYear: row.fiscal_year || undefined,
        createdAt: row.created_at || undefined,
        updatedAt: row.updated_at || undefined,
        requesterName: row.requester_name || undefined,
        requesterSubDept: row.requester_sub_dept || undefined,
        qtyOriginal: row.qty_original !== null ? Number(row.qty_original) : undefined,
        qtyAdjusted: row.qty_adjusted !== null ? Number(row.qty_adjusted) : undefined,
        adjustedByRole: row.adjusted_by_role || undefined,
        adjustedByName: row.adjusted_by_name || undefined,
        adjustedAt: row.adjusted_at || undefined,
        rejectedByRole: row.rejected_by_role || undefined,
        rejectedByName: row.rejected_by_name || undefined,
        rejectedAt: row.rejected_at || undefined
      }));

      const total = countRows[0]?.cnt || 0;
      const totalBudget = Number(countRows[0]?.total_budget) || 0;
      const pages = Math.ceil(total / limit);

      return { requests, total, pages, totalBudget };
    } catch (err) {
      console.error('[MySQL] Error in getPaginatedRequests:', err);
    }
  }

  // Fallback to local memory / JSON database cache
  let filtered = [...dbCache.requests];

  if (deptId && deptId !== 'all') {
    filtered = filtered.filter(r => r.deptId === deptId);
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }

  if (search && search.trim()) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(r => r.itemName.toLowerCase().includes(s));
  }

  if (category && category !== 'all') {
    const itemsInCategory = new Set(getItemsInCategory(category));
    filtered = filtered.filter(r => itemsInCategory.has(r.itemName));
  }

  const total = filtered.length;
  const totalBudget = filtered.reduce((sum, r) => {
    const price = r.unitPrice !== null ? r.unitPrice : 0;
    return sum + (r.qtyRequested * price);
  }, 0);

  // Sorting: newest first
  filtered.sort((a, b) => b.id.localeCompare(a.id));

  const paginated = filtered.slice(offset, offset + limit);
  const pages = Math.ceil(total / limit);

  return {
    requests: paginated,
    total,
    pages,
    totalBudget
  };
}

export function saveDb(data: Partial<DbSchema>): DbSchema {
  // Hash user passwords before merging and saving
  if (data.users) {
    data.users = data.users.map(u => ({
      ...u,
      password: hashPasswordSync(u.password)
    }));
  }

  dbCache = { ...dbCache, ...data };
  
  // 1. Save locally to db.json
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save to db.json:', err);
  }

  // 2. Save asynchronously to MySQL if active
  if (mysqlPool) {
    saveRelationalState(data)
      .then(() => {
        console.log('[MySQL] Successfully updated relational database tables.');
      })
      .catch(err => {
        console.error('[MySQL] Failed to write relational state updates to database:', err);
      });
  }

  return dbCache;
}
