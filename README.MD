# Database Lab 2: Login & To-Do Application

## Team Information
- **Student Name**: Hana Ahmed Shehata
- **Student ID**: 2304081
- **Contribution**: Developed database schema, Express backend, session authentication, bcrypt security, parameterised SQL queries, responsive UI layout, and dark/light mode toggle.

---

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: MySQL (`mysql2/promise`)
- **Frontend**: EJS Templating, Custom CSS (CSS Variables & Responsive Flexbox Layout)
- **Authentication & Security**: `bcrypt` (salted password hashing), `express-session` (cookie-based session management), Parameterised SQL queries (SQL injection prevention)

---

## How to Run

1. **Database Setup**:
   Import and run `database/schema.sql` inside MySQL Workbench or MySQL CLI:
   ```sql
   SOURCE database/schema.sql;
**Environment Configuration**:
Copy .env.example to .env and fill in your local MySQL credentials
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=registration
SESSION_SECRET=super_secret_key


**Install Dependencies & Start Server**:
npm install
node app.js
Open http://localhost:3000 in your browser.

**Features Implemented**:
- R1 & R2: Registration & Login with complete form validation and unified error messaging (Invalid email or password, Email Already Exists).

- R3: Route protection via session checking (unauthenticated visitors are automatically redirected to /login).

- R4 – R7: Full To-Do CRUD operations (Add, Inline Title Edit, Toggle Completed Status, Delete with confirmation prompt).

- R8: Dual validation in browser (JavaScript) and server side (Express) with exact required error strings.

- R9: Secure bcrypt password hashing, strict parameterised queries (? placeholders), and session-bound user_id authorization.

- R10 & Bonus: Card-based UI design with consistent styling across all pages, dark/light theme toggle saved in localStorage, and responsiveness down to 360px mobile views.

**Deliverable Questions & Answers**:

(a)** Why do UPDATE and DELETE contain AND user_id = ? and what changes if you remove it?
Adding AND user_id = ? enforces database-level authorization. **
It guarantees that users can only modify or delete tasks associated with their active session. If AND user_id = ? is removed, any user could modify or delete another user's tasks simply by altering the todo_id parameter sent in the request payload.

(b) What happens if you insert a to-do for a user_id that does not exist, and which constraint of the lecture is that?
MySQL rejects the query with a foreign key constraint violation error (ER_NO_REFERENCED_ROW_2). This enforces the Referential Integrity Constraint.

(c) Why do you store a hash and not the password?
Storing plain-text passwords poses severe security risks if the database is leaked. Modern salted hashing algorithms like bcrypt prevent attackers from viewing passwords directly and protect against precomputed rainbow table and brute-force attacks.

(d) The name column is NOT NULL: why did you still need your own check for an empty name?
SQL considers an empty string "" or whitespace " " as a valid non-null string value. Because NOT NULL only blocks SQL NULL values, custom application-level checks are necessary to trim inputs and verify actual text was provided.