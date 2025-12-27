USE BookstoreDB;

INSERT INTO PUBLISHER (Name) VALUES 
('Penguin Random House'),
('HarperCollins'),
('OReilly Media');

INSERT INTO BOOK (ISBN, Title, Category, PublicationYear, SellingPrice, Threshold, StockQuantity, PublisherName) VALUES 
('978-0134685991', 'Effective Java', 'Science', 2018, 45.00, 10, 5, 'OReilly Media'),
('978-0544003415', 'The Lord of the Rings', 'Art', 1954, 25.99, 10, 50, 'HarperCollins'),
('978-0743273565', 'The Great Gatsby', 'Art', 1925, 10.50, 5, 8, 'Penguin Random House'),
('978-1400079179', 'Sapiens: A Brief History', 'History', 2011, 22.00, 8, 15, 'HarperCollins'),
('978-0393609394', 'Astrophysics for People in a Hurry', 'Science', 2017, 18.99, 5, 100, 'OReilly Media');

INSERT INTO BOOK_AUTHORS (ISBN, AuthorName) VALUES 
('978-0134685991', 'Joshua Bloch'),
('978-0544003415', 'J.R.R. Tolkien'),
('978-0743273565', 'F. Scott Fitzgerald'),
('978-1400079179', 'Yuval Noah Harari'),
('978-0393609394', 'Neil deGrasse Tyson');

INSERT INTO PUBLISHER_PHONES (PublisherName, PhoneNumber) VALUES 
('Penguin Random House', '212-782-9000'),
('HarperCollins', '212-207-7000'),
('OReilly Media', '707-827-7000');

INSERT INTO PUBLISHER_ADDRESSES (PublisherName, Address) VALUES 
('Penguin Random House', '1745 Broadway, New York, NY'),
('HarperCollins', '195 Broadway, New York, NY'),
('OReilly Media', '1005 Gravenstein Hwy N, Sebastopol, CA');

INSERT INTO CUSTOMER (Username, Password, FirstName, LastName, Email, Phone, ShippingAddress) VALUES 
('maro_db', '01012001', 'Marwan', 'G.', 'maro@gmail.com', '01567890123', 'Alexandria, Egypt'),
('rofa_db', '02022002', 'Rofa', 'W.', 'rofa@gmail.com', '01123456789', 'Cairo, Egypt'),
('kassar_frontend', '04042004', 'M.', 'Kassar', 'kassar@gmail.com', '01234567890', 'Giza, Egypt'),
('helmy_frontend', '05052005', 'Y.', 'Helmy', 'helmy@gmail.com', '01000000000', 'Mansoura, Egypt');

INSERT INTO CUSTOMER_ORDER (OrderDate, TotalPrice, CustomerUsername) VALUES 
('2025-12-25 10:00:00', 67.00, 'maro_db'),
('2025-12-26 14:30:00', 10.50, 'rofa_db');

INSERT INTO ORDER_ITEMS (OrderNo, ISBN, Quantity) VALUES 
(1, '978-0134685991', 1),
(1, '978-1400079179', 1),
(2, '978-0743273565', 1);

INSERT INTO ADMIN_ORDER (Quantity, Status, ISBN) VALUES 
(50, 'Pending', '978-0134685991'),
(20, 'Received', '978-1400079179');