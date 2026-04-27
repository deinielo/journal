function saveEntry() {
  const text = document.getElementById("entry").value;

  if (!text.trim()) return;

  let entries = JSON.parse(localStorage.getItem("entries")) || [];

  const newEntry = {
    text: text,
    date: new Date().toLocaleString()
  };

  entries.unshift(newEntry);

  localStorage.setItem("entries", JSON.stringify(entries));

  document.getElementById("entry").value = "";

  renderEntries();
}

function renderEntries() {
  let entries = JSON.parse(localStorage.getItem("entries")) || [];

  const container = document.getElementById("entries");
  container.innerHTML = "";

  entries.forEach(e => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `<small>${e.date}</small><br>${e.text}`;
    container.appendChild(div);
  });
}

function clearEntries() {
  localStorage.removeItem("entries");
  renderEntries();
}

renderEntries();