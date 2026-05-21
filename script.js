console.log("JS OK");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// ---------------- FIREBASE ----------------

const app = initializeApp({
  apiKey: "AIzaSyANvBWfE15OZD4yQmPL8nnCPQQzj5a44WU",
  authDomain: "mi-diario-online.firebaseapp.com",
  projectId: "mi-diario-online",
});

const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ---------------- STATE ----------------

let currentUser = null;
let isPro = false;
let unsub = null;

// ---------------- UI ----------------

const $ = (id) => document.getElementById(id);

const screens = {
  auth: $("auth"),
  home: $("home"),
  diary: $("diary"),
  emotion: $("emotion"),
  sleep: $("sleep"),
  habits: $("habits"),
  feed: $("feed"),
};

const entriesList = $("entriesList");

// ---------------- CONTADOR ----------------

onSnapshot(collection(db, "entries"), (snapshot) => {
  const el = $("contador-registros");
  if (el) el.textContent = snapshot.size;
});

// ---------------- DATE ----------------

function formatDate(ts) {
  if (!ts) return "Sin fecha";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es-ES");
}

// ---------------- NAV ----------------

function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

// ---------------- NAV EVENTS ----------------

const navMap = {
  navHome: "home",
  navDiary: "diary",
  navFeed: "feed",
  navEmotion: "emotion",
  navSleep: "sleep",
  navHabits: "habits"
};

for (const [btnId, screen] of Object.entries(navMap)) {
  $(btnId)?.addEventListener("click", () => {
    show(screen);
    if (screen === "habits") updateHabitProgress();
  });
}

// ---------------- HABITS ----------------

function updateHabitProgress() {
  const inputs = document.querySelectorAll("#habits input");
  const checked = document.querySelectorAll("#habits input:checked");

  const percent = inputs.length ? (checked.length / inputs.length) * 100 : 0;

  const fill = document.getElementById("habitProgressFill");
  const text = document.getElementById("habitProgressText");

  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = `${checked.length}/${inputs.length}`;
}

// ---------------- AUTH ----------------

$("btnGoogle")?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(console.error);
});

$("btnEmail")?.addEventListener("click", async () => {
  const email = prompt("Email");
  const pass = prompt("Password");
  if (!email || !pass) return;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    await createUserWithEmailAndPassword(auth, email, pass);
  }
});

$("btnLogout")?.addEventListener("click", () => signOut(auth));

// ---------------- ACTIVE BUTTONS ----------------

function setActive(group) {
  document.querySelectorAll(group).forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(group).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

setActive(".moodBtn");
setActive(".intensityBtn");
setActive(".sleepMoodBtn");
setActive(".sleepHoursBtn");

// ---------------- NAV HOME ----------------

$("goDiary")?.addEventListener("click", () => show("diary"));
$("goEmotion")?.addEventListener("click", () => show("emotion"));
$("goSleep")?.addEventListener("click", () => show("sleep"));
$("goHabits")?.addEventListener("click", () => {
  show("habits");
  updateHabitProgress();
});
$("goFeed")?.addEventListener("click", () => show("feed"));

$("backHomeFeed")?.addEventListener("click", () => show("home"));
$("backHome1")?.addEventListener("click", () => show("home"));
$("backHome2")?.addEventListener("click", () => show("home"));
$("backHome3")?.addEventListener("click", () => show("home"));
$("backHome4")?.addEventListener("click", () => show("home"));

// ---------------- SAVE DIARY ----------------

$("btnSave")?.addEventListener("click", async () => {
  const text = $("entry")?.value?.trim();
  const mood = $("moodSelect")?.value;

  if (!text || !currentUser) return;

  await addDoc(collection(db, "entries"), {
    type: "diary",
    text,
    mood,
    uid: currentUser.uid,
    author: currentUser.email,
    createdAt: serverTimestamp()
  });

  $("entry").value = "";
  show("home");
});

// ---------------- SAVE EMOTION ----------------

$("saveEmotion")?.addEventListener("click", async () => {
  if (!currentUser) return;

  const activeMood = document.querySelector(".moodBtn.active");

  const mood = activeMood
    ? activeMood.querySelector(".emoji")?.textContent + " " +
      activeMood.querySelector(".label")?.textContent
    : "";

  const intensity = document.querySelector(".intensityBtn.active")?.dataset.level || "";
  const body = Array.from(document.querySelectorAll("#emotion input:checked")).map(i => i.value);
  const note = $("bodyNote")?.value || "";

  await addDoc(collection(db, "entries"), {
    type: "emotion",
    mood,
    intensity,
    body,
    note,
    uid: currentUser.uid,
    author: currentUser.email,
    createdAt: serverTimestamp()
  });

  show("home");
});

// ---------------- SAVE SLEEP ----------------

$("saveSleep")?.addEventListener("click", async () => {
  if (!currentUser) return;

  const activeSleep = document.querySelector(".sleepMoodBtn.active");

  const mood = activeSleep
    ? activeSleep.querySelector(".emoji")?.textContent + " " +
      activeSleep.querySelector(".label")?.textContent
    : "";

  const hours = document.querySelector(".sleepHoursBtn.active")?.dataset.hours || "";
  const checks = Array.from(document.querySelectorAll("#sleep input:checked")).map(i => i.value);
  const note = $("sleepNote")?.value || "";

await addDoc(collection(db, "entries"), {
  type: "sleep",
  sleepMood: mood,
  sleepMoodEmoji: activeSleep?.querySelector(".emoji")?.textContent || "",
  sleepHours: hours,
  sleepChecks: checks,
  sleepNote: note,
  uid: currentUser.uid,
  author: currentUser.email,
  createdAt: serverTimestamp()
});

  show("home");
});

// ---------------- SAVE HABITS ----------------

$("saveHabits")?.addEventListener("click", async () => {
  if (!currentUser) return;

  const habits = Array.from(document.querySelectorAll("#habits input:checked")).map(i => i.value);
  const note = $("habitsNote")?.value || "";

await addDoc(collection(db, "entries"), {
  type: "habits",
  habits,
  habitsEmoji: "🧠", // o el emoji que uses en UI (ver nota abajo)
  note,
  uid: currentUser.uid,
  author: currentUser.email,
  createdAt: serverTimestamp()
});

  show("home");
});

// ---------------- AUTH STATE ----------------

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (!user) {
    show("auth");
    return;
  }

  show("home");

  let role = "user";

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    role = snap.exists() ? snap.data().role : "user";
  } catch {}

  isPro = role === "pro";

  if (unsub) unsub();

  const ref = isPro
    ? query(collection(db, "entries"))
    : query(collection(db, "entries"),
  where("uid", "==", user.uid),);

  unsub = onSnapshot(ref, (snap) => {

    if (!entriesList) return;

    entriesList.innerHTML = "";

    if (snap.empty) {
      entriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    // ---------------- FIX IMPORTANTE: AGRUPAR POR USUARIO ----------------

// ---------------- PRO VIEW (AGRUPADO BIEN) ----------------

if (isPro) {

  const grouped = {};

  snap.forEach(d => {
    const e = d.data();

    // clave de usuario estable
    const key = e.author || e.uid || "Desconocido";

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  // 🔥 IMPORTANTE: limpiar antes de pintar (evita duplicados raros)
  entriesList.innerHTML = "";

  Object.entries(grouped).forEach(([user, items]) => {

    const section = document.createElement("div");
    section.className = "patientGroup";

    section.innerHTML = `<h3>👤 ${user}</h3>`;

    items.forEach(e => {

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>

        <div>
          <strong>${e.mood || e.sleepMood || e.habitsEmoji || e.type || "Entrada"}</strong>
        </div>

        ${e.text ? `<div>${e.text}</div>` : ""}
        ${e.note ? `<div>${e.note}</div>` : ""}

        ${e.intensity ? `<div>Intensidad: ${e.intensity}</div>` : ""}
        ${e.body?.length ? `<div>Cuerpo: ${e.body.join(", ")}</div>` : ""}

        ${e.sleepMood ? `<div>Sueño: ${e.sleepMood}</div>` : ""}
        ${e.sleepHours ? `<div>Horas: ${e.sleepHours}</div>` : ""}
        ${e.sleepChecks?.length ? `<div>${e.sleepChecks.join(", ")}</div>` : ""}

        ${e.habits?.length ? `<div>Hábitos: ${e.habits.join(", ")}</div>` : ""}

        <small>${e.author ?? ""}</small>
      `;

      section.appendChild(div);
    });

    entriesList.appendChild(section);
  });

  return;
}

    // USER NORMAL
    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>
       <div>
  <strong>
    ${e.mood || e.sleepMood || e.habitsEmoji || e.type || "📓 Entrada"}
  </strong>
</div>

        ${e.text ? `<div>${e.text}</div>` : ""}
        ${e.note ? `<div>${e.note}</div>` : ""}

        <small>${e.author ?? ""}</small>
      `;

      entriesList.appendChild(div);
    });

  });
});

// ---------------- GLOBAL ----------------

window.deleteEntry = async (id) => {
  await deleteDoc(doc(db, "entries", id));
};

window.editEntry = async (id, oldText) => {
  const newText = prompt("Editar:", oldText);
  if (!newText) return;

  await updateDoc(doc(db, "entries", id), {
    text: newText
  });
};

let lastScrollTop = 0;
let scrollTimeout;

const appContent = document.getElementById("appContent");
const footer = document.querySelector(".appFooter");

appContent?.addEventListener("scroll", () => {
  const scrollTop = appContent.scrollTop;

  if (!footer) return;

  // scroll hacia abajo → ocultar
  if (scrollTop > lastScrollTop) {
    footer.classList.add("hide");
  }

  // scroll hacia arriba → mostrar
  if (scrollTop < lastScrollTop) {
    footer.classList.remove("hide");
  }

  lastScrollTop = scrollTop;

  // 🔥 seguridad: si paras de hacer scroll, reaparece
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    footer.classList.remove("hide");
  }, 1200);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/journal/sw.js")
    .then(() => console.log("SW registrado OK"))
    .catch(err => console.error("Error SW:", err));
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("PWA instalable detectada");
});

// opcional: botón manual
window.installApp = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  console.log("Resultado instalación:", outcome);
  deferredPrompt = null;
};

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");

  setTimeout(() => {
    splash.style.opacity = "0";
    splash.style.transition = "0.5s";

    setTimeout(() => {
      splash.remove();
    }, 500);
  }, 800);
});
