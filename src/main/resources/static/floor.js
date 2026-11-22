const form = document.querySelector('#interval-form');
const fields = document.querySelector('#interval-fields');
const date = document.querySelector('#date');
const start = document.querySelector('#start');
const end = document.querySelector('#end');
const roomButtons = Array.from(document.querySelectorAll('[data-room]'));
const roomTitle = document.querySelector('#room-title');
const roomDetails = document.querySelector('#room-details');
const book = document.querySelector('#book');
const availabilityStatus = document.querySelector('#availability-status');
const bookingStatus = document.querySelector('#booking-status');

const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
date.value = localDate.toISOString().slice(0, 10);

let rooms = new Map();
let selectedName = null;
let checkedInterval = null;
let availabilityRequest = 0;
let bookingInProgress = false;

function renderRooms() {
    for (const button of roomButtons) {
        const room = rooms.get(button.dataset.room);
        button.disabled = !room || bookingInProgress;
        button.dataset.state = room ? (room.available ? 'free' : 'busy') : 'unknown';
        button.setAttribute('aria-pressed', Boolean(room && button.dataset.room === selectedName));
        button.querySelector('.room-status').textContent = room
            ? (room.available ? 'Свободна' : 'Занята')
            : 'Нет данных';
    }

    const selected = rooms.get(selectedName);
    roomTitle.textContent = selected?.name ?? 'Выбери комнату';
    roomDetails.textContent = selected
        ? (selected.available ? 'Свободна на выбранное время.' : 'Занята на выбранное время.')
        : 'Нажми на переговорную на плане.';
    book.disabled = !selected?.available || !checkedInterval || bookingInProgress;
}

async function checkAvailability() {
    const request = ++availabilityRequest;
    const interval = {
        startTime: date.value + 'T' + start.value,
        endTime: date.value + 'T' + end.value,
    };

    checkedInterval = null;
    rooms.clear();
    renderRooms();
    if (interval.endTime <= interval.startTime) {
        availabilityStatus.textContent = 'Время окончания должно быть позже начала.';
        return;
    }

    availabilityStatus.textContent = 'Проверяем доступность…';
    try {
        const response = await fetch('rooms/availability?' + new URLSearchParams(interval), {
            cache: 'no-store',
        });
        if (!response.ok) {
            throw new Error('Availability request failed');
        }

        const results = await response.json();
        if (request !== availabilityRequest) return;

        for (const button of roomButtons) {
            const matches = results.filter(room => room.name === button.dataset.room);
            if (matches.length === 1) rooms.set(button.dataset.room, matches[0]);
        }

        checkedInterval = interval;
        availabilityStatus.textContent = rooms.size === roomButtons.length
            ? ''
            : 'Для некоторых комнат на плане нет данных. Для пробного запуска используй профиль demo.';
        renderRooms();
    } catch {
        if (request !== availabilityRequest) return;
        availabilityStatus.textContent = 'Не удалось проверить доступность. Попробуй ещё раз.';
    }
}

form.addEventListener('input', () => {
    availabilityRequest++;
    checkedInterval = null;
    rooms.clear();
    bookingStatus.textContent = '';
    availabilityStatus.textContent = 'Проверь доступность на новое время.';
    renderRooms();
});

form.addEventListener('submit', event => {
    event.preventDefault();
    if (bookingInProgress) return;
    bookingStatus.textContent = '';
    checkAvailability();
});

for (const button of roomButtons) {
    button.addEventListener('click', () => {
        selectedName = button.dataset.room;
        bookingStatus.textContent = '';
        renderRooms();
    });
}

book.addEventListener('click', async () => {
    const room = rooms.get(selectedName);
    if (bookingInProgress || !room?.available || !checkedInterval) return;

    bookingInProgress = true;
    fields.disabled = true;
    bookingStatus.textContent = 'Создаём бронь…';
    renderRooms();
    try {
        const response = await fetch('bookings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({roomId: room.roomId, ...checkedInterval}),
        });

        if (response.ok) {
            bookingStatus.textContent = 'Готово, комната забронирована.';
        } else if (response.status === 409) {
            bookingStatus.textContent = 'Комнату уже заняли. Выбери другую комнату или время.';
        } else {
            bookingStatus.textContent = 'Сервер отклонил запрос на бронирование.';
        }
    } catch {
        bookingStatus.textContent = 'Ответ на бронирование не получен. Проверяем доступность.';
    } finally {
        await checkAvailability();
        fields.disabled = false;
        bookingInProgress = false;
        renderRooms();
    }
});

const week = document.querySelector('#week');
const weekday = new Intl.DateTimeFormat('ru', {weekday: 'short'});
for (let offset = 0; offset < 7; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const value = new Date(day.getTime() - day.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.date = value;
    button.setAttribute('aria-label', day.toLocaleDateString('ru', {dateStyle: 'full'}));
    button.setAttribute('aria-pressed', value === date.value);
    button.append(weekday.format(day));
    const number = document.createElement('strong');
    number.textContent = day.getDate();
    button.append(number);
    button.addEventListener('click', () => {
        date.value = value;
        date.dispatchEvent(new Event('input', {bubbles: true}));
        form.requestSubmit();
    });
    week.append(button);
}

date.addEventListener('input', () => {
    for (const button of week.children) {
        button.setAttribute('aria-pressed', button.dataset.date === date.value);
    }
});

checkAvailability();
