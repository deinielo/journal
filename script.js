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

// ---------------- RESET CONTEXT (FIX PRINCIPAL) ----------------
function resetPatientContext() {
  if (unsubPatientEntries) {
    unsubPatientEntries();
    unsubPatientEntries = null;
  }

  const h2 = $("patientDetail")?.querySelector("h2");
  if (h2) h2.textContent = "Mis entradas";
}

// ---------------- SHOW ----------------
function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
  updateFooter(name);

  if (name === "feed") {
    resetPatientContext();
    loadUserFeed();
  }
}

function updateFooter(screenName) {
  footerButtons.forEach(btn => {
    btn.classList.toggle("footerHidden", btn.dataset.screen === screenName);
  });
  if (!isPro) $("navProfessional")?.classList.add("hidden");
}

// ---------------- USER FEED ----------------
function loadUserFeed() {
  if (!currentUser || !entriesList) return;

  if (unsubEntries) unsubEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  unsubEntries = onSnapshot(q, (snap) => {
    entriesList.innerHTML = "";
    if (snap.empty) {
      entriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }
    snap.forEach(d =>
      entriesList.appendChild(buildEntryCard({ id: d.id, ...d.data() }, true))
    );
  });
}

// ---------------- NAV (SIMPLIFICADO Y LIMPIO) ----------------
$("goDiary")?.addEventListener("click", () => show("diary"));
$("goEmotion")?.addEventListener("click", () => show("emotion"));
$("goSleep")?.addEventListener("click", () => show("sleep"));
$("goHabits")?.addEventListener("click", () => show("habits"));
$("goFeed")?.addEventListener("click", () => show("feed"));

$("navHome")?.addEventListener("click", () => show("home"));
$("navDiary")?.addEventListener("click", () => show("diary"));
$("navFeed")?.addEventListener("click", () => show("feed"));
$("navEmotion")?.addEventListener("click", () => show("emotion"));
$("navSleep")?.addEventListener("click", () => show("sleep"));
$("navHabits")?.addEventListener("click", () => show("habits"));

$("navProfile")?.addEventListener("click", () => {
  loadProfileScreen();
  show("profile");
});

$("navProfessional")?.addEventListener("click", () => {
  if (isPro) loadPatients();
  show("professional");
});

// ---------------- BACK BUTTONS ----------------
["backHome1","backHome2","backHome3","backHome4",
 "backHomeProfessional","backHomeProfile","backToPatients"]
.forEach(id => $(id)?.addEventListener("click", () => show("home")));

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

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return show("auth");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || "",
      role: "user",
      createdAt: serverTimestamp()
    });
  }

  const finalSnap = await getDoc(userRef);
  const userData = finalSnap.data();
  isPro = userData?.role === "pro";

  show("home");

  const headerBtn = $("navProfile");
  if (headerBtn) {
    headerBtn.classList.remove("hidden");
    const name = userData?.displayName || "";
    headerBtn.textContent = name ? name[0].toUpperCase() : "👤";
  }

  if (isPro) {
    $("navProfessional")?.classList.remove("hidden");
    loadPatients();
  } else {
    $("navProfessional")?.classList.add("hidden");
  }

  if (unsubCounter) unsubCounter();
  const counterQ = isPro
    ? collection(db, "entries")
    : query(collection(db, "entries"), where("uid", "==", user.uid));

  unsubCounter = onSnapshot(counterQ, (snap) => {
    const el = $("contador-registros");
    if (el) el.textContent = snap.size;
  });
});

// ---------------- PATIENTS ----------------
async function loadPatients() {
  const list = $("patientsList");
  if (!list) return;

  list.innerHTML = "<p>Cargando pacientes...</p>";

  const q = query(
    collection(db, "users"),
    where("professionalId", "==", currentUser.uid)
  );

  const snap = await getDocs(q);

  list.innerHTML = "";

  if (snap.empty) {
    list.innerHTML = "<p>No tienes pacientes asignados.</p>";
    return;
  }

  snap.forEach(d => {
    const p = { uid: d.id, ...d.data() };

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

// ---------------- PATIENT DETAIL ----------------
function openPatientDetail(patient) {
  resetPatientContext();

  const h2 = $("patientDetail")?.querySelector("h2");
  if (h2) h2.textContent = `Entradas de ${patient.displayName || patient.email}`;

  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens["feed"]?.classList.remove("hidden");
  updateFooter("feed");

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", patient.uid),
    orderBy("createdAt", "desc")
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {
    entriesList.innerHTML = "";

    if (snap.empty) {
      entriesList.innerHTML = "<p>Este paciente no tiene entradas.</p>";
      return;
    }

    snap.forEach(d =>
      entriesList.appendChild(buildEntryCard({ id: d.id, ...d.data() }, true))
    );
  });
}

// ---------------- CARD BUILDER (SIN CAMBIOS IMPORTANTES) ----------------
function buildEntryCard(e, showActions) {
  const div = document.createElement("div");
  div.className = "entry";

  const canEdit = isPro || (currentUser && e.uid === currentUser.uid);

  function renderContent() {
    let html = `<div class="date">📅 ${formatDate(e.createdAt)}</div>`;
    html += `<div><strong>${e.mood || e.sleepMood || e.type || "Entrada"}</strong></div>`;
    return html;
  }

  div.innerHTML = renderContent();
  return div;
}

// ---------------- PROFILE (sin cambios relevantes) ----------------
function loadProfileScreen() {
  if (!currentUser) return;

  $("profileEmail").textContent = currentUser.email;

  const userRef = doc(db, "users", currentUser.uid);
  getDoc(userRef).then(snap => {
    const name = snap.data()?.displayName || "";
    $("profileName").value = name;
    $("profileAvatar").textContent = name ? name[0].toUpperCase() : "👤";
  });
}
