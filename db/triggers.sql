USE BookstoreDB;
DELIMITER //

-- Updating Triggers
DROP TRIGGER IF EXISTS AutoRestock //
DROP TRIGGER IF EXISTS PreventNegativeStock //

-- The admin cannot update the quantity if it's going to be negative
-- Trigger before update on BOOK table
CREATE TRIGGER PreventNegativeStock
BEFORE UPDATE ON BOOK
FOR EACH ROW
BEGIN
    -- Check if the new stock level would be negative
    IF NEW.StockQuantity < 0 THEN
        SIGNAL SQLSTATE '45000' -- Stops the operation
        SET MESSAGE_TEXT = 'Error: Stock quantity cannot be negative.';
    END IF;
END //

-- When stock falls below threshold, create a restock order that can be accepted by admin
-- Trigger after update on BOOK table
CREATE TRIGGER AutoRestock
AFTER UPDATE ON BOOK
FOR EACH ROW
BEGIN
    -- If stock was >= threshold and new < threshold
    -- new < threshold is not sufficient
    IF OLD.StockQuantity >= OLD.Threshold AND NEW.StockQuantity < NEW.Threshold THEN
        INSERT INTO ADMIN_ORDER (OrderDate, Quantity, Status, ISBN)
        VALUES (NOW(), 10, 'Pending', NEW.ISBN);
    END IF;
END //

DELIMITER ;