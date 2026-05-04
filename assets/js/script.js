const STORAGE_KEY = "control_tiempos_conversaciones";
const ALARM_SOUND_PATH =
  "./assets/sounds/freesound_community-alarm-clock-short.mp3";

const chatCards = document.querySelectorAll(".chat-card");
const clearStorageButton = document.querySelector("#clearStorage");
const globalMessage = document.querySelector("#globalMessage");

const intervals = Array.from({ length: chatCards.length }, () => null);

const defaultTimers = Array.from({ length: chatCards.length }, () => ({
  person: "",
  minutes: "",
  seconds: "",
  remainingSeconds: 0,
  endTime: null,
  isRunning: false,
  isFinished: false,
  status: "Sin iniciar",
}));

let timers = loadTimers();

initializeApp();

function initializeApp() {
  timers = normalizeTimers(timers);

  chatCards.forEach((card, index) => {
    const personInput = card.querySelector(".chat-person");
    const minutesInput = card.querySelector(".minutes");
    const secondsInput = card.querySelector(".seconds");
    const startButton = card.querySelector(".start");
    const pauseButton = card.querySelector(".pause");
    const doneButton = card.querySelector(".done");
    const quickTimeButtons = card.querySelectorAll(".quick-time");

    restoreRunningTimer(index);

    syncInputs(index);
    updateCardView(index);

    personInput.addEventListener("input", () => {
      timers[index].person = personInput.value;
      saveTimers();
    });

    minutesInput.addEventListener("input", () => {
      updateTimeFromInputs(index);
    });

    secondsInput.addEventListener("input", () => {
      updateTimeFromInputs(index);
    });

    quickTimeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const minutes = Number(button.dataset.minutes);

        setQuickTime(index, minutes);
      });
    });

    startButton.addEventListener("click", () => {
      startTimer(index);
    });

    pauseButton.addEventListener("click", () => {
      pauseTimer(index);
    });

    doneButton.addEventListener("click", () => {
      markTimerAsDone(index);
    });
  });

  clearStorageButton.addEventListener("click", clearSavedData);
}

function loadTimers() {
  const savedTimers = localStorage.getItem(STORAGE_KEY);

  if (!savedTimers) {
    return defaultTimers;
  }

  try {
    return JSON.parse(savedTimers);
  } catch (error) {
    console.error("No se pudieron cargar los datos guardados:", error);
    return defaultTimers;
  }
}

function normalizeTimers(savedTimers) {
  return defaultTimers.map((defaultTimer, index) => ({
    ...defaultTimer,
    ...(savedTimers[index] || {}),
  }));
}

function saveTimers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function restoreRunningTimer(index) {
  const timer = timers[index];

  if (!timer.isRunning || !timer.endTime) {
    return;
  }

  const remainingSeconds = getRemainingSeconds(timer.endTime);

  if (remainingSeconds <= 0) {
    timer.remainingSeconds = 0;
    timer.endTime = null;
    timer.isRunning = false;
    timer.isFinished = true;
    timer.status = "Revisar este chat";
    saveTimers();
    return;
  }

  timer.remainingSeconds = remainingSeconds;
  timer.status = "En espera";

  startInterval(index);
}

function syncInputs(index) {
  const card = chatCards[index];
  const personInput = card.querySelector(".chat-person");
  const minutesInput = card.querySelector(".minutes");
  const secondsInput = card.querySelector(".seconds");

  personInput.value = timers[index].person || "";
  minutesInput.value = timers[index].minutes;
  secondsInput.value = timers[index].seconds;
}

function updateCardView(index) {
  const card = chatCards[index];
  const timer = timers[index];

  const display = card.querySelector(".display");
  const status = card.querySelector(".status");
  const minutesInput = card.querySelector(".minutes");
  const secondsInput = card.querySelector(".seconds");
  const quickTimeButtons = card.querySelectorAll(".quick-time");

  display.textContent = formatTime(timer.remainingSeconds);
  status.textContent = timer.status;

  card.classList.toggle("is-running", timer.isRunning);
  card.classList.toggle("is-paused", timer.status === "Pausado");
  card.classList.toggle("is-finished", timer.isFinished);

  minutesInput.disabled = timer.isRunning;
  secondsInput.disabled = timer.isRunning;

  quickTimeButtons.forEach((button) => {
    button.disabled = timer.isRunning;
  });
}

function updateTimeFromInputs(index) {
  const timer = timers[index];

  if (timer.isRunning) {
    return;
  }

  const result = getTimeFromInputs(index);

  timer.minutes = result.minutes;
  timer.seconds = result.seconds;

  if (!result.isValid) {
    timer.remainingSeconds = 0;
    timer.isFinished = false;
    timer.status = result.message;
    saveTimers();
    updateCardView(index);
    return;
  }

  timer.remainingSeconds = result.totalSeconds;
  timer.isFinished = false;
  timer.status = result.totalSeconds > 0 ? "Tiempo listo" : "Sin iniciar";

  saveTimers();
  updateCardView(index);
}

function getTimeFromInputs(index) {
  const card = chatCards[index];
  const minutesInput = card.querySelector(".minutes");
  const secondsInput = card.querySelector(".seconds");

  const minutes = Number(minutesInput.value) || 0;
  const seconds = Number(secondsInput.value) || 0;

  if (minutes < 0 || seconds < 0) {
    return {
      isValid: false,
      message: "Usa valores positivos",
      minutes: "",
      seconds: "",
      totalSeconds: 0,
    };
  }

  if (seconds > 59) {
    return {
      isValid: false,
      message: "Segundos entre 0 y 59",
      minutes,
      seconds,
      totalSeconds: 0,
    };
  }

  return {
    isValid: true,
    message: "",
    minutes,
    seconds,
    totalSeconds: minutes * 60 + seconds,
  };
}

function setQuickTime(index, minutes) {
  const timer = timers[index];

  if (timer.isRunning) {
    return;
  }

  timer.minutes = minutes;
  timer.seconds = 0;
  timer.remainingSeconds = minutes * 60;
  timer.endTime = null;
  timer.isRunning = false;
  timer.isFinished = false;
  timer.status = "Tiempo listo";

  syncInputs(index);
  saveTimers();
  updateCardView(index);
}

function startTimer(index) {
  const timer = timers[index];

  if (timer.isRunning) {
    return;
  }

  const result = getTimeFromInputs(index);

  timer.minutes = result.minutes;
  timer.seconds = result.seconds;

  if (!result.isValid || result.totalSeconds <= 0) {
    timer.remainingSeconds = 0;
    timer.status = "Ingresa un tiempo";
    timer.isFinished = false;
    saveTimers();
    updateCardView(index);
    return;
  }

  timer.remainingSeconds =
    timer.remainingSeconds > 0 ? timer.remainingSeconds : result.totalSeconds;

  timer.endTime = Date.now() + timer.remainingSeconds * 1000;
  timer.isRunning = true;
  timer.isFinished = false;
  timer.status = "En espera";

  saveTimers();
  updateCardView(index);
  startInterval(index);
}

function startInterval(index) {
  clearInterval(intervals[index]);

  intervals[index] = setInterval(() => {
    const timer = timers[index];

    if (!timer.isRunning || !timer.endTime) {
      clearInterval(intervals[index]);
      intervals[index] = null;
      return;
    }

    timer.remainingSeconds = getRemainingSeconds(timer.endTime);

    if (timer.remainingSeconds <= 0) {
      finishTimer(index);
      return;
    }

    updateCardView(index);
  }, 250);
}

function pauseTimer(index) {
  const timer = timers[index];

  if (!timer.isRunning) {
    return;
  }

  clearInterval(intervals[index]);
  intervals[index] = null;

  timer.remainingSeconds = getRemainingSeconds(timer.endTime);
  timer.endTime = null;
  timer.isRunning = false;
  timer.isFinished = false;
  timer.status = "Pausado";

  saveTimers();
  updateCardView(index);
}

function finishTimer(index) {
  const timer = timers[index];

  clearInterval(intervals[index]);
  intervals[index] = null;

  timer.remainingSeconds = 0;
  timer.endTime = null;
  timer.isRunning = false;
  timer.isFinished = true;
  timer.status = "Revisar este chat";

  saveTimers();
  updateCardView(index);
  playAlarm();
}

function markTimerAsDone(index) {
  const timer = timers[index];

  clearInterval(intervals[index]);
  intervals[index] = null;

  timer.remainingSeconds = 0;
  timer.endTime = null;
  timer.isRunning = false;
  timer.isFinished = false;
  timer.status = "Listo";

  saveTimers();
  updateCardView(index);
}

function clearSavedData() {
  localStorage.removeItem(STORAGE_KEY);

  intervals.forEach((intervalId, index) => {
    clearInterval(intervalId);
    intervals[index] = null;
  });

  timers = JSON.parse(JSON.stringify(defaultTimers));

  chatCards.forEach((card, index) => {
    syncInputs(index);
    updateCardView(index);
  });

  globalMessage.textContent = "Datos guardados borrados.";

  setTimeout(() => {
    globalMessage.textContent = "";
  }, 3000);
}

function getRemainingSeconds(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function playAlarm() {
  const alarmSound = new Audio(ALARM_SOUND_PATH);

  alarmSound.play().catch(() => {
    console.log(
      "El navegador bloqueó el sonido o no se encontró el archivo de alarma.",
    );
  });
}
