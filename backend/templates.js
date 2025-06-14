/**
 * Template definitions for fallback diagram generation
 */

const HOSPITAL_TEMPLATE = `erDiagram
    PATIENT {
        int patient_id PK
        string first_name
        string last_name
        string email
        string phone
        date date_of_birth
    }
    DOCTOR {
        int doctor_id PK
        string first_name
        string last_name
        string specialty
        string email
    }
    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_datetime
        string status
        text notes
    }
    PATIENT ||--o{ APPOINTMENT : books
    DOCTOR ||--o{ APPOINTMENT : conducts`;

const ECOMMERCE_TEMPLATE = `erDiagram
    USER {
        int user_id PK
        string username
        string email
        string password_hash
        datetime created_at
    }
    PRODUCT {
        int product_id PK
        string name
        text description
        decimal price
        int stock_quantity
    }
    ORDER {
        int order_id PK
        int user_id FK
        datetime order_date
        decimal total_amount
        string status
    }
    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : includes`;

const GENERIC_TEMPLATE = `erDiagram
    USER {
        int id PK
        string name
        string email
        datetime created_at
    }
    ITEM {
        int id PK
        string title
        text description
        int user_id FK
        datetime created_at
    }
    USER ||--o{ ITEM : owns`;

/**
 * Field definitions for different table types
 */
const TABLE_TYPE_FIELDS = {
  'review': ['int rating', 'text comment', 'datetime created_at'],
  'category': ['string description', 'string slug'],
  'payment': ['decimal amount', 'string payment_method', 'string status', 'datetime processed_at'],
  'address': ['string street', 'string city', 'string state', 'string zip_code', 'string country'],
  'inventory': ['int quantity', 'int min_threshold', 'datetime last_updated'],
  'supplier': ['string company_name', 'string contact_person', 'string email', 'string phone'],
  'pharmacy': ['string address', 'string phone', 'string license_number'],
  'prescription': ['text medication', 'string dosage', 'text instructions', 'datetime prescribed_date'],
  'department': ['string description', 'string location']
};

/**
 * Connection rules for determining relationships between entities
 */
const CONNECTION_RULES = {
  'user': ['USER', 'CUSTOMER', 'PATIENT', 'DOCTOR'],
  'patient': ['DOCTOR', 'HOSPITAL'],
  'order': ['USER', 'CUSTOMER'],
  'product': ['CATEGORY', 'SUPPLIER'],
  'appointment': ['PATIENT', 'DOCTOR'],
  'review': ['USER', 'PRODUCT'],
  'payment': ['ORDER', 'USER'],
  'prescription': ['PATIENT', 'DOCTOR']
};

/**
 * Relationship labels for different entity combinations
 */
const RELATIONSHIP_LABELS = {
  'user': { 'review': 'writes', 'order': 'places', 'payment': 'makes', 'address': 'lives_at' },
  'product': { 'review': 'receives', 'category': 'belongs_to', 'inventory': 'has_stock' },
  'order': { 'payment': 'paid_by', 'item': 'contains' },
  'patient': { 'prescription': 'receives', 'appointment': 'schedules' },
  'doctor': { 'prescription': 'prescribes', 'appointment': 'has' },
  'pharmacy': { 'prescription': 'fills' }
};

/**
 * Get template based on user input keywords
 * @param {string} input - User input to analyze
 * @returns {string} - Appropriate template
 */
function getTemplateByKeywords(input) {
  const lower = input.toLowerCase();
  
  if (lower.includes('hospital') || lower.includes('medical') || lower.includes('patient')) {
    return HOSPITAL_TEMPLATE;
  }
  
  if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('store') || lower.includes('product')) {
    return ECOMMERCE_TEMPLATE;
  }
  
  return GENERIC_TEMPLATE;
}

module.exports = {
  HOSPITAL_TEMPLATE,
  ECOMMERCE_TEMPLATE,
  GENERIC_TEMPLATE,
  TABLE_TYPE_FIELDS,
  CONNECTION_RULES,
  RELATIONSHIP_LABELS,
  getTemplateByKeywords
};