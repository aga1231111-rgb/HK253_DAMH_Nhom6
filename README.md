# Meeting Management

Ứng dụng quản lý phòng họp chạy offline trên máy cá nhân, không dùng CDN hay kết nối internet.

## Chạy offline

1. Mở thư mục dự án.
2. Double-click `run-offline.bat`.
3. Chờ cửa sổ terminal hiện dòng `Meeting Management is running offline`.
4. Trình duyệt sẽ tự mở. Nếu không tự mở, copy đúng URL được in trong terminal, ví dụ `http://127.0.0.1:4173/`.
5. Giữ cửa sổ terminal đang mở trong lúc dùng app. Nhấn `Ctrl+C` hoặc đóng cửa sổ đó để dừng ứng dụng.

Launcher sẽ ưu tiên dùng Python 3 để chạy server nội bộ. Nếu máy chưa có Python, app sẽ tự mở trực tiếp `index.html`. -> Chạy trực tiếp trên terminal 

Dữ liệu phòng họp và lịch họp được lưu trong `localStorage` của trình duyệt trên chính máy đang chạy.
