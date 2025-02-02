document.addEventListener('DOMContentLoaded', () => {
    const authButton = document.getElementById('auth-button');
    const logoutButton = document.getElementById('logoutButton');
    const eventsContainer = document.querySelector('.events-container');
    const currentEventContainer = document.getElementById('current-event-container');
    const nextEventContainer = document.getElementById('next-event-container');

    // Функция для форматирования времени
    function formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // Функция для обрезки длинных названий
    function truncateTitle(title, maxLength = 40) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    // Функция для обновления интерфейса с событиями
    function updateEventsDisplay(events) {
        if (!eventsContainer || !currentEventContainer || !nextEventContainer) {
            console.error('Контейнеры событий не найдены');
            return;
        }

        // Проверяем, что events является массивом
        if (!Array.isArray(events)) {
            console.error('Ожидался массив событий, получено:', events);
            currentEventContainer.innerHTML = '<div class="no-events">Ошибка: данные событий некорректны</div>';
            nextEventContainer.innerHTML = '';
            return;
        }

        if (events.length === 0) {
            eventsContainer.style.display = 'block';
            currentEventContainer.innerHTML = '<div class="no-events">Нет событий на сегодня</div>';
            nextEventContainer.innerHTML = '';
            return;
        }

        const now = new Date();
        const currentEvent = events.find(event => {
            const startTime = new Date(event.start.dateTime || event.start.date);
            const endTime = new Date(event.end.dateTime || event.end.date);
            return now >= startTime && now <= endTime;
        });

        const nextEvent = events.find(event => {
            const startTime = new Date(event.start.dateTime || event.start.date);
            return startTime > now;
        });

        if (currentEvent) {
            const endTime = new Date(currentEvent.end.dateTime || currentEvent.end.date);
            const timeLeft = Math.floor((endTime - now) / (1000 * 60)); // Осталось минут

            currentEventContainer.innerHTML = `
                <div class="current-event-item">
                    <div class="current-event-status">СЕЙЧАС</div>
                    <div class="current-event-title">${truncateTitle(currentEvent.summary)}</div>
                    <div class="current-event-time-left">Осталось: ${timeLeft} мин.</div>
                </div>`;

            if (nextEvent) {
                nextEventContainer.innerHTML = `
                    <div class="next-event-compact">
                        Следующее: ${truncateTitle(nextEvent.summary)}, ${formatTime(nextEvent.start.dateTime || nextEvent.start.date)}
                    </div>`;
            } else {
                nextEventContainer.innerHTML = '';
            }
        } else if (nextEvent) {
            const startTime = new Date(nextEvent.start.dateTime || nextEvent.start.date);
            const timeUntil = Math.floor((startTime - now) / (1000 * 60)); // До начала минут

            currentEventContainer.innerHTML = `
                <div class="current-event-item">
                    <div class="current-event-status">ДО НАЧАЛА</div>
                    <div class="current-event-title">${truncateTitle(nextEvent.summary)}</div>
                    <div class="current-event-time-left">Через: ${timeUntil} мин.</div>
                </div>`;
            nextEventContainer.innerHTML = '';
        } else {
            currentEventContainer.innerHTML = '<div class="no-events">Нет предстоящих событий</div>';
            nextEventContainer.innerHTML = '';
        }

        eventsContainer.style.display = 'block'; // Показываем контейнер событий
    }

    // Функция для загрузки событий
    async function loadEvents(token) {
        try {
            const events = await window.electronAPI.getEvents(token);
            console.log('События загружены:', events);
            updateEventsDisplay(events);
        } catch (error) {
            console.error('Ошибка при загрузке событий:', error);
            currentEventContainer.innerHTML = '<div class="no-events">Ошибка при загрузке событий</div>';
        }
    }

    // Функция для проверки авторизации
    async function checkAuth() {
        try {
            const token = await window.electronAPI.getToken();
            if (token) {
                authButton.style.display = 'none';
                logoutButton.style.display = 'block';
                await loadEvents(token); // Загружаем события после успешной авторизации
            } else {
                authButton.style.display = 'block';
                logoutButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка при проверке авторизации:', error);
        }
    }

    // Обработчик для кнопки авторизации
    authButton.addEventListener('click', async () => {
        try {
            const tokens = await window.electronAPI.googleAuth();
            authButton.style.display = 'none';
            logoutButton.style.display = 'block';
            await loadEvents(tokens); // Загружаем события после авторизации
        } catch (error) {
            console.error('Ошибка при авторизации:', error);
        }
    });

    // Обработчик для кнопки выхода
    logoutButton.addEventListener('click', async () => {
        try {
            await window.electronAPI.logout();
            authButton.style.display = 'block';
            logoutButton.style.display = 'none';
            eventsContainer.style.display = 'none'; // Скрываем контейнер событий
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    });

    // Обработчик для обновления событий
   // Обработчик для обновления событий
window.electronAPI.onEventsUpdated((event, events) => {
    console.log('События обновлены:', events);
    updateEventsDisplay(events); // Передаем только массив событий
});

    // Обработчик фокуса окна
    window.addEventListener('focus', async () => {
        try {
            const token = await window.electronAPI.getToken();
            if (token) {
                console.log('Обновление событий при фокусе окна');
                await loadEvents(token);
            }
        } catch (error) {
            console.error('Ошибка при обновлении событий:', error);
        }
    });

    // Проверяем авторизацию при загрузке страницы
    checkAuth();
});