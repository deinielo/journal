console.log("JS OK - ULTRA SAFE MODE");

// ---------------- FIREBASE ----------------

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

// ---------------- INIT ----------------

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
  if (!el) console.warn(`⚠️ Falta #${id}`);
  return el;
};

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
  feed: $("feed"),
  professional: $("professional"),
  patientDetail: $("patientDetail"),
};

// ---------------- SAFE NAV ----------------

function show(name) {
  if (!screens[name]) {
    console.error(`❌ SCREEN NO EXISTE: ${name}`);
    return;
  }

  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ---------------- FORMAT ----------------

function formatDate(ts) {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleString("es-ES");
  } catch {
    return "";
  }
}

// ---------------- PATIENT ----------------

function openPatient(uid) {
  if (!uid) return;

  show("patientDetail");
  loadPatientEntries(uid);
}

function loadPatientEntries(uid) {

  if (!patientEntriesList) return;

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", uid)
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {

    patientEntriesList.innerHTML = "";

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || e.moodText || ""}</div>
      `;

      patientEntriesList.appendChild(div);
    });

  }, () => {});
}

// ---------------- BUTTONS SAFE ----------------

const bind = (id, fn) => {
  const el = $(id);
  if (el) el.addEventListener("click", fn);
};

bind("goDiary", () => show("diary"));
bind("goEmotion", () => show("emotion"));
bind("goSleep", () => show("sleep"));
bind("goHabits", () => show("habits"));
bind("goFeed", () => show("feed"));

bind("backToPatients", () => show("professional"));

// ---------------- AUTH ----------------

bind("btnGoogle", () => signInWithPopup(auth, provider));
bind("btnLogout", () => signOut(auth));

bind("btnEmail", async () => {
  const email = prompt("Email");
  const pass = prompt("Password");
  if (!email || !pass) return;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    await createUserWithEmailAndPassword(auth, email, pass);
  }
});

// ---------------- SAVE ----------------

bind("btnSave", async () => {
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

  // ---------------- ENTRIES ----------------

  if (unsubEntries) unsubEntries();

  if (!entriesList) return;

  const q = isPro
    ? query(collection(db, "entries"), orderBy("createdAt", "desc"))
    : query(collection(db, "entries"), where("uid", "==", user.uid));

  unsubEntries = onSnapshot(q, (snap) => {

    entriesList.innerHTML = "";

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || ""}</div>
      `;

      entriesList.appendChild(div);
    });

  }, () => {});
});
