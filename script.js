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
  getDoc,
  setDoc
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

let unsubEntries = null;
let unsubCounter = null;
let unsubPatients = null;
let unsubPatientEntries = null;

let selectedPatientUid = null;

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
  professional: $("professional"),
  patientDetail: $("patientDetail"),
};

const entriesList = $("entriesList");
const patientsList = $("patientsList");
const patientEntriesList = $("patientEntriesList");

// ---------------- HELPERS ----------------

function formatDate(ts) {
  if (!ts) return "Sin fecha";
  try {
    return ts.toDate().toLocaleString("es-ES");
  } catch {
    return "Fecha inválida";
  }
}

function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

// ---------------- PATIENT VIEW ----------------

function openPatient(uid) {
  selectedPatientUid = uid;
  show("patientDetail");
  loadPatientEntries(uid);
}

function loadPatientEntries(uid) {

  console.log("Cargando entradas de UID:", uid);

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {

    console.log("ENTRADAS ENCONTRADAS:", snap.size);

    patientEntriesList.innerHTML = "";

    if (snap.empty) {
      patientEntriesList.innerHTML = "<p>Este paciente no tiene entradas</p>";
      return;
    }

    snap.forEach(docSnap => {
      const e = docSnap.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || "Entrada"}</strong></div>
        ${e.moodText ? `<div>🧠 ${e.moodText}</div>` : ""}
        ${e.good ? `<div>✨ ${e.good}</div>` : ""}
        ${e.hard ? `<div>💭 ${e.hard}</div>` : ""}
      `;

      patientEntriesList.appendChild(div);
    });
  });
}

// ---------------- NAV ----------------

$("backToPatients")?.addEventListener("click", () => show("professional"));

// ---------------- AUTH ----------------

$("btnGoogle")?.addEventListener("click", () => {
  signInWithPopup(auth, provider);
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

// ---------------- SAVE ----------------

$("btnSave")?.addEventListener("click", async () => {
  if (!currentUser) return;

  await addDoc(collection(db, "entries"), {
    type: "diary",
    mood: $("moodSelect")?.value,
    moodText: $("entryMood")?.value?.trim(),
    good: $("entryGood")?.value?.trim(),
    hard: $("entryHard")?.value?.trim(),
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

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      role: "user",
      professionalId: null,
      createdAt: serverTimestamp()
    });
  }

  const roleData = (await getDoc(userRef)).data();
  isPro = roleData?.role === "pro";

  $("navProfessional")?.classList.toggle("hidden", !isPro);

  // ---------------- PATIENTS ----------------

  if (unsubPatients) unsubPatients();

  if (isPro && patientsList) {

    const q = query(
      collection(db, "users"),
      where("professionalId", "==", user.uid)
    );

    unsubPatients = onSnapshot(q, (snap) => {

      patientsList.innerHTML = "";

      console.log("PACIENTES:", snap.size);

      if (snap.empty) {
        patientsList.innerHTML = "<p>No tienes pacientes</p>";
        return;
      }

      snap.forEach(docSnap => {

        const data = docSnap.data();

        const div = document.createElement("div");
        div.className = "patientItem";

        div.innerHTML = `
          <div class="patientEmail">👤 ${data.email}</div>
          <div class="patientHint">Toca para ver entradas</div>
        `;

        // 🔥 FIX IMPORTANTE: usar UID REAL
        div.onclick = () => openPatient(data.uid);

        patientsList.appendChild(div);
      });
    });
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

    if (snap.empty) {
      entriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    snap.forEach(docSnap => {

      const e = docSnap.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood}</strong></div>
        <div>${e.moodText || ""}</div>
      `;

      entriesList.appendChild(div);
    });
  });
});

// ---------------- ACTIONS ----------------

window.deleteEntry = async (id) => {
  await deleteDoc(doc(db, "entries", id));
};

window.editEntry = async (id, oldText) => {
  const t = prompt("Editar texto:", oldText);
  if (!t) return;

  await updateDoc(doc(db, "entries", id), {
    moodText: t
  });
};
