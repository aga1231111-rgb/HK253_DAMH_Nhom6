const STORAGE_KEYS = {
  rooms: 'meetingRooms',
  meetings: 'meetingSchedule',
};

const defaultRooms = [
  { id: 1, name: 'Phòng họp A', capacity: 20, equipment: 'Máy chiếu, Camera, Micro', status: 'Trống' },
  { id: 2, name: 'Phòng họp B', capacity: 12, equipment: 'Máy chiếu, Micro', status: 'Đang bận' },
  { id: 3, name: 'Phòng họp C', capacity: 30, equipment: 'Máy chiếu, Camera, Micro, Bảng', status: 'Trống' },
];

const defaultEmployees = [
  { id: 1, code: 'NV001', name: 'Nguyễn Văn An', department: 'IT' },
  { id: 2, code: 'NV002', name: 'Trần Thị Bình', department: 'Kinh doanh' },
  { id: 3, code: 'NV003', name: 'Lê Minh Cường', department: 'Nhân sự' },
];

const layoutFallbacks = {
  header: `
    <header class="header">
      <div class="brand">
        <span class="brand-mark">MM</span>
        <div>
          <p class="brand-title">Quản lý phòng họp</p>
          <p class="brand-subtitle">Meeting Management</p>
        </div>
      </div>
      <div class="header-meta">Offline local</div>
    </header>
  `,
  menu: `
    <p class="sidebar-title">Điều hướng</p>
    <nav class="menu">
      <a href="index.html" data-route="home">Trang chủ</a>
      <a href="pages/meeting-form.html" data-route="meeting-form">Tạo lịch họp</a>
      <a href="pages/meeting-history.html" data-route="meeting-history">Lịch sử phòng</a>
      <a href="pages/room-management.html" data-route="room-management">Quản lý phòng</a>
    </nav>
  `,
  footer: `
    <footer class="footer">
      <p>Meeting Management chạy nội bộ trên máy của bạn.</p>
    </footer>
  `,
};

function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.rooms)) {
    localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(defaultRooms));
  }

  if (!localStorage.getItem(STORAGE_KEYS.meetings)) {
    localStorage.setItem(STORAGE_KEYS.meetings, JSON.stringify([]));
  }
}

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

async function loadLayout() {
  initStorage();

  const placeholders = document.querySelectorAll('[data-include]');
  const files = Array.from(placeholders).map((item) => {
    const key = item.getAttribute('data-include');

    return fetch(`${getBasePath()}components/${key}.html`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Cannot load ${key}`);
        }
        return response.text();
      })
      .then((html) => {
        item.outerHTML = html;
      })
      .catch(() => {
        item.outerHTML = layoutFallbacks[key] || '';
      });
  });

  await Promise.all(files);
  configureNavigation();
  bootstrapPage();
}

function configureNavigation() {
  const page = document.body.dataset.page;
  const basePath = getBasePath();

  document.querySelectorAll('.menu a[data-route]').forEach((link) => {
    const normalizedHref = (link.getAttribute('href') || '').replace(/^(\.\/|\.\.\/)+/, '');
    link.setAttribute('href', `${basePath}${normalizedHref}`);

    if (link.dataset.route === page) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

function bootstrapPage() {
  const page = document.body.dataset.page;

  if (page === 'home') {
    initDashboard();
  } else if (page === 'meeting-form') {
    initMeetingForm();
  } else if (page === 'meeting-history') {
    initMeetingHistory();
  } else if (page === 'room-management') {
    initRoomManagement();
  }
}

function getRooms() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.rooms) || '[]');
}

function getEmployees() {
  return defaultEmployees;
}

function getMeetings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.meetings) || '[]');
}

function saveMeetings(meetings) {
  localStorage.setItem(STORAGE_KEYS.meetings, JSON.stringify(meetings));
}

function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(rooms));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showMessage(element, message, type = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `message show ${type}`.trim();
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ');
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isUpcomingMeeting(meeting) {
  const meetingDate = new Date(meeting.datetime);
  return !Number.isNaN(meetingDate.getTime()) && meetingDate >= new Date();
}

function hasUpcomingMeeting(room, meetings) {
  return meetings.some((meeting) => String(meeting.roomId) === String(room.id) && isUpcomingMeeting(meeting));
}

function getRoomStatus(room, meetings) {
  return room.status === 'Đang bận' || hasUpcomingMeeting(room, meetings) ? 'Đang bận' : 'Trống';
}

function getStatusClass(status) {
  return status === 'Trống' ? 'available' : 'busy';
}

function initDashboard() {
  const rooms = getRooms();
  const meetings = getMeetings();
  const availableRooms = rooms.filter((room) => getRoomStatus(room, meetings) === 'Trống');
  const nextMeeting = meetings
    .filter(isUpcomingMeeting)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];

  setText('totalRooms', rooms.length);
  setText('availableRooms', availableRooms.length);
  setText('totalMeetings', meetings.length);
  setText('nextMeeting', nextMeeting ? formatTime(nextMeeting.datetime) : '--');
  setText('nextMeetingRoom', nextMeeting ? `${nextMeeting.roomName} - ${formatDateTime(nextMeeting.datetime)}` : 'Chưa có lịch');
}

function renderRoomStatusList() {
  const container = document.getElementById('roomStatusList');
  if (!container) return;

  const rooms = getRooms();
  const meetings = getMeetings();

  const items = rooms.map((room) => {
    const status = getRoomStatus(room, meetings);

    return `
      <div class="status-item">
        <div class="item-heading">
          <span class="item-title">${escapeHtml(room.name)}</span>
          <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
        </div>
        <div class="meta-row">
          <span>Sức chứa: ${escapeHtml(room.capacity)} chỗ</span>
          <span>Thiết bị: ${escapeHtml(room.equipment)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = items.join('');
}

function initMeetingForm() {
  const form = document.getElementById('meetingForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const roomSelect = document.getElementById('roomId');
  const employeeSelect = document.getElementById('employeeId');
  const messageEl = document.getElementById('formMessage');

  if (!form || !roomSelect || !employeeSelect) return;

  const rooms = getRooms();
  const employees = getEmployees();

  roomSelect.innerHTML = rooms
    .map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)} - ${escapeHtml(room.capacity)} chỗ</option>`)
    .join('');

  employeeSelect.innerHTML = employees
    .map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)} (${escapeHtml(employee.code)})</option>`)
    .join('');

  renderRoomStatusList();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const roomId = roomSelect.value;
    const employeeId = employeeSelect.value;
    const datetime = document.getElementById('meetingDate').value;
    const title = document.getElementById('meetingTitle').value.trim();
    const note = document.getElementById('meetingNote').value.trim();

    if (!roomId || !employeeId || !datetime || !title) {
      showMessage(messageEl, 'Vui lòng nhập đầy đủ thông tin.', 'error');
      return;
    }

    const meetings = getMeetings();
    const duplicate = meetings.some((meeting) => String(meeting.roomId) === String(roomId) && meeting.datetime === datetime);

    if (duplicate) {
      showMessage(messageEl, 'Phòng đã được đặt vào thời điểm này. Vui lòng chọn phòng khác hoặc thời gian khác.', 'error');
      return;
    }

    const room = rooms.find((item) => String(item.id) === String(roomId));
    const employee = employees.find((item) => String(item.id) === String(employeeId));

    meetings.push({
      id: Date.now(),
      roomId,
      roomName: room?.name || '',
      employeeId,
      employeeName: employee?.name || '',
      datetime,
      title,
      note,
    });

    saveMeetings(meetings);
    showMessage(messageEl, 'Lưu lịch họp thành công.', 'success');
    form.reset();
    renderRoomStatusList();
  });

  cancelBtn?.addEventListener('click', () => {
    form.reset();
    showMessage(messageEl, 'Đã hủy thao tác.');
  });
}

function initMeetingHistory() {
  const tableBody = document.getElementById('historyTableBody');
  const summary = document.getElementById('historySummary');

  if (!tableBody) return;

  const meetings = getMeetings().sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  if (!meetings.length) {
    tableBody.innerHTML = '<tr><td colspan="6">Chưa có lịch họp nào.</td></tr>';
    if (summary) summary.textContent = 'Chưa có lịch sử';
    return;
  }

  tableBody.innerHTML = meetings
    .map((meeting) => {
      const status = isUpcomingMeeting(meeting) ? 'Sắp diễn ra' : 'Đã qua';
      const statusClass = isUpcomingMeeting(meeting) ? 'busy' : 'available';

      return `
        <tr>
          <td><strong>${escapeHtml(meeting.title)}</strong></td>
          <td>${escapeHtml(meeting.roomName)}</td>
          <td>${escapeHtml(meeting.employeeName)}</td>
          <td>${escapeHtml(formatDateTime(meeting.datetime))}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td>${escapeHtml(meeting.note || '-')}</td>
        </tr>`;
    })
    .join('');

  if (summary) {
    summary.textContent = `Tổng số lịch họp: ${meetings.length}`;
  }
}

function initRoomManagement() {
  const form = document.getElementById('roomForm');
  const list = document.getElementById('roomList');
  const messageEl = document.getElementById('roomMessage');

  if (!form || !list) return;

  function renderRooms() {
    const rooms = getRooms();
    const meetings = getMeetings();

    list.innerHTML = rooms
      .map((room) => {
        const status = getRoomStatus(room, meetings);

        return `
          <div class="room-item">
            <div class="item-heading">
              <span class="item-title">${escapeHtml(room.name)}</span>
              <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
            </div>
            <div class="meta-row">
              <span>Sức chứa: ${escapeHtml(room.capacity)} chỗ</span>
              <span>Thiết bị: ${escapeHtml(room.equipment)}</span>
            </div>
            <div class="actions">
              <button type="button" class="btn danger" data-delete-room="${escapeHtml(room.id)}">Xóa</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderRooms();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('roomName').value.trim();
    const capacity = document.getElementById('roomCapacity').value;
    const equipment = document.getElementById('roomEquipment').value.trim();
    const status = document.getElementById('roomStatus').value;

    if (!name || !capacity || !equipment) {
      showMessage(messageEl, 'Vui lòng nhập đầy đủ thông tin phòng.', 'error');
      return;
    }

    const rooms = getRooms();
    rooms.push({
      id: Date.now(),
      name,
      capacity: Number(capacity),
      equipment,
      status,
    });

    saveRooms(rooms);
    form.reset();
    renderRooms();
    showMessage(messageEl, 'Đã thêm phòng họp mới.', 'success');
  });

  list.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-delete-room]');
    if (!deleteBtn) return;

    const roomId = Number(deleteBtn.getAttribute('data-delete-room'));
    const rooms = getRooms().filter((room) => room.id !== roomId);
    saveRooms(rooms);
    renderRooms();
    showMessage(messageEl, 'Đã xóa phòng.', 'success');
  });
}

document.addEventListener('DOMContentLoaded', loadLayout);
