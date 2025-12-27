# Implemented features
### 1. Customer Features

The customer interface provides a personalized shopping experience, allowing users to manage their lifecycle from discovery to delivery.

- Profile Management: Enables customers to view and update personal data including name, email, phone number, and shipping address.

- Advanced Book Search: Features a multi-layered search tool to find books by:

    - ISBN: Precise lookup for a specific title.

    - Category: Thematic filtering (Science, Art, Religion, History, Geography).

- Shopping Cart System: A dynamic interface where users can add multiple books, adjust quantities, and view a real-time total price calculation.

- Checkout & Payment: A secure process that finalizes orders, calculates the grand total, and initiates stock updates.

- Order History Tracking: Provides a transparent view of all past purchases, including order numbers, dates, and total costs.

### 2. Administrative Features

The administrative dashboard offers comprehensive control over the store’s inventory and financial performance.

- Inventory Control:

    - Add New Books: Seamlessly register new titles with metadata (Authors, Publisher, ISBN, Category).

    - Modify Records: Edit existing book prices, titles, and inventory thresholds to match market demand.

- Supply Chain Management:

    - Admin Orders View: A log to track all restock orders triggered by low inventory.

    - Confirmation of Receipt: Admins can manually confirm shipments from publishers, which automatically updates the system's stock levels.

- System Reports & Analytics:

    - Monthly Sales: Total revenue generated during the previous month.

    - Daily Sales Performance: Revenue tracking for any specific user-selected date.

    - Customer Insights: Highlighting the Top 5 customers based on total spending.

    - Popularity Trends: Identifying the Top 10 selling books over the last three months.

    - Replenishment Analytics: Data on how many times specific titles have been restocked.

### 3. Automated System Logic (Triggers)

The backend utilizes database triggers to ensure the system remains self-sufficient and data-accurate without constant manual oversight.

- Automatic Restocking (AutoRestock): When a book's stock quantity falls below its predefined threshold after a sale, the system automatically creates a "Pending" order in the admin dashboard for replenishment.

- Negative Stock Protection (PreventNegativeStock): A critical safety constraint that blocks any transaction—whether a sale or a manual update—that would result in a negative stock count.

- Integrity Enforcement: Use of ON UPDATE CASCADE and ON DELETE CASCADE to maintain perfect synchronization between publishers, authors, and book records.

# ER Diagram
![ER_Diagram](README_images/ER_diagram.png)

# Relational Schema
![Relational_Schema](README_images/Relational_Schema.png)

# Description of the logic of each user interface screen
## Login Page
![Login_Page](README_images/login_page.png)

## Customer Pages
### Profile Page
![Profile_Page](README_images/Profile_Page.png)
### Browse Books
![Browse_Books](README_images/Browse_Books.png)
### Shopping Cart
![Shopping_Cart](README_images/Shopping_Cart.png)
### Order History
![Order_History](README_images/Order_History.png)

## Admin Pages
### Admin Browse Books
![Admin_Browse_Books](README_images/Admin_Browse_Books.png)
### Admin Add Books
![Admin_Add_Books](README_images/Admin_Add_Books.png)
### Admin Edit Books
![Admin_Edit_Books](README_images/Admin_Edit_Books.png)
### Admin Orders Page
![Admin_Orders_Page](README_images/Admin_Orders_Page.png)
### Admin Confirm Orders
![Admin_Confirm_Orders](README_images/Admin_Confirm_Orders.png)
### Admin System Reports
![Admin_System_Reports](README_images/Admin_System_Reports.png)
