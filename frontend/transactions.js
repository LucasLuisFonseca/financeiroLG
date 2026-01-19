const token = localStorage.getItem("token");
if (!token) location.href = "index.html";

document.getElementById("logout").onclick = () => {
  localStorage.removeItem("token");
  location.href = "index.html";
};

const form = document.getElementById("transactionForm");
const list = document.getElementById("list");

// salvar
form.onsubmit = e => {
  e.preventDefault();

  const data = {
    type: type.value,
    category: category.value,
    value: parseFloat(value.value),
    date: date.value,
    description: description.value
  };

  fetch("https://financeirolg.onrender.com/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(data)
  })
  .then(() => {
    form.reset();
    load();
  });
};

// listar
function load() {
  fetch("https://financeirolg.onrender.com/transactions", {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(data => {
    list.innerHTML = "";

    data.forEach(t => {
      list.innerHTML += `
        <li>
          <span class="${t.type}">
            ${t.category} - ${format(t.value)}
          </span>
          <span class="delete" onclick="remove(${t.id})">🗑</span>
        </li>
      `;
    });
  });
}

// remover (precisa rota, te passo abaixo)
function remove(id) {
  fetch(`https://financeirolg.onrender.com/transactions/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  })
  .then(load);
}

function format(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

load();
