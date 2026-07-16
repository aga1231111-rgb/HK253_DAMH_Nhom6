CREATE TABLE IF NOT EXISTS lichbieu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maphong TEXT NOT NULL,
  manv TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phong (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenphong TEXT NOT NULL,
  succhua INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nhanvien (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manv TEXT NOT NULL,
  tennv TEXT NOT NULL,
  phongban TEXT NOT NULL
);

INSERT INTO phong (tenphong, succhua) VALUES
('Phòng họp A', 20),
('Phòng họp B', 12),
('Phòng họp C', 30);

INSERT INTO nhanvien (manv, tennv, phongban) VALUES
('NV001', 'Nguyễn Văn An', 'IT'),
('NV002', 'Trần Thị Bình', 'Kinh doanh'),
('NV003', 'Lê Minh Cường', 'Nhân sự');
