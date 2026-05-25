console.log("JS OK");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, where, orderBy, deleteDoc, doc, updateDoc,
  serverTimestamp, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged
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
let unsubEntries = null;
let unsubCounter = null;

// ---------------- UI ----------------
const $ = (id) => document.getElementById(id);

// FIX: los ids deben coincidir exactamente con el HTML
const screens = {
  auth:          $("auth"),
  home:          $("home"),
  diary:         $("diary"),
  emotion:       $("emotion"),
  sleep:         $("sleep"),
  habits:        $("habits"),
  feed:          $("patientDetail"),      // ← era $("feed"), no existe
  professional:  $("professional"),
};

// FIX: el id real en el HTML es "patientEntriesList", no "entriesList"
const entriesList = $("patientEntriesList");

// ---------------- HELPERS ----------------
function formatDate(ts) {
  if (!ts) return "Sin fecha";
  try { return ts.toDate().toLocaleString("es-ES"); }
  catch { return "Fecha inválida"; }
}

function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

// ---------------- NAV (botones principales) ----------------
$("goDiary")?.addEventListener("click",   () => show("diary"));
$("goEmotion")?.addEventListener("click", () => show("emotion"));
$("goSleep")?.addEventListener("click",   () => show("sleep"));
$("goHabits")?.addEventListener("click",  () => show("habits"));
$("goFeed")?.addEventListener("click",    () => show("feed"));   // FIX: ahora "feed" sí existe en screens

$("navHome")?.addEventListener("click",         () => show("home"));
$("navDiary")?.addEventListener("click",        () => show("diary"));
$("navFeed")?.addEventListener("click",         () => show("feed"));
$("navEmotion")?.addEventListener("click",      () => show("emotion"));
$("navSleep")?.addEventListener("click",        () => show("sleep"));
$("navHabits")?.addEventListener("click",       () => show("habits"));
$("navProfessional")?.addEventListener("click", () => show("professional")); // FIX: faltaba

$("backHome1")?.addEventListener("click",           () => show("home"));
$("backHome2")?.addEventListener("click",           () => show("home"));
$("backHome3")?.addEventListener("click",           () => show("home"));
$("backHome4")?.addEventListener("click",           () => show("home"));
$("backToPatients")?.addEventListener("click",      () => show("home")); // FIX: id real del HTML
$("backHomeProfessional")?.addEventListener("click",() => show("home")); // FIX: id real del HTML

// ---------------- AUTH ----------------
$("btnGoogle")?.addEventListener("click", () => signInWithPopup(auth, provider));

$("btnEmail")?.addEventListener("click", async () => {
  const email = prompt("Email");
  const pass  = prompt("Password");
  if (!email || !pass) return;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    await createUserWithEmailAndPassword(auth, email, pass);
  }
});

$("btnLogout")?.addEventListener("click", () => signOut(auth));

// ---------------- SAVE DIARY ----------------
$("btnSave")?.addEventListener("click", async () => {
  if (!currentUser) return;
  await addDoc(collection(db, "entries"), {
    type:      "diary",
    mood:      $("moodSelect")?.value,
    moodText:  $("entryMood")?.value?.trim(),
    good:      $("entryGood")?.value?.trim(),
    hard:      $("entryHard")?.value?.trim(),
    uid:       currentUser.uid,
    author:    currentUser.email,
    createdAt: serverTimestamp()
  });
  $("entryMood").value = "";
  $("entryGood").value = "";
  $("entryHard").value = "";
  show("home");
});

// ---------------- SAVE EMOCIÓN (FIX: faltaba todo) ----------------
let selectedMood      = null;
let selectedIntensity = null;

document.querySelectorAll(".moodBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".moodBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMood = btn.querySelector(".emoji")?.textContent + " " + btn.querySelector(".label")?.textContent;
  });
});

document.querySelectorAll(".intensityBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".intensityBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedIntensity = btn.dataset.level;
  });
});

$("saveEmotion")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const bodySensations = [...document.querySelectorAll("#emotion .check input:checked")]
    .map(i => i.value);
  await addDoc(collection(db, "entries"), {
    type:           "emotion",
    mood:           selectedMood,
    intensity:      selectedIntensity,
    bodySensations,
    note:           $("bodyNote")?.value?.trim(),
    uid:            currentUser.uid,
    author:         currentUser.email,
    createdAt:      serverTimestamp()
  });
  // reset
  document.querySelectorAll(".moodBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".intensityBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#emotion .check input").forEach(i => i.checked = false);
  if ($("bodyNote")) $("bodyNote").value = "";
  selectedMood = null;
  selectedIntensity = null;
  show("home");
});

// ---------------- SAVE SUEÑO (FIX: faltaba todo) ----------------
let selectedSleepMood  = null;
let selectedSleepHours = null;

document.querySelectorAll(".sleepMoodBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sleepMoodBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSleepMood = btn.querySelector(".emoji")?.textContent + " " + btn.querySelector(".label")?.textContent;
  });
});

document.querySelectorAll(".sleepHoursBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sleepHoursBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSleepHours = btn.dataset.hours;
  });
});

$("saveSleep")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const details = [...document.querySelectorAll("#sleep .check input:checked")]
    .map(i => i.value);
  await addDoc(collection(db, "entries"), {
    type:      "sleep",
    sleepMood: selectedSleepMood,
    hours:     selectedSleepHours,
    details,
    note:      $("sleepNote")?.value?.trim(),
    uid:       currentUser.uid,
    author:    currentUser.email,
    createdAt: serverTimestamp()
  });
  document.querySelectorAll(".sleepMoodBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".sleepHoursBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#sleep .check input").forEach(i => i.checked = false);
  if ($("sleepNote")) $("sleepNote").value = "";
  selectedSleepMood = null;
  selectedSleepHours = null;
  show("home");
});

// ---------------- SAVE HÁBITOS (FIX: faltaba todo) ----------------
const habitCheckboxes = document.querySelectorAll("#habits .check input[type=checkbox]");

habitCheckboxes.forEach(cb => {
  cb.addEventListener("change", updateHabitProgress);
});

function updateHabitProgress() {
  const total   = habitCheckboxes.length;
  const checked = [...habitCheckboxes].filter(c => c.checked).length;
  const pct     = Math.round((checked / total) * 100);
  if ($("habitProgressText"))  $("habitProgressText").textContent  = `${checked}/${total}`;
  if ($("habitProgressFill"))  $("habitProgressFill").style.width  = `${pct}%`;
}

$("saveHabits")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const habits = [...habitCheckboxes].filter(c => c.checked).map(c => c.value);
  await addDoc(collection(db, "entries"), {
    type:      "habits",
    habits,
    note:      $("habitsNote")?.value?.trim(),
    uid:       currentUser.uid,
    author:    currentUser.email,
    createdAt: serverTimestamp()
  });
  habitCheckboxes.forEach(c => c.checked = false);
  if ($("habitsNote")) $("habitsNote").value = "";
  updateHabitProgress();
  show("home");
});

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) { show("auth"); return; }

  show("home");

  const userRef = doc(db, "users", user.uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { email: user.email, role: "user", createdAt: serverTimestamp() });
  }

  const roleSnap = await getDoc(userRef);
  isPro = roleSnap.data()?.role === "pro";

  // Mostrar botón de profesionales solo si es pro
  if (isPro) {
    $("navProfessional")?.classList.remove("hidden");
  }

  // ---------------- COUNTER ----------------
  if (unsubCounter) unsubCounter();
  const counterQ = isPro
    ? collection(db, "entries")
    : query(collection(db, "entries"), where("uid", "==", user.uid));

  unsubCounter = onSnapshot(counterQ, (snap) => {
    const el = $("contador-registros");
    if (el) el.textContent = snap.size;
  });

  // ---------------- ENTRIES ----------------
  if (unsubEntries) unsubEntries();
  const base = collection(db, "entries");
  const entriesQ = isPro
    ? query(base, orderBy("createdAt", "desc"))
    : query(base, where("uid", "==", user.uid), orderBy("createdAt", "desc"));

  unsubEntries = onSnapshot(entriesQ, (snap) => {
    if (!entriesList) return;
    entriesList.innerHTML = "";
    if (snap.empty) { entriesList.innerHTML = "<p>No hay entradas</p>"; return; }

    if (isPro) {
      const grouped = {};
      snap.forEach(d => {
        const e   = { id: d.id, ...d.data() };
        const key = e.author || "Desconocido";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(e);
      });
      Object.entries(grouped).forEach(([userEmail, items]) => {
        const section = document.createElement("div");
        section.className = "patientGroup";
        section.innerHTML = `<h3>👤 ${userEmail}</h3>`;
        items.forEach(e => {
          section.appendChild(buildEntryCard(e, true));
        });
        entriesList.appendChild(section);
      });
      return;
    }

    snap.forEach(d => {
      const e = { id: d.id, ...d.data() };
      entriesList.appendChild(buildEntryCard(e, false));
    });
  });
});

// ---------------- CARD BUILDER ----------------
function buildEntryCard(e, showActions) {
  const div = document.createElement("div");
  div.className = "entry";

  let extra = "";
  if (e.type === "emotion") {
    extra = `
      ${e.intensity  ? `<div>💢 Intensidad: ${e.intensity}</div>` : ""}
      ${e.bodySensations?.length ? `<div>🫀 ${e.bodySensations.join(", ")}</div>` : ""}
      ${e.note        ? `<div>📝 ${e.note}</div>` : ""}
    `;
  } else if (e.type === "sleep") {
    extra = `
      ${e.hours   ? `<div>⏰ ${e.hours}</div>` : ""}
      ${e.details?.length ? `<div>💤 ${e.details.join(", ")}</div>` : ""}
      ${e.note    ? `<div>📝 ${e.note}</div>` : ""}
    `;
  } else if (e.type === "habits") {
    extra = `
      ${e.habits?.length ? `<div>✅ ${e.habits.join(", ")}</div>` : ""}
      ${e.note ? `<div>📝 ${e.note}</div>` : ""}
    `;
  } else {
    extra = `
      ${e.moodText ? `<div>🧠 ${e.moodText}</div>` : ""}
      ${e.good     ? `<div>✨ ${e.good}</div>` : ""}
      ${e.hard     ? `<div>💭 ${e.hard}</div>` : ""}
    `;
  }

  div.innerHTML = `
    <div class="date">📅 ${formatDate(e.createdAt)}</div>
    <div><strong>${e.mood || e.sleepMood || e.type || "Entrada"}</strong></div>
    ${extra}
    ${showActions ? `
      <div class="entryActions">
        <button onclick="editEntry('${e.id}', '${(e.moodText || "").replace(/'/g, "\\'")}')">✏️</button>
        <button onclick="deleteEntry('${e.id}')">🗑️</button>
      </div>` : ""}
  `;
  return div;
}

// ---------------- GLOBAL ACTIONS ----------------
window.deleteEntry = async (id) => {
  await deleteDoc(doc(db, "entries", id));
};

window.editEntry = async (id, oldText) => {
  const t = prompt("Editar texto:", oldText);
  if (!t) return;
  await updateDoc(doc(db, "entries", id), { moodText: t });
};
