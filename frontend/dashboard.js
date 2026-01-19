// proteção
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "index.html";
}

// modo escuro
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("dark");
};

// logout
document.getElementById("logout").onclick = () => {
  localStorage.removeItem("token");
  window.location.href = "index.html";
};

// elementos
const balanceEl = document.getElementById("balance");
const incomeEl = document.querySelector(".income");
const expenseEl = document.querySelector(".expense");

// buscar transações reais
fetch("https://financeirolg.onrender.com/transactions", {
  headers: {
    Authorization: "Bearer " + token
  }
})
.then(res => res.json())
.then(transactions => {
  let income = 0;
  let expense = 0;
  const categories = {};

  transactions.forEach(t => {
    if (t.type === "receita") income += t.value;
    else expense += t.value;

    if (t.type === "despesa") {
      categories[t.category] = (categories[t.category] || 0) + t.value;
    }
  });

  const balance = income - expense;

  balanceEl.innerText = format(balance);
  incomeEl.innerText = format(income);
  expenseEl.innerText = format(expense);

  renderCharts(income, expense, categories);
});

// buscar metas reais
fetch("https://financeirolg.onrender.com/goals", {
  headers: {
    Authorization: "Bearer " + token
  }
})
.then(res => res.json())
.then(goals => {
  const goalsContainer = document.querySelector(".goals");
  goals.forEach(goal => {
    const percent = Math.min((goal.current / goal.target) * 100, 100);

    goalsContainer.innerHTML += `
      <div class="goal">
        <span>${goal.title}</span>
        <div class="progress">
          <div style="width:${percent}%"></div>
        </div>
        <small>${format(goal.current)} / ${format(goal.target)}</small>
      </div>
    `;
  });
});

// gráficos
function renderCharts(income, expense, categories) {
  new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: ["Receitas", "Despesas"],
      datasets: [{
        data: [income, expense]
      }]
    }
  });

  new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories)
      }]
    }
  });
}

// formatador
function format(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
