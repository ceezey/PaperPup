# PaperPub

PaperPub is a centralized hub for student resources, providing an easy way to organize and access educational materials.

## Tech Stack

### Frontend
- **React 19** - JavaScript library for building user interfaces
- **TypeScript** - Typed superset of JavaScript
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Hot Toast** - Toast notifications for React

### Backend
- **PHP** - Server-side scripting language
- **MySQL** - Relational database management system
- **PDO** - PHP Data Objects for database access

## Prerequisites

- **Node.js** (version 16 or higher)
- **XAMPP** (for PHP and MySQL server)

## How to Run the Website

1. **Clone or Download the Project:**
   - Place the project folder in your XAMPP `htdocs` directory (e.g., `C:\xampp\htdocs\paperpup`).

2. **Set Up the Database:**
   - Start XAMPP and ensure Apache and MySQL services are running.
   - Open phpMyAdmin (usually at `http://localhost/phpmyadmin`).
   - Create a new database named `paperpup_db`.
   - Import the database schema from `schema.sql` into the `paperpup_db` database.

3. **Install Frontend Dependencies:**
   - Open a terminal in the project root directory.
   - Run the following command to install Node.js dependencies:
     ```
     npm install
     ```

4. **Run the Development Server:**
   - Start the frontend development server:
     ```
     npm run dev
     ```
   - The app will be available at `http://localhost:5173` (or the port specified by Vite).

5. **Access the Website:**
   - Open your web browser and navigate to `http://localhost:5173` to view the PaperPub application.
   - The backend API endpoints (e.g., `Api.php`) will be accessible via the XAMPP server at `http://localhost/paperpup/Api.php`.

## Additional Notes

- Ensure the database connection settings in `db.php` match your XAMPP MySQL configuration (default: host=localhost, port=3307, username=root, password="").
- If you encounter any issues with the database connection, verify that MySQL is running and the database exists.
- For production deployment, build the frontend with `npm run build` and serve the `dist` folder alongside the PHP backend.
