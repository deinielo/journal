console.log("JS OK - SAFE MODE");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
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

// ---------------- SAFE DOM ----------------

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`⚠️ FALTA EN HTML: #${id}`);
    return null;
  }
  return el;
};

function safeHTML(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

// ---------------- STATE ----------------

let currentUser = null;
let isPro = false;

let unsubEntries = null;
let unsubPatients = null;
let unsubPatientEntries = null;

// ---------------- ELEMENTS ----------------

const entriesList = $("entriesList");
const patientsList = $("patientsList");
const patientEntriesList = $("patientEntriesList");

// ---------------- SCREENS ----------------

const screens = {
  auth: $("auth"),
  home: $("home"),
  diary: $("diary"),
  emotion: $("emotion"),
  sleep: $("sleep"),
  habits: $("habits"),
  professional: $("professional"),
  patientDetail: $("patientDetail"),
};

function show(name) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name]?.classList.remove("hidden");
}

// ---------------- PATIENTS ----------------

function openPatient(uid) {
  show("patientDetail");
  loadPatientEntries(uid);
}

function loadPatientEntries(uid) {

  if (!patientEntriesList) return;

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(collection(db, "entries"), where("uid", "==", uid));

  unsubPatientEntries = onSnapshot(q, (snap) => {

    console.log("📊 Patient entries:", snap.size);

    safeHTML(patientEntriesList, "");

    if (snap.empty) {
      safeHTML(patientEntriesList, "<p>No hay entradas</p>");
      return;
    }

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>📅 ${e.createdAt?.toDate?.() || ""}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || ""}</div>
      `;

      patientEntriesList.appendChild(div);
    });
  });
}

// ---------------- AUTH BUTTONS SAFE ----------------

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
    mood: $("moodSelect")?.value || "",
    text: $("entryMood")?.value?.trim() || "",
    good: $("entryGood")?.value?.trim() || "",
    hard: $("entryHard")?.value?.trim() || "",
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

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      role: "user",
      professionalId: null,
      createdAt: serverTimestamp()
    });
  }

  const data = (await getDoc(ref)).data();
  isPro = data?.role === "pro";

  $("navProfessional")?.classList.toggle("hidden", !isPro);

  // ---------------- PATIENTS ----------------

  if (unsubPatients) unsubPatients();

  if (isPro && patientsList) {

    const q = query(collection(db, "users"), where("professionalId", "==", user.uid));

    unsubPatients = onSnapshot(q, (snap) => {

      safeHTML(patientsList, "");

      snap.forEach(d => {
        const u = d.data();

        const div = document.createElement("div");
        div.className = "patientItem";

        div.innerHTML = `
          <div>👤 ${u.email}</div>
          <div>Ver entradas</div>
        `;

        div.onclick = () => openPatient(u.uid);

        patientsList.appendChild(div);
      });
    });
  }

  // ---------------- ENTRIES ----------------

  if (unsubEntries) unsubEntries();

  const q = isPro
    ? query(collection(db, "entries"))
    : query(collection(db, "entries"), where("uid", "==", user.uid));

  unsubEntries = onSnapshot(q, (snap) => {

    if (!entriesList) return;

    safeHTML(entriesList, "");

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>📅 ${e.createdAt?.toDate?.() || ""}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || ""}</div>
      `;

      entriesList.appendChild(div);
    });
  });
});

// ---------------- GLOBAL ACTIONS ----------------

window.deleteEntry = async (id) => {
  await deleteDoc(doc(db, "entries", id));
};

window.editEntry = async (id, oldText) => {
  const t = prompt("Editar:", oldText);
  if (!t) return;

  await updateDoc(doc(db, "entries", id), {
    text: t
  });
};
