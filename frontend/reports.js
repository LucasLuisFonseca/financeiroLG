const token = localStorage.getItem("token");
if (!token) location.href = "index.html";

document.getElementById("logout").onclick = () => {
  localStorage.removeItem("token");
  location.href = "index.html";
};

// preencher anos
const yearSelect = document.getElementById("year");
const currentYear = new Date().getFullYear();

for (let y = currentYear; y >= currentYear - 5; y--) {
  yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
}

// default mês atual
document.getElementById("month").value = new Date().getMonth();

let chart;

// filtrar
document.getElementById("filter").onclick = load;

function load() {
  fetch("https://financeirolg.onrender.com/transactions", {
    headers: { Authorization: "Bearer " + token }
  })
  .then(res => res.json())
  .then(data => {
    const month = parseInt(document.getElementById("month").value);
    const year = parseInt(yearSelect.value);

    let income = 0;
    let expense = 0;
    const days = {};

    data.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        if (t.type === "receita") income += t.value;
        else expense += t.value;

        const day = d.getDate();
        days[day] = (days[day] || 0) + (t.type === "receita" ? t.value : -t.value);
      }
    });

    document.getElementById("income").innerText = format(income);
    document.getElementById("expense").innerText = format(expense);
    document.getElementById("balance").innerText = format(income - expense);

    renderChart(days);
  });
}

function renderChart(days) {
  const labels = Object.keys(days).sort((a,b) => a - b);
  const values = labels.map(d => days[d]);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("reportChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Saldo diário",
        data: values,
        tension: 0.3
      }]
    }
  });
}

function format(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

load();
