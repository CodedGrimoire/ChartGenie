// templates.js - Built-in diagram templates for fallback

const DIAGRAM_TEMPLATES = {
  mermaid: {
    'er': (description) => {
      if (description.toLowerCase().includes('hospital')) {
        return `erDiagram
    PATIENT {
        int patient_id PK
        string first_name
        string last_name
        date birth_date
        string phone
        string email
        string address
    }
    DOCTOR {
        int doctor_id PK
        string first_name
        string last_name
        string specialization
        string phone
        string email
    }
    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_date
        string status
        string notes
    }
    MEDICAL_RECORD {
        int record_id PK
        int patient_id FK
        int doctor_id FK
        date record_date
        string diagnosis
        string treatment
        string prescription
    }
    PATIENT ||--o{ APPOINTMENT : schedules
    DOCTOR ||--o{ APPOINTMENT : attends
    PATIENT ||--o{ MEDICAL_RECORD : has
    DOCTOR ||--o{ MEDICAL_RECORD : creates`;
      }
      
      if (description.toLowerCase().includes('restaurant') || description.toLowerCase().includes('order')) {
        return `erDiagram
    CUSTOMER {
        int customer_id PK
        string name
        string phone
        string email
    }
    ORDER {
        int order_id PK
        int customer_id FK
        datetime order_date
        string status
        decimal total_amount
    }
    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int menu_item_id FK
        int quantity
        decimal unit_price
    }
    MENU_ITEM {
        int menu_item_id PK
        string name
        string description
        decimal price
        string category
    }
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    MENU_ITEM ||--o{ ORDER_ITEM : "appears in"`;
      }
      
      if (description.toLowerCase().includes('library') || description.toLowerCase().includes('book')) {
        return `erDiagram
    MEMBER {
        int member_id PK
        string name
        string email
        string phone
        date join_date
    }
    BOOK {
        int book_id PK
        string title
        string author
        string isbn
        string genre
        boolean available
    }
    LOAN {
        int loan_id PK
        int member_id FK
        int book_id FK
        date loan_date
        date due_date
        date return_date
    }
    MEMBER ||--o{ LOAN : borrows
    BOOK ||--o{ LOAN : "is borrowed in"`;
      }
      
      // Default ER diagram
      return `erDiagram
    USER {
        int user_id PK
        string name
        string email
        datetime created_at
    }
    ORDER {
        int order_id PK
        int user_id FK
        date order_date
        string status
    }
    PRODUCT {
        int product_id PK
        string name
        decimal price
        string description
    }
    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "appears in"`;
    },
    
    'flowchart': (description) => {
      if (description.toLowerCase().includes('login') || description.toLowerCase().includes('authentication')) {
        return `flowchart TD
    A[User visits login page] --> B[Enter credentials]
    B --> C{Valid credentials?}
    C -->|Yes| D[Generate session token]
    C -->|No| E[Show error message]
    D --> F[Redirect to dashboard]
    E --> B
    F --> G[User logged in successfully]`;
      }
      
      if (description.toLowerCase().includes('order') || description.toLowerCase().includes('purchase')) {
        return `flowchart TD
    A[Browse products] --> B[Add to cart]
    B --> C[View cart]
    C --> D{Ready to checkout?}
    D -->|No| A
    D -->|Yes| E[Enter shipping info]
    E --> F[Choose payment method]
    F --> G[Review order]
    G --> H{Confirm order?}
    H -->|No| C
    H -->|Yes| I[Process payment]
    I --> J{Payment successful?}
    J -->|No| K[Show payment error]
    K --> F
    J -->|Yes| L[Send confirmation]
    L --> M[Order completed]`;
      }
      
      if (description.toLowerCase().includes('registration') || description.toLowerCase().includes('signup')) {
        return `flowchart TD
    A[User clicks Register] --> B[Fill registration form]
    B --> C[Submit form]
    C --> D{Valid data?}
    D -->|No| E[Show validation errors]
    E --> B
    D -->|Yes| F{Email already exists?}
    F -->|Yes| G[Show email exists error]
    G --> B
    F -->|No| H[Create user account]
    H --> I[Send verification email]
    I --> J[Show success message]
    J --> K[User verifies email]
    K --> L[Account activated]`;
      }
      
      // Default flowchart
      return `flowchart TD
    A[Start] --> B{Make decision}
    B -->|Option 1| C[Process A]
    B -->|Option 2| D[Process B]
    C --> E[Review results]
    D --> E
    E --> F{Satisfied?}
    F -->|No| B
    F -->|Yes| G[End]`;
    },
    
    'class': (description) => {
      if (description.toLowerCase().includes('ecommerce') || description.toLowerCase().includes('shopping')) {
        return `classDiagram
    class User {
        +int userId
        +string name
        +string email
        +string password
        +Date createdAt
        +login()
        +logout()
        +updateProfile()
    }
    class Product {
        +int productId
        +string name
        +decimal price
        +string description
        +int stockQuantity
        +updateStock()
        +getPrice()
    }
    class Order {
        +int orderId
        +int userId
        +Date orderDate
        +string status
        +decimal totalAmount
        +calculateTotal()
        +updateStatus()
    }
    class OrderItem {
        +int orderItemId
        +int orderId
        +int productId
        +int quantity
        +decimal unitPrice
        +getSubtotal()
    }
    User "1" --> "*" Order : places
    Order "1" --> "*" OrderItem : contains
    Product "1" --> "*" OrderItem : "appears in"`;
      }
      
      if (description.toLowerCase().includes('library') || description.toLowerCase().includes('book')) {
        return `classDiagram
    class Library {
        +string name
        +string address
        +addBook()
        +removeBook()
        +findBook()
    }
    class Book {
        +string isbn
        +string title
        +string author
        +int pages
        +boolean available
        +checkout()
        +return()
    }
    class Member {
        +int memberId
        +string name
        +string email
        +Date joinDate
        +borrowBook()
        +returnBook()
    }
    class Loan {
        +int loanId
        +Date borrowDate
        +Date dueDate
        +Date returnDate
        +calculateFine()
    }
    Library "1" --> "*" Book : contains
    Member "1" --> "*" Loan : has
    Book "1" --> "*" Loan : "is borrowed in"`;
      }
      
      // Default class diagram
      return `classDiagram
    class User {
        +int id
        +string name
        +string email
        +Date createdAt
        +login()
        +logout()
        +updateProfile()
    }
    class Order {
        +int orderId
        +Date orderDate
        +string status
        +decimal amount
        +calculateTotal()
        +updateStatus()
    }
    class Product {
        +int productId
        +string name
        +decimal price
        +string description
        +updatePrice()
        +getDetails()
    }
    User "1" --> "*" Order : places
    Order "*" --> "*" Product : contains`;
    },
    
    'sequence': (description) => {
      if (description.toLowerCase().includes('login') || description.toLowerCase().includes('authentication')) {
        return `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant D as Database
    
    U->>F: Enter credentials
    F->>A: Submit login request
    A->>D: Validate credentials
    D-->>A: Return user data
    A->>A: Generate JWT token
    A-->>F: Return token + user info
    F-->>U: Redirect to dashboard`;
      }
      
      if (description.toLowerCase().includes('order') || description.toLowerCase().includes('purchase')) {
        return `sequenceDiagram
    participant C as Customer
    participant W as Website
    participant P as Payment Service
    participant I as Inventory
    participant E as Email Service
    
    C->>W: Place order
    W->>I: Check inventory
    I-->>W: Confirm availability
    W->>P: Process payment
    P-->>W: Payment confirmation
    W->>I: Update inventory
    W->>E: Send confirmation email
    E-->>C: Order confirmation
    W-->>C: Order success page`;
      }
      
      // Default sequence diagram
      return `sequenceDiagram
    participant User
    participant System
    participant Database
    participant External API
    
    User->>System: Make request
    System->>Database: Query data
    Database-->>System: Return results
    System->>External API: Fetch additional data
    External API-->>System: API response
    System-->>User: Final response`;
    }
  },
  
  tikz: {
    'flowchart': (description) => `\\begin{tikzpicture}[
  node distance=2cm,
  startstop/.style={rectangle, rounded corners, minimum width=3cm, minimum height=1cm, text centered, draw=black, fill=red!30},
  process/.style={rectangle, minimum width=3cm, minimum height=1cm, text centered, draw=black, fill=orange!30},
  decision/.style={diamond, minimum width=3cm, minimum height=1cm, text centered, draw=black, fill=green!30}
]

\\node (start) [startstop] {Start};
\\node (process1) [process, below of=start] {Process Step};
\\node (decision) [decision, below of=process1, yshift=-1cm] {Decision};
\\node (process2a) [process, below left of=decision, xshift=-2cm, yshift=-1cm] {Option A};
\\node (process2b) [process, below right of=decision, xshift=2cm, yshift=-1cm] {Option B};
\\node (end) [startstop, below of=decision, yshift=-3cm] {End};

\\draw [->] (start) -- (process1);
\\draw [->] (process1) -- (decision);
\\draw [->] (decision) -- node[anchor=east] {Yes} (process2a);
\\draw [->] (decision) -- node[anchor=west] {No} (process2b);
\\draw [->] (process2a) -- (end);
\\draw [->] (process2b) -- (end);

\\end{tikzpicture}`,
    
    'er': (description) => `\\begin{tikzpicture}[
  entity/.style={rectangle, draw, thick, fill=blue!20, minimum width=2cm, minimum height=1cm},
  attribute/.style={ellipse, draw, fill=yellow!20},
  relationship/.style={diamond, draw, thick, fill=red!20, aspect=2}
]

% Entities
\\node[entity] (user) at (0,0) {User};
\\node[entity] (order) at (6,0) {Order};
\\node[entity] (product) at (6,-4) {Product};

% Attributes
\\node[attribute] (user_id) at (-2,1.5) {user\\_id};
\\node[attribute] (user_name) at (-2,-1.5) {name};
\\node[attribute] (order_id) at (8,1.5) {order\\_id};
\\node[attribute] (order_date) at (8,-1.5) {date};

% Relationships
\\node[relationship] (places) at (3,0) {places};
\\node[relationship] (contains) at (6,-2) {contains};

% Connections
\\draw (user) -- (user_id);
\\draw (user) -- (user_name);
\\draw (order) -- (order_id);
\\draw (order) -- (order_date);
\\draw (user) -- (places);
\\draw (places) -- (order);
\\draw (order) -- (contains);
\\draw (contains) -- (product);

\\end{tikzpicture}`
  },
  
  plantuml: {
    'class': (description) => `@startuml
class User {
  +int userId
  +string name
  +string email
  +login()
  +logout()
}

class Order {
  +int orderId
  +Date orderDate
  +decimal amount
  +calculateTotal()
}

class Product {
  +int productId
  +string name
  +decimal price
  +updatePrice()
}

User "1" --> "*" Order
Order "*" --> "*" Product
@enduml`,
    
    'sequence': (description) => `@startuml
participant User
participant System
participant Database

User -> System : Request
System -> Database : Query
Database --> System : Response
System --> User : Result
@enduml`,
    
    'flowchart': (description) => `@startuml
start
:Process Input;
if (Valid?) then (yes)
  :Continue Processing;
else (no)
  :Show Error;
  stop
endif
:Generate Output;
stop
@enduml`
  }
};

function detectDiagramType(input) {
  const lower = input.toLowerCase();
  if (lower.includes('er') || lower.includes('entity') || lower.includes('database') || lower.includes('table')) return 'er';
  if (lower.includes('class') || lower.includes('uml') || lower.includes('object')) return 'class';
  if (lower.includes('sequence') || lower.includes('interaction') || lower.includes('message')) return 'sequence';
  return 'flowchart';
}

function generateTemplate(userInput, outputFormat = 'mermaid') {
  const diagramType = detectDiagramType(userInput);
  const templates = DIAGRAM_TEMPLATES[outputFormat] || DIAGRAM_TEMPLATES.mermaid;
  const templateFunction = templates[diagramType] || templates['flowchart'];
  
  return templateFunction(userInput);
}

module.exports = {
  DIAGRAM_TEMPLATES,
  detectDiagramType,
  generateTemplate
};