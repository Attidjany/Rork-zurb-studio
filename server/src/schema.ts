import { Conn, exec } from './db.js';

const TS = `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`;
const CREATED = `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`;

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    ${TS}
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'designer',
    ${TS},
    CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token CHAR(64) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    ${CREATED},
    CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    max_rental_period_years INT NOT NULL DEFAULT 20,
    ${TS},
    INDEX idx_projects_owner (owner_id),
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS sites (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    area_ha DOUBLE NOT NULL,
    ${TS},
    INDEX idx_sites_project (project_id),
    CONSTRAINT fk_sites_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id CHAR(36) PRIMARY KEY,
    site_id CHAR(36) NOT NULL,
    block_number INT NOT NULL,
    ${CREATED},
    INDEX idx_blocks_site (site_id),
    CONSTRAINT fk_blocks_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS half_blocks (
    id CHAR(36) PRIMARY KEY,
    block_id CHAR(36) NOT NULL,
    position VARCHAR(10) NOT NULL,
    type VARCHAR(20) NULL,
    villa_layout VARCHAR(20) NULL,
    apartment_layout VARCHAR(10) NULL,
    villa_type_selections JSON NULL,
    ${CREATED},
    UNIQUE KEY uq_half_block (block_id, position),
    CONSTRAINT fk_half_blocks_block FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS units (
    id CHAR(36) PRIMARY KEY,
    half_block_id CHAR(36) NOT NULL,
    unit_number INT NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    size_m2 DOUBLE NULL,
    building_type VARCHAR(20) NULL,
    equipment_name VARCHAR(255) NULL,
    utility_name VARCHAR(255) NULL,
    land_area_m2 DOUBLE NULL,
    ${CREATED},
    INDEX idx_units_half_block (half_block_id),
    CONSTRAINT fk_units_half_block FOREIGN KEY (half_block_id) REFERENCES half_blocks(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS scenarios (
    id CHAR(36) PRIMARY KEY,
    site_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    rental_period_years INT NOT NULL DEFAULT 20,
    is_auto_scenario TINYINT(1) NOT NULL DEFAULT 0,
    created_by CHAR(36) NOT NULL,
    ${TS},
    INDEX idx_scenarios_site (site_id),
    CONSTRAINT fk_scenarios_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    CONSTRAINT fk_scenarios_creator FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
  )`,
  // ---- project parameter tables
  `CREATE TABLE IF NOT EXISTS project_construction_costs (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gold_grams_per_m2 DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_pcc (project_id, code),
    CONSTRAINT fk_pcc_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_housing_types (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    default_area_m2 DOUBLE NOT NULL,
    default_cost_type VARCHAR(50) NOT NULL,
    default_rent_monthly DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_pht (project_id, code),
    CONSTRAINT fk_pht_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_equipment_utility_types (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    land_area_m2 DOUBLE NOT NULL DEFAULT 1800,
    building_occupation_pct DOUBLE NOT NULL DEFAULT 0.3,
    cost_type VARCHAR(50) NOT NULL DEFAULT 'ZMER',
    ${TS},
    UNIQUE KEY uq_peut (project_id, code),
    CONSTRAINT fk_peut_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  // ---- scenario parameter tables
  `CREATE TABLE IF NOT EXISTS scenario_construction_costs (
    id CHAR(36) PRIMARY KEY,
    scenario_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gold_grams_per_m2 DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_scc (scenario_id, code),
    CONSTRAINT fk_scc_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS scenario_housing_types (
    id CHAR(36) PRIMARY KEY,
    scenario_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    default_area_m2 DOUBLE NOT NULL,
    default_cost_type VARCHAR(50) NOT NULL,
    default_rent_monthly DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_sht (scenario_id, code),
    CONSTRAINT fk_sht_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS scenario_equipment_utility_types (
    id CHAR(36) PRIMARY KEY,
    scenario_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    land_area_m2 DOUBLE NOT NULL,
    building_occupation_pct DOUBLE NOT NULL,
    cost_type VARCHAR(50) NOT NULL,
    ${TS},
    UNIQUE KEY uq_seut (scenario_id, code),
    CONSTRAINT fk_seut_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  )`,
  // ---- account settings
  `CREATE TABLE IF NOT EXISTS account_settings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    gold_price_per_oz DOUBLE NULL,
    ${TS},
    CONSTRAINT fk_as_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account_construction_costs (
    id CHAR(36) PRIMARY KEY,
    account_settings_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gold_grams_per_m2 DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_acc (account_settings_id, code),
    CONSTRAINT fk_acc_settings FOREIGN KEY (account_settings_id) REFERENCES account_settings(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account_housing_types (
    id CHAR(36) PRIMARY KEY,
    account_settings_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    default_area_m2 DOUBLE NOT NULL,
    default_cost_type VARCHAR(50) NOT NULL,
    default_rent_monthly DOUBLE NOT NULL,
    ${TS},
    UNIQUE KEY uq_aht (account_settings_id, code),
    CONSTRAINT fk_aht_settings FOREIGN KEY (account_settings_id) REFERENCES account_settings(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account_equipment_utility_types (
    id CHAR(36) PRIMARY KEY,
    account_settings_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    land_area_m2 DOUBLE NOT NULL DEFAULT 1800,
    building_occupation_pct DOUBLE NOT NULL DEFAULT 0.3,
    cost_type VARCHAR(50) NOT NULL DEFAULT 'ZMER',
    ${TS},
    UNIQUE KEY uq_aeut (account_settings_id, code),
    CONSTRAINT fk_aeut_settings FOREIGN KEY (account_settings_id) REFERENCES account_settings(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account_occupancy_rates (
    id CHAR(36) PRIMARY KEY,
    account_settings_id CHAR(36) NOT NULL,
    min_area_m2 DOUBLE NOT NULL,
    max_area_m2 DOUBLE NULL,
    people_per_unit DOUBLE NOT NULL,
    category VARCHAR(20) NOT NULL,
    ${TS},
    INDEX idx_aor_settings (account_settings_id),
    CONSTRAINT fk_aor_settings FOREIGN KEY (account_settings_id) REFERENCES account_settings(id) ON DELETE CASCADE
  )`,
];

export async function ensureSchema(conn: Conn) {
  for (const s of STATEMENTS) await exec(conn, s);
  console.log('[db] schema ensured');
}
