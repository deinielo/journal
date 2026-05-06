console.log("JS CARGADO");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
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

// ================= FIREBASE =================

const firebaseConfig = {
  apiKey: "AIzaSyANvBWfE15OZD4yQmPL8nnCPQQzj5a44WU",
  authDomain: "mi-diario-online.firebaseapp.com",
  projectId: "mi-diario-online",
  storageBucket: "mi-diario-online.firebasestorage.app",
  messagingSenderId: "593477390815",
  appId: "1:593477390815:web:4e1df85a12c11dd86e746a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ================= STATE =================

let currentUser = null;
let unsubscribe = null;

// ================= UI =================

const list = document.getElementById("entriesList");
const btnGoogle = document.getElementById("btnGoogle");
const btnEmail = document.getElementById("btnEmail");
const btnLogout = document.getElementById("btnLogout");
const btnSave = document.getElementById("btnSave");

const settingsPanel = document.getElementById("settingsPanel");
const nameInput = document.getElementById("nameInput");
const btnSaveProfile = document.getElementById("btnSaveProfile");
const profileStatus = document.getElementById("profileStatus");

// ================= BUTTONS =================

btnGoogle?.addEventListener("click", loginGoogle);
btnEmail?.addEventListener("click", loginEmail);
btnLogout?.addEventListener("click", logout);
btnSave?.addEventListener("click", saveEntry);

// ================= UI =================

function updateUI(user) {
  const logged = !!user;

  if (btnGoogle) btnGoogle.style.display = logged ? "none" : "inline-block";
  if (btnEmail) btnEmail.style.display = logged ? "none" : "inline-block";
  if (btnLogout) btnLogout.style.display = logged ? "inline-block" : "none";

  if (settingsPanel) {
    settingsPanel.style.display = logged ? "block" : "none";
  }
}

// ================= USER =================

async function createOrUpdateUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Sin nombre",
      email: user.email || "",
      role: "user",
      createdAt: Date.now()
    });
  }
}

async function loadUserProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  if (nameInput) nameInput.value = data.displayName || "";
}

// ================= RENDER =================

function renderEntry(target, data, id, ownerUid) {
  const div = document.createElement("div");
  div.className = "entry";

  div.innerHTML = `
    <p><strong>${data.date}</strong></p>
    <p>${data.text}</p>

    <button onclick="editEntry('${ownerUid}','${id}','${data.text}')">✏️ Editar</button>
    <button onclick="deleteEntry('${ownerUid}','${id}')">🗑️ Borrar</button>
  `;

  target.appendChild(div);
}

// ================= USER LISTENER =================

function listenUserEntries(uid) {
  const ref = query(
    collection(db, "users", uid, "entries"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(ref, (snap) => {
    list.innerHTML = "";

    if (snap.empty) {
      list.innerHTML = "<p>❌ No hay entradas</p>";
      return;
    }

    snap.forEach((d) => {
      renderEntry(list, d.data(), d.id, uid);
    });
  });
}

// ================= AUTH =================

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  updateUI(user);

  if (!list) return;
  list.innerHTML = "";

  if (!user) {
    if (unsubscribe) unsubscribe();
    return;
  }

  await createOrUpdateUser(user);
  await loadUserProfile(user);

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.data()?.role || "user";

  if (unsubscribe) unsubscribe();

  // ================= USER =================
  if (role === "user") {
    unsubscribe = listenUserEntries(user.uid);
  }

  // ================= PRO =================
  else if (role === "pro") {
    const usersRef = collection(db, "users");

    unsubscribe = onSnapshot(usersRef, (snap) => {
      list.innerHTML = "";

      snap.forEach((uDoc) => {
        const patientId = uDoc.id;
        const data = uDoc.data();

        if (data.professionalId !== user.uid) return;

        const name = data.displayName || patientId.slice(0, 6);

        const box = document.createElement("div");
        box.className = "patient-box";
        box.innerHTML = `<h3>Paciente: ${name}</h3>`;

        const ref = query(
          collection(db, "users", patientId, "entries"),
          orderBy("createdAt", "desc")
        );

        onSnapshot(ref, (snap2) => {
          box.querySelectorAll(".entry").forEach(e => e.remove());

          snap2.forEach((entry) => {
            renderEntry(box, entry.data(), entry.id, patientId);
          });
        });

        list.appendChild(box);
      });
    });
  }
});

// ================= PROFILE =================

btnSaveProfile?.addEventListener("click", async () => {
  if (!currentUser) return;

  const newName = nameInput?.value?.trim();
  if (!newName) return;

  await updateDoc(doc(db, "users", currentUser.uid), {
    displayName: newName
  });

  if (profileStatus) profileStatus.textContent = "Guardado ✅";
});

// ================= AUTH =================

async function loginGoogle() {
  await signInWithPopup(auth, provider);
}

async function loginEmail() {
  const email = prompt("Email:");
  const pass = prompt("Contraseña:");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    await createUserWithEmailAndPassword(auth, email, pass);
  }
}

function logout() {
  signOut(auth);
}

// ================= SAVE =================

async function saveEntry() {
  const input = document.getElementById("entry");
  if (!input?.value.trim()) return;
  if (!currentUser) return;

  await addDoc(collection(db, "users", currentUser.uid, "entries"), {
    text: input.value,
    date: new Date().toLocaleString(),
    createdAt: Date.now()
  });

  input.value = "";
}

// ================= DELETE =================

async function deleteEntry(uid, id) {
  await deleteDoc(doc(db, "users", uid, "entries", id));
}

// ================= EDIT =================

async function editEntry(uid, id, oldText) {
  const newText = prompt("Editar entrada:", oldText);
  if (!newText?.trim()) return;

  await updateDoc(doc(db, "users", uid, "entries", id), {
    text: newText,
    editedAt: Date.now()
  });
}

window.deleteEntry = deleteEntry;
window.editEntry = editEntry;
