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

-- Create customer/admin accounts with npm run create-user.
