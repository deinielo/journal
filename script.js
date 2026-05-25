console.log("JS OK");

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM listo");
});

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

// ---------------- STATE ----------------

let currentUser = null;
let isPro = false;

let unsubEntries = null;
let unsubCounter = null;
let unsubPatients = null;
let unsubPatientEntries = null;

let selectedPatientUid = null;

// ---------------- SAFE SELECTOR ----------------

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`⚠️ Elemento faltante en DOM: #${id}`);
  }
  return el;
};

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

// ---------------- ELEMENTS ----------------

const entriesList = $("entriesList");
const patientsList = $("patientsList");
const patientEntriesList = $("patientEntriesList");

// ---------------- SAFE SHOW ----------------

function show(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    if (!screen) {
      console.warn(`❌ Pantalla no existe en HTML: ${key}`);
      return;
    }
    screen.classList.add("hidden");
  });

  if (!screens[name]) {
    console.error(`❌ Intento de abrir pantalla inexistente: ${name}`);
    return;
  }

  screens[name].classList.remove("hidden");
}

// ---------------- FORMAT ----------------

function formatDate(ts) {
  if (!ts) return "Sin fecha";
  try {
    return ts.toDate().toLocaleString("es-ES");
  } catch {
    return "Fecha inválida";
  }
}

// ---------------- PATIENT VIEW SAFE ----------------

function openPatient(uid) {
  if (!uid) {
    console.error("❌ openPatient sin UID");
    return;
  }

  selectedPatientUid = uid;
  show("patientDetail");
  loadPatientEntries(uid);
}

function loadPatientEntries(uid) {

  if (!patientEntriesList) {
    console.error("❌ Falta patientEntriesList en HTML");
    return;
  }

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {

    patientEntriesList.innerHTML = "";

    if (snap.empty) {
      patientEntriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    snap.forEach(docSnap => {
      const e = docSnap.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || "Entrada"}</strong></div>
        <div>🧠 ${e.text || e.moodText || ""}</div>
      `;

      patientEntriesList.appendChild(div);
    });
  }, (error) => {
    console.error("❌ Error en loadPatientEntries:", error);
  });
}

// ---------------- AUTH ----------------

$("btnGoogle")?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(err => console.error(err));
});

$("btnEmail")?.addEventListener("click", async () => {
  const email = prompt("Email");
  const pass = prompt("Password");
  if (!email || !pass) return;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    await createUserWithEmailAndPassword(auth, email, pass);
  }
});

$("btnLogout")?.addEventListener("click", () => signOut(auth));

// ---------------- SAVE SAFE ----------------

$("btnSave")?.addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    await addDoc(collection(db, "entries"), {
      type: "diary",
      mood: $("moodSelect")?.value || "",
      moodText: $("entryMood")?.value?.trim() || "",
      good: $("entryGood")?.value?.trim() || "",
      hard: $("entryHard")?.value?.trim() || "",
      uid: currentUser.uid,
      author: currentUser.email,
      createdAt: serverTimestamp()
    });

    show("home");

  } catch (e) {
    console.error("❌ Error guardando entrada:", e);
  }
});

// ---------------- AUTH STATE SAFE ----------------

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (!user) {
    show("auth");
    return;
  }

  show("home");

  try {
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

  } catch (e) {
    console.error("❌ Error user init:", e);
  }

  // ---------------- ENTRIES SAFE ----------------

  if (unsubEntries) unsubEntries();

  if (!entriesList) {
    console.warn("⚠️ entriesList no existe");
  } else {

    const entriesQ = isPro
      ? query(collection(db, "entries"), orderBy("createdAt", "desc"))
      : query(collection(db, "entries"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));

    unsubEntries = onSnapshot(entriesQ, (snap) => {

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
          <div><strong>${e.mood || "Entrada"}</strong></div>
          <div>🧠 ${e.text || e.moodText || ""}</div>
        `;

        entriesList.appendChild(div);
      });

    }, (err) => {
      console.error("❌ Error entries:", err);
    });
  }
});
