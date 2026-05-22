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
let unsub = null;
let unsubCounter = null;

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

// ---------------- SAVE DIARY ----------------

$("btnSave")?.addEventListener("click", async () => {

  const moodText = $("entryMood")?.value?.trim();
  const good = $("entryGood")?.value?.trim();
  const hard = $("entryHard")?.value?.trim();
  const mood = $("moodSelect")?.value;

  if (!currentUser) return;
  if (!moodText && !good && !hard) return;

  await addDoc(collection(db, "entries"), {
    type: "diary",
    mood,
    moodText,
    good,
    hard,
    uid: currentUser.uid,
    author: currentUser.email,
    createdAt: serverTimestamp()
  });

  $("entryMood").value = "";
  $("entryGood").value = "";
  $("entryHard").value = "";

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
      email: user.email,
      role: "user",
      createdAt: serverTimestamp()
    });
  }

  let role = "user";

  const roleSnap = await getDoc(userRef);
  if (roleSnap.exists()) role = roleSnap.data().role;

  isPro = role === "pro";

  // ---------------- CONTADOR (SOLO UNO) ----------------

  if (unsubCounter) unsubCounter();

  const counterRef = isPro
    ? collection(db, "entries")
    : query(collection(db, "entries"), where("uid", "==", user.uid));

  unsubCounter = onSnapshot(counterRef, (snapshot) => {
    const el = $("contador-registros");
    if (el) el.textContent = snapshot.size;
  });

  // ---------------- ENTRADAS ----------------

  if (unsub) unsub();

  const baseQuery = collection(db, "entries");

  const ref = isPro
    ? query(baseQuery, orderBy("createdAt", "desc"))
    : query(baseQuery, where("uid", "==", user.uid), orderBy("createdAt", "desc"));

  unsub = onSnapshot(ref, (snap) => {

    if (!entriesList) return;

    entriesList.innerHTML = "";

    if (snap.empty) {
      entriesList.innerHTML = "<p>No hay entradas</p>";
      return;
    }

    // ---------------- PRO ----------------
    if (isPro) {

      const grouped = {};

      snap.forEach(d => {
        const e = { id: d.id, ...d.data() };

        const key = e.author || e.uid || "Desconocido";

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(e);
      });

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

            <div><strong>${e.mood || e.type || "Entrada"}</strong></div>

            ${e.moodText ? `<div>🧠 ${e.moodText}</div>` : ""}
            ${e.good ? `<div>✨ ${e.good}</div>` : ""}
            ${e.hard ? `<div>💭 ${e.hard}</div>` : ""}

            <small>${e.author ?? ""}</small>

            <div class="entryActions">
              <button onclick="editEntry('${e.id}')">✏️</button>
              <button onclick="deleteEntry('${e.id}')">🗑️</button>
            </div>
          `;

          section.appendChild(div);
        });

        entriesList.appendChild(section);
      });

      return;
    }

    // ---------------- USER ----------------
    snap.forEach(d => {
      const e = d.data();

      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="date">📅 ${formatDate(e.createdAt)}</div>
        <div><strong>${e.mood || e.type || "Entrada"}</strong></div>

        ${e.moodText ? `<div>🧠 ${e.moodText}</div>` : ""}
        ${e.good ? `<div>✨ ${e.good}</div>` : ""}
        ${e.hard ? `<div>💭 ${e.hard}</div>` : ""}

        <small>${e.author ?? ""}</small>
      `;

      entriesList.appendChild(div);
    });

  });
});

// ---------------- GLOBAL ACTIONS ----------------

document.addEventListener("click", (e) => {

  if (e.target.id === "goDiary") {
    show("diary");
  }

  if (e.target.id === "goEmotion") {
    show("emotion");
  }

  if (e.target.id === "btnSave") {
    saveDiary();
  }

});

window.deleteEntry = async (id) => {
  await deleteDoc(doc(db, "entries", id));
};

window.editEntry = async (id) => {
  const newText = prompt("Editar texto:");
  if (!newText) return;

  await updateDoc(doc(db, "entries", id), {
    moodText: newText
  });
};
