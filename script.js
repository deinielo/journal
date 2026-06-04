console.log("JS OK");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
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
let unsubPatientEntries = null;

// ---------------- UI ----------------
const $ = (id) => document.getElementById(id);

const screens = {
  auth:         $("auth"),
  home:         $("home"),
  diary:        $("diary"),
  emotion:      $("emotion"),
  sleep:        $("sleep"),
  habits:       $("habits"),
  feed:         $("patientDetail"),
  professional: $("professional"),
  profile:      $("profile"),
};

const entriesList = $("patientEntriesList");
const footerButtons = document.querySelectorAll(".appFooter button[data-screen]");

// ---------------- HELPERS ----------------
function formatDate(ts) {
  if (!ts) return "Sin fecha";
  try { return ts.toDate().toLocaleString("es-ES"); }
  catch { return "Fecha inválida"; }
}

// ---------------- TOAST ----------------
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.querySelector(".phone")?.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---------------- SHOW ----------------
function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
  updateFooter(name);

  // Al navegar al feed sin ser desde un paciente, cancela suscripción de paciente
  // y carga las entradas propias del usuario
  if (name === "feed" && !isPro) {
    if (unsubPatientEntries) { unsubPatientEntries(); unsubPatientEntries = null; }
    loadUserFeed();
  }
}

function updateFooter(screenName) {
  footerButtons.forEach(btn => {
    btn.classList.toggle("footerHidden", btn.dataset.screen === screenName);
  });
  if (!isPro) $("navProfessional")?.classList.add("hidden");
}

function loadUserFeed() {
  if (!currentUser || !entriesList) return;

  // Cancela suscripción de paciente si existe
  if (unsubPatientEntries) { unsubPatientEntries(); unsubPatientEntries = null; }
  if (unsubEntries) { unsubEntries(); unsubEntries = null; }

  const h2 = $("patientDetail")?.querySelector("h2");
  if (h2) h2.textContent = "Mis entradas";
  entriesList.innerHTML = "";

  const q = query(
    collection(db, "entries"),
    where("uid", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  unsubEntries = onSnapshot(q, (snap) => {
    entriesList.innerHTML = "";
    if (snap.empty) { entriesList.innerHTML = "<p>No hay entradas</p>"; return; }
    snap.forEach(d => entriesList.appendChild(buildEntryCard({ id: d.id, ...d.data() }, true)));
  });
}

// ---------------- NAV ----------------
$("goDiary")?.addEventListener("click",   () => show("diary"));
$("goEmotion")?.addEventListener("click", () => show("emotion"));
$("goSleep")?.addEventListener("click",   () => show("sleep"));
$("goHabits")?.addEventListener("click",  () => show("habits"));
$("goFeed")?.addEventListener("click",    () => show("feed"));

$("navHome")?.addEventListener("click",         () => show("home"));
$("navDiary")?.addEventListener("click",        () => show("diary"));
$("navFeed")?.addEventListener("click",         () => show("feed"));
$("navEmotion")?.addEventListener("click",      () => show("emotion"));
$("navSleep")?.addEventListener("click",        () => show("sleep"));
$("navHabits")?.addEventListener("click",       () => show("habits"));
$("navProfile")?.addEventListener("click",      () => { loadProfileScreen(); show("profile"); });
$("navProfessional")?.addEventListener("click", () => { if (isPro) loadPatients(); show("professional"); });

$("backHome1")?.addEventListener("click",            () => show("home"));
$("backHome2")?.addEventListener("click",            () => show("home"));
$("backHome3")?.addEventListener("click",            () => show("home"));
$("backHome4")?.addEventListener("click",            () => show("home"));
$("backHomeProfessional")?.addEventListener("click", () => show("home"));
$("backHomeProfile")?.addEventListener("click",      () => show("home"));
$("backToPatients")?.addEventListener("click",       () => show("home"));

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

// ---------------- PERFIL ----------------
function loadProfileScreen() {
  if (!currentUser) return;
  const emailEl = $("profileEmail");
  if (emailEl) emailEl.textContent = currentUser.email;

  const userRef = doc(db, "users", currentUser.uid);
  getDoc(userRef).then(snap => {
    const name = snap.data()?.displayName || "";
    const input = $("profileName");
    if (input) input.value = name;
    const avatar = $("profileAvatar");
    if (avatar) avatar.textContent = name ? name[0].toUpperCase() : "👤";
  });
  $("profileSavedMsg")?.classList.add("hidden");
}

$("saveProfile")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const name = $("profileName")?.value?.trim();
  if (!name) return;
  const userRef = doc(db, "users", currentUser.uid);
  await updateDoc(userRef, { displayName: name });
  const avatar = $("profileAvatar");
  if (avatar) avatar.textContent = name[0].toUpperCase();
  const headerBtn = $("navProfile");
  if (headerBtn) headerBtn.textContent = name[0].toUpperCase();
  const msg = $("profileSavedMsg");
  msg?.classList.remove("hidden");
  setTimeout(() => msg?.classList.add("hidden"), 2500);
  showToast("✅ ¡Nombre guardado!");
});

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
  showToast("✅ ¡Diario guardado!");
  show("home");
});

// ---------------- SAVE EMOCIÓN ----------------
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
    type: "emotion", mood: selectedMood, intensity: selectedIntensity,
    bodySensations, note: $("bodyNote")?.value?.trim(),
    uid: currentUser.uid, author: currentUser.email, createdAt: serverTimestamp()
  });
  document.querySelectorAll(".moodBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".intensityBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#emotion .check input").forEach(i => i.checked = false);
  if ($("bodyNote")) $("bodyNote").value = "";
  selectedMood = null; selectedIntensity = null;
  showToast("✅ ¡Emoción guardada!");
  show("home");
});

// ---------------- SAVE SUEÑO ----------------
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
  const details = [...document.querySelectorAll("#sleep .check input:checked")].map(i => i.value);
  await addDoc(collection(db, "entries"), {
    type: "sleep", sleepMood: selectedSleepMood, hours: selectedSleepHours,
    details, note: $("sleepNote")?.value?.trim(),
    uid: currentUser.uid, author: currentUser.email, createdAt: serverTimestamp()
  });
  document.querySelectorAll(".sleepMoodBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".sleepHoursBtn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#sleep .check input").forEach(i => i.checked = false);
  if ($("sleepNote")) $("sleepNote").value = "";
  selectedSleepMood = null; selectedSleepHours = null;
  showToast("✅ ¡Sueño guardado!");
  show("home");
});

// ---------------- SAVE HÁBITOS ----------------
const habitCheckboxes = document.querySelectorAll("#habits .check input[type=checkbox]");
habitCheckboxes.forEach(cb => cb.addEventListener("change", updateHabitProgress));

function updateHabitProgress() {
  const total   = habitCheckboxes.length;
  const checked = [...habitCheckboxes].filter(c => c.checked).length;
  const pct     = Math.round((checked / total) * 100);
  if ($("habitProgressText")) $("habitProgressText").textContent = `${checked}/${total}`;
  if ($("habitProgressFill")) $("habitProgressFill").style.width = `${pct}%`;
}

$("saveHabits")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const habits = [...habitCheckboxes].filter(c => c.checked).map(c => c.value);
  await addDoc(collection(db, "entries"), {
    type: "habits", habits, note: $("habitsNote")?.value?.trim(),
    uid: currentUser.uid, author: currentUser.email, createdAt: serverTimestamp()
  });
  habitCheckboxes.forEach(c => c.checked = false);
  if ($("habitsNote")) $("habitsNote").value = "";
  updateHabitProgress();
  showToast("✅ ¡Hábitos guardados!");
  show("home");
});

// ---------------- PACIENTES (solo pro) ----------------
async function loadPatients() {
  const list = $("patientsList");
  if (!list) return;
  list.innerHTML = "<p>Cargando pacientes...</p>";
  const q    = query(collection(db, "users"), where("professionalId", "==", currentUser.uid));
  const snap = await getDocs(q);
  list.innerHTML = "";
  if (snap.empty) { list.innerHTML = "<p>No tienes pacientes asignados.</p>"; return; }
  snap.forEach(d => {
    const p   = { uid: d.id, ...d.data() };
    const div = document.createElement("div");
    div.className = "patientItem";
    div.innerHTML = `
      <div class="patientEmail">${p.displayName || p.email}</div>
      <div class="patientHint">${p.email}</div>
    `;
    div.addEventListener("click", () => openPatientDetail(p));
    list.appendChild(div);
  });
}

function openPatientDetail(patient) {
  const h2 = $("patientDetail")?.querySelector("h2");
  if (h2) h2.textContent = `Entradas de ${patient.displayName || patient.email}`;

  // Navegar al feed SIN pasar por show("feed") para no disparar loadUserFeed
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens["feed"]?.classList.remove("hidden");
  updateFooter("feed");

  if (unsubPatientEntries) { unsubPatientEntries(); unsubPatientEntries = null; }

  const q = query(
    collection(db, "entries"),
    where("uid", "==", patient.uid),
    orderBy("createdAt", "desc")
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {
    if (!entriesList) return;
    entriesList.innerHTML = "";
    if (snap.empty) { entriesList.innerHTML = "<p>Este paciente no tiene entradas.</p>"; return; }
    snap.forEach(d => entriesList.appendChild(buildEntryCard({ id: d.id, ...d.data() }, true)));
  });
}

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) { show("auth"); return; }

  const userRef = doc(db, "users", user.uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email, displayName: user.displayName || "",
      role: "user", createdAt: serverTimestamp()
    });
  }

  const finalSnap = await getDoc(userRef);
  const userData  = finalSnap.data();
  isPro = userData?.role === "pro";

  show("home");

  // Botón perfil en header con inicial
  const headerBtn = $("navProfile");
  if (headerBtn) {
    headerBtn.classList.remove("hidden");
    const name = userData?.displayName || "";
    headerBtn.textContent = name ? name[0].toUpperCase() : "👤";
  }

  // Botón profesionales solo si es pro
  if (isPro) {
    $("navProfessional")?.classList.remove("hidden");
    loadPatients();
  } else {
    $("navProfessional")?.classList.add("hidden");
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
});

// ---------------- CARD BUILDER ----------------
function buildEntryCard(e, showActions) {
  const div = document.createElement("div");
  div.className = "entry";
  const canEdit = isPro || (currentUser && e.uid === currentUser.uid);

  function renderContent() {
    let html = `<div class="date">📅 ${formatDate(e.createdAt)}</div>`;
    html += `<div><strong>${e.mood || e.sleepMood || e.type || "Entrada"}</strong></div>`;

    if (e.type === "diary") {
      html += e.moodText ? `<div>🧠 ${e.moodText}</div>` : "";
      html += e.good     ? `<div>✨ ${e.good}</div>`     : "";
      html += e.hard     ? `<div>💭 ${e.hard}</div>`     : "";
    } else if (e.type === "emotion") {
      html += e.intensity              ? `<div>💢 Intensidad: ${e.intensity}</div>`     : "";
      html += e.bodySensations?.length ? `<div>🫀 ${e.bodySensations.join(", ")}</div>` : "";
      html += e.note                   ? `<div>📝 ${e.note}</div>`                      : "";
    } else if (e.type === "sleep") {
      html += e.hours           ? `<div>⏰ ${e.hours}</div>`                    : "";
      html += e.details?.length ? `<div>💤 ${e.details.join(", ")}</div>`       : "";
      html += e.note            ? `<div>📝 ${e.note}</div>`                     : "";
    } else if (e.type === "habits") {
      html += e.habits?.length ? `<div>✅ ${e.habits.join(", ")}</div>` : "";
      html += e.note           ? `<div>📝 ${e.note}</div>`              : "";
    }

    if (canEdit) {
      html += `
        <div class="entryActions">
          <button class="inlineEditBtn">✏️ Editar</button>
          <button class="inlineDeleteBtn">🗑️</button>
        </div>`;
    }
    return html;
  }

  div.innerHTML = renderContent();

  function bindCard() {
    if (!canEdit) return;

    div.querySelector(".inlineDeleteBtn")?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "entries", e.id));
    });

    div.querySelector(".inlineEditBtn")?.addEventListener("click", () => {
      const fields = getEditableFields(e);
      let editHtml = `<div class="date">📅 ${formatDate(e.createdAt)}</div>`;
      editHtml += `<div><strong>${e.mood || e.sleepMood || e.type || "Entrada"}</strong></div>`;
      fields.forEach(f => {
        editHtml += `
          <div class="editFieldGroup">
            <label class="editFieldLabel">${f.label}</label>
            <textarea class="editFieldTextarea" data-field="${f.key}" rows="3">${f.value || ""}</textarea>
          </div>`;
      });
      editHtml += `
        <div class="entryActions">
          <button class="saveEditBtn">💾 Guardar</button>
          <button class="cancelEditBtn">✕ Cancelar</button>
        </div>`;
      div.innerHTML = editHtml;

      div.querySelector(".saveEditBtn")?.addEventListener("click", async () => {
        const updates = {};
        div.querySelectorAll(".editFieldTextarea").forEach(ta => {
          updates[ta.dataset.field] = ta.value.trim();
        });
        await updateDoc(doc(db, "entries", e.id), updates);
        Object.assign(e, updates);
        showToast("✅ ¡Entrada actualizada!");
        div.innerHTML = renderContent();
        bindCard();
      });

      div.querySelector(".cancelEditBtn")?.addEventListener("click", () => {
        div.innerHTML = renderContent();
        bindCard();
      });
    });
  }

  bindCard();
  return div;
}

function getEditableFields(e) {
  if (e.type === "diary") return [
    { key: "moodText", label: "🧠 ¿Cómo ha ido?",   value: e.moodText },
    { key: "good",     label: "✨ Lo mejor del día", value: e.good    },
    { key: "hard",     label: "💭 Lo más difícil",   value: e.hard    },
  ];
  if (e.type === "emotion") return [{ key: "note", label: "📝 Nota", value: e.note }];
  if (e.type === "sleep")   return [{ key: "note", label: "📝 Nota", value: e.note }];
  if (e.type === "habits")  return [{ key: "note", label: "📝 Nota", value: e.note }];
  return [];
}
