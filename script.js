console.log("JS OK (SAFE MODE)");

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

// ---------------- SAFE DOM ----------------

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Falta elemento HTML: #${id}`);
  return el;
};

// ---------------- STATE ----------------

let currentUser = null;
let isPro = false;

let unsubEntries = null;
let unsubPatients = null;
let unsubPatientEntries = null;

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
  if (!screens[name]) {
    console.error(`❌ Pantalla no existe en HTML: ${name}`);
    return;
  }

  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[name].classList.remove("hidden");

  console.log(`📺 Pantalla: ${name}`);
}

// ---------------- ELEMENTS ----------------

const entriesList = $("entriesList");
const patientsList = $("patientsList");
const patientEntriesList = $("patientEntriesList");

// ---------------- FORMAT ----------------

function formatDate(ts) {
  if (!ts) return "Sin fecha";
  try {
    return ts.toDate().toLocaleString("es-ES");
  } catch {
    return "Fecha inválida";
  }
}

// ---------------- PATIENT VIEW ----------------

function openPatient(uid) {
  if (!uid) return console.warn("⚠️ UID inválido en openPatient");

  show("patientDetail");

  if (unsubPatientEntries) unsubPatientEntries();

  const q = query(
    collection(db, "entries"),
    where("uid", "==", uid)
  );

  unsubPatientEntries = onSnapshot(q, (snap) => {
    console.log("📊 Entradas paciente:", snap.size);

    if (!patientEntriesList) return;

    patientEntriesList.innerHTML = "";

    if (snap.empty) {
      patientEntriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || e.moodText || ""}</div>
      `;

      patientEntriesList.appendChild(div);
    });
  });
}

// ---------------- NAV SAFE ----------------

const bind = (id, fn) => {
  const el = $(id);
  if (el) el.addEventListener("click", fn);
};

bind("goDiary", () => show("diary"));
bind("goEmotion", () => show("emotion"));
bind("goSleep", () => show("sleep"));
bind("goHabits", () => show("habits"));

bind("backToPatients", () => show("professional"));

bind("goFeed", () => {
  console.warn("⚠️ feed no existe en HTML");
});

// ---------------- AUTH ----------------

bind("btnGoogle", () => signInWithPopup(auth, provider));

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

bind("btnLogout", () => signOut(auth));

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

  // ---------------- PATIENTS ----------------

  if (unsubPatients) unsubPatients();

  if (isPro && patientsList) {

    const q = query(
      collection(db, "users"),
      where("professionalId", "==", user.uid)
    );

    unsubPatients = onSnapshot(q, (snap) => {
      patientsList.innerHTML = "";

      console.log("👥 Pacientes:", snap.size);

      if (snap.empty) {
        patientsList.innerHTML = "<p>No tienes pacientes</p>";
        return;
      }

      snap.forEach(d => {
        const data = d.data();

        const div = document.createElement("div");
        div.className = "patientItem";

        div.innerHTML = `
          <div>👤 ${data.email || ""}</div>
          <div>Ver entradas</div>
        `;

        div.onclick = () => openPatient(data.uid);

        patientsList.appendChild(div);
      });
    });
  }

  // ---------------- ENTRIES (SAFE FIX REAL) ----------------

  if (unsubEntries) unsubEntries();

  if (!entriesList) {
    console.warn("⚠️ entriesList no existe");
    return;
  }

  const base = collection(db, "entries");

  const entriesQ = isPro
    ? query(base, orderBy("createdAt", "desc"))
    : query(base, where("uid", "==", user.uid), orderBy("createdAt", "desc"));

  unsubEntries = onSnapshot(entriesQ, (snap) => {
    entriesList.innerHTML = "";

    console.log("📚 Entradas:", snap.size);

    if (snap.empty) {
      entriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div>📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || ""}</strong></div>
        <div>${e.text || ""}</div>
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
    text: t
  });
};
