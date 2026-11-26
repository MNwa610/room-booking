const accountDialog = document.querySelector('#account-dialog');
const accountForm = document.querySelector('#account-form');
const loginButton = document.querySelector('#login-open');
const profileButton = document.querySelector('#profile-open');
const accountMessage = document.querySelector('#account-message');
const profileDialog = document.querySelector('#profile-dialog');
const profileForm = document.querySelector('#profile-form');
const profileMessage = document.querySelector('#profile-message');
const avatarFile = document.querySelector('#avatar-file');
let avatarDraft = '';
let photoVersion = 0;
const departments = document.querySelector('#departments');
const authModes = document.querySelector('#auth-modes');
let employee = null;
let mode = 'login';

const departmentNames = ['Разработка', 'Дизайн', 'Маркетинг', 'Продажи', 'Персонал', 'Финансы', 'Администрация', 'Другой'];

function displayDepartment(field) {
    const picker = field.parentElement.querySelector('details');
    picker.open = false;
    const summary = picker.querySelector('summary');
    const label = field.value || 'Выбери отдел';
    summary.querySelector('span').textContent = label;
    summary.setAttribute('aria-label', 'Отдел: ' + label);
    const menu = picker.querySelector('.department-menu');
    const values = new Set(departmentNames);
    if (field.value) values.add(field.value);
    menu.replaceChildren();
    for (const name of values) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.setAttribute('aria-pressed', String(name === field.value));
        button.onclick = () => {
            field.value = name;
            displayDepartment(field);
            field.dispatchEvent(new Event('input', {bubbles: true}));
            summary.focus();
        };
        menu.append(button);
    }
}

for (const picker of document.querySelectorAll('.department-picker')) {
    picker.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !picker.open) return;
        event.preventDefault();
        event.stopPropagation();
        picker.open = false;
        picker.querySelector('summary').focus();
    });
    picker.closest('dialog').addEventListener('click', event => {
        if (!picker.contains(event.target)) picker.open = false;
    });
}

async function accountRequest(url, method = 'GET', data) {
    const response = await fetch(url, {
        method, cache: 'no-store',
        headers: data ? {'Content-Type': 'application/json'} : {},
        body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) {
        const messages = {400: 'Проверь введённые данные.', 401: 'Проверь почту и пароль или войди снова.',
            409: url.startsWith('bookings/') ? 'Комната занята на выбранное время.' : 'Эта почта уже зарегистрирована.',
            404: 'Запись уже недоступна.'};
        throw new Error(messages[response.status] || 'Не удалось выполнить запрос.');
    }
    const body = await response.text();
    return body ? JSON.parse(body) : null;
}

function setEmployee(profile) {
    employee = profile;
    loginButton.hidden = Boolean(profile);
    profileButton.hidden = !profile;
    const image = document.querySelector('#header-avatar');
    if (profile?.avatar) image.src = profile.avatar;
    else image.removeAttribute('src');
    image.hidden = !profile?.avatar;
    window.dispatchEvent(new Event('account-change'));
}

function meetingItem(meeting) {
    const item = document.createElement('div');
    item.className = 'meeting';
    const title = document.createElement('strong');
    title.textContent = meeting.purpose || 'Встреча';
    const meta = document.createElement('small');
    const format = value => new Date(value).toLocaleString('ru', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
    meta.textContent = [meeting.room, meeting.department, format(meeting.startTime) + ' — ' + format(meeting.endTime)].filter(Boolean).join(' · ');
    item.append(title, meta);
    if (meeting.cancelledAt) {
        const status = document.createElement('span');
        status.className = 'meeting-status';
        status.textContent = 'Отменена · ' + format(meeting.cancelledAt);
        item.append(status);
    } else if (meeting.mine && new Date(meeting.endTime).getTime() > Date.now()) {
        const actions = document.createElement('div');
        actions.className = 'meeting-actions';
        for (const [action, label] of [['edit', 'Изменить'], ['cancel', 'Отменить бронь']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'account-link';
            button.textContent = label;
            button.onclick = () => openMeeting(meeting, action);
            actions.append(button);
        }
        item.append(actions);
    }
    return item;
}

const meetingDialog = document.querySelector('#meeting-dialog');
const meetingForm = document.querySelector('#meeting-form');
const meetingFields = document.querySelector('#meeting-fields');
const meetingMessage = document.querySelector('#meeting-message');
let activeMeeting;
function openMeeting(meeting, action) {
    activeMeeting = meeting;
    const cancel = action === 'cancel';
    document.querySelector('#meeting-heading').textContent = cancel ? 'Отменить бронь?' : 'Изменить встречу';
    document.querySelector('#meeting-summary').textContent = meeting.room + ' · ' + meeting.purpose;
    meetingFields.hidden = meetingFields.disabled = cancel;
    for (const field of meetingFields.querySelectorAll('input')) field.value = meeting[field.name];
    meetingForm.querySelector('button').textContent = cancel ? 'Подтвердить отмену' : 'Сохранить изменения';
    meetingMessage.textContent = '';
    meetingDialog.showModal();
}
meetingForm.onsubmit = async event => {
    event.preventDefault();
    const submit = meetingForm.querySelector('button');
    const data = Object.fromEntries(new FormData(meetingForm));
    const cancel = meetingFields.disabled;
    if (!cancel && (!data.purpose.trim() || Date.parse(data.endTime) <= Date.parse(data.startTime))) {
        meetingMessage.textContent = 'Укажи цель встречи и окончание позже начала.';
        return;
    }
    submit.disabled = true;
    try {
        await accountRequest('bookings/' + activeMeeting.id, cancel ? 'DELETE' : 'PUT',
            cancel ? undefined : {...data, roomId:activeMeeting.roomId});
        meetingDialog.close();
        await Promise.all([checkAvailability(), profileDialog.open ? loadMeetings() : Promise.resolve()]);
        const status = profileDialog.open ? profileMessage : document.querySelector('#booking-status');
        status.textContent = cancel ? 'Бронь отменена.' : 'Встреча обновлена.';
    } catch (error) {
        meetingMessage.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
};

async function loadMeetings() {
    const owner = employee;
    const upcoming = document.querySelector('#upcoming');
    const history = document.querySelector('#history');
    upcoming.textContent = history.textContent = 'Загрузка…';
    try {
        const meetings = await accountRequest('bookings/mine');
        if (employee !== owner) return;
        const now = Date.now();
        const ended = m => Boolean(m.cancelledAt) || new Date(m.endTime).getTime() <= now;
        for (const [list, items] of [[upcoming, meetings.filter(m => !ended(m))], [history, meetings.filter(ended).sort((a, b) => Date.parse(b.cancelledAt || b.endTime) - Date.parse(a.cancelledAt || a.endTime))]]) {
            list.replaceChildren();
            if (!items.length) list.textContent = 'Встреч пока нет.';
            for (const m of items) {
                const li = document.createElement('li');
                li.append(meetingItem(m));
                list.append(li);
            }
        }
    } catch (error) {
        upcoming.textContent = history.textContent = error.message;
    }
}

function showMode(nextMode) {
    mode = nextMode;
    const register = mode === 'register';
    const controls = accountForm.elements;
    if (!accountDialog.open) accountForm.reset();
    accountMessage.textContent = '';
    for (const error of accountForm.querySelectorAll('.field-error')) error.textContent = '';
    for (const field of accountForm.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
    departments.disabled = controls.name.disabled = !register;
    displayDepartment(departments);
    document.querySelector('#employee-fields').inert = !register;
    authModes.dataset.mode = mode;
    controls.password.minLength = register ? 8 : 1;
    controls.password.autocomplete = register ? 'new-password' : 'current-password';
    document.querySelector('#account-submit').textContent = register ? 'Создать аккаунт' : 'Войти';
    for (const button of authModes.children) {
        button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
}

function openAccount(guestMode = 'login') {
    if (employee) return openProfile();
    showMode(guestMode);
    if (!accountDialog.open) accountDialog.showModal();
}

loginButton.onclick = () => openAccount();
profileButton.onclick = openProfile;
for (const dialog of [accountDialog, profileDialog, meetingDialog]) {
    let startedOutside = false;
    dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog; });
    dialog.addEventListener('click', event => {
        if (startedOutside && event.target === dialog) dialog.close();
        startedOutside = false;
    });
    dialog.querySelector('.close-dialog').onclick = () => dialog.close();
}
for (const button of authModes.children) {
    button.onclick = () => {
        if (button.dataset.mode !== mode && !accountForm.elements['account-submit'].disabled) showMode(button.dataset.mode);
    };
}
function fieldError(field) {
    if (field.name === 'department') return accountForm.elements.department.value ? '' : 'Выбери отдел.';
    if (!field.value.trim()) {
        return {email: 'Введи рабочую почту.', password: 'Введи пароль.', name: 'Введи имя.'}[field.name];
    }
    if (field.name === 'email' && field.validity.typeMismatch) return 'Укажи адрес в формате имя@компания.ru.';
    if (field.name === 'password' && field.value.length < field.minLength) return 'Для регистрации нужно минимум 8 символов.';
    return '';
}

function validateField(field) {
    const message = fieldError(field);
    const target = field.name === 'department' ? field.parentElement.querySelector('summary') : field;
    target.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(field.name + '-error').textContent = message;
    return !message;
}

accountForm.addEventListener('input', ({target}) => {
    accountMessage.textContent = '';
    if (document.getElementById(target.name + '-error')?.textContent) validateField(target);
});

accountForm.onsubmit = async event => {
    event.preventDefault();
    const submit = document.querySelector('#account-submit');
    const fields = [...accountForm.querySelectorAll('input:enabled:not([readonly]):not([type="hidden"])')];
    if (!departments.disabled) fields.push(departments);
    let firstInvalid;
    for (const field of fields) {
        if (!validateField(field)) firstInvalid ??= field;
    }
    if (firstInvalid) {
        if (firstInvalid === departments) departments.parentElement.querySelector('summary').focus();
        else firstInvalid.focus();
        return;
    }
    submit.disabled = true;
    const data = Object.fromEntries(new FormData(accountForm));
    try {
        setEmployee(await accountRequest('account/' + mode, 'POST', data));
        accountForm.elements.password.value = '';
        accountDialog.close();
        profileButton.focus();
    } catch (error) {
        accountMessage.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
};
function renderAvatar() {
    const preview = document.querySelector('#avatar-preview');
    preview.textContent = employee.name.trim().slice(0, 1).toUpperCase();
    if (avatarDraft) {
        const image = new Image();
        image.alt = '';
        image.src = avatarDraft;
        preview.replaceChildren(image);
    }
    document.querySelector('#remove-avatar').hidden = !avatarDraft;
}

function openProfile() {
    const fields = profileForm.elements;
    fields.name.value = employee.name;
    fields.email.value = employee.email;
    fields.department.value = employee.department;
    displayDepartment(fields.department);
    avatarDraft = employee.avatar || '';
    renderAvatar();
    profileMessage.textContent = '';
    profileDialog.showModal();
    loadMeetings();
}

document.querySelector('#choose-avatar').onclick = () => avatarFile.click();
document.querySelector('#remove-avatar').onclick = () => {
    avatarDraft = '';
    renderAvatar();
};
const saveProfile = profileForm.querySelector('[type="submit"]');
profileDialog.addEventListener('close', () => {
    photoVersion++;
    saveProfile.disabled = false;
});
avatarFile.onchange = async () => {
    const file = avatarFile.files[0];
    if (!file) return;
    avatarFile.value = '';
    const version = ++photoVersion;
    const url = URL.createObjectURL(file);
    saveProfile.disabled = true;
    try {
        if (file.size > 12 * 1024 * 1024) throw new Error();
        const image = new Image();
        image.src = url;
        await image.decode();
        if (version !== photoVersion) return;
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 192;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#efe7d9';
        ctx.fillRect(0, 0, 192, 192);
        ctx.drawImage(image, (image.naturalWidth-size)/2, (image.naturalHeight-size)/2, size, size, 0, 0, 192, 192);
        avatarDraft = canvas.toDataURL('image/jpeg', .8);
        renderAvatar();
        profileMessage.textContent = 'Фото готово. Сохрани изменения.';
    } catch {
        if (version === photoVersion) profileMessage.textContent = 'Выбери изображение JPEG, PNG или WebP до 12 МБ.';
    } finally {
        URL.revokeObjectURL(url);
        if (version === photoVersion) saveProfile.disabled = false;
    }
};
profileForm.onsubmit = async event => {
    event.preventDefault();
    if (saveProfile.disabled) return;
    saveProfile.disabled = true;
    try {
        const data = Object.fromEntries(new FormData(profileForm));
        setEmployee(await accountRequest('account', 'PUT', {name:data.name, department:data.department, avatar:avatarDraft}));
        profileMessage.textContent = 'Изменения сохранены.';
    } catch (error) {
        profileMessage.textContent = error.message;
    } finally {
        saveProfile.disabled = false;
    }
};
document.querySelector('#logout').onclick = async () => {
    try {
        await accountRequest('account/logout', 'POST', {});
        setEmployee(null);
        profileDialog.close();
        loginButton.focus();
        document.querySelector('#upcoming').replaceChildren();
        document.querySelector('#history').replaceChildren();
    } catch (error) { profileMessage.textContent = error.message; }
};
accountRequest('account').then(setEmployee).catch(() => {});
