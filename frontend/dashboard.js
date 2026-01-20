// Verificação de autenticação
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "index.html";
}

// Tema
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
  }
}

document.getElementById('themeToggle').onclick = () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').innerHTML = isDark 
    ? '<i class="fas fa-sun"></i>' 
    : '<i class="fas fa-moon"></i>';
};

// Menu
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

menuToggle.addEventListener('click', () => {
  sidebar.classList.add('active');
  overlay.classList.add('active');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
});

// Fechar menu ao clicar em link
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    }
  });
});

// Logout
document.getElementById('logout').onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem('theme');
  window.location.href = "index.html";
};

// Data atual
function updateDate() {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = date.toLocaleDateString('pt-BR', options);
}

// Formatar moeda
function format(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Gráficos
let barChart, pieChart;

function initCharts() {
  const barCtx = document.getElementById('barChart')?.getContext('2d');
  const pieCtx = document.getElementById('pieChart')?.getContext('2d');
  
  if (barCtx) {
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: '#1e40af' }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
  
  if (pieCtx) {
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: ['#1e40af', '#3b82f6', '#60a5fa'] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// Carregar dados
async function loadData() {
  try {
    const [transactionsRes, goalsRes] = await Promise.all([
      fetch("https://financeirolg.onrender.com/transactions", {
        headers: { Authorization: "Bearer " + token }
      }),
      fetch("https://financeirolg.onrender.com/goals", {
        headers: { Authorization: "Bearer " + token }
      })
    ]);

    const transactions = await transactionsRes.json();
    const goals = await goalsRes.json();

    updateDashboard(transactions);
    renderGoals(goals);
    renderTransactions(transactions);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

function updateDashboard(transactions) {
  let income = 0;
  let expense = 0;
  const categories = {};

  transactions.forEach(t => {
    if (t.type === "receita") {
      income += t.value;
    } else {
      expense += t.value;
      categories[t.category] = (categories[t.category] || 0) + t.value;
    }
  });

  const balance = income - expense;

  // Atualizar cards
  document.getElementById('balance').textContent = format(balance);
  document.querySelector('.income').textContent = format(income);
  document.querySelector('.expense').textContent = format(expense);

  // Atualizar gráficos
  updateCharts(income, expense, categories);
}

function updateCharts(income, expense, categories) {
  const hasData = income > 0 || expense > 0;
  const hasCategories = Object.keys(categories).length > 0;
  
  document.getElementById('barChartEmpty').style.display = hasData ? 'none' : 'flex';
  document.getElementById('pieChartEmpty').style.display = hasCategories ? 'none' : 'flex';
  
  if (barChart && hasData) {
    barChart.data.labels = ['Receitas', 'Despesas'];
    barChart.data.datasets[0].data = [income, expense];
    barChart.data.datasets[0].backgroundColor = ['#059669', '#dc2626'];
    barChart.update();
  }
  
  if (pieChart && hasCategories) {
    pieChart.data.labels = Object.keys(categories);
    pieChart.data.datasets[0].data = Object.values(categories);
    pieChart.update();
  }
}

function renderGoals(goals) {
  const container = document.getElementById('goalsContainer');
  
  if (!goals || goals.length === 0) return;
  
  container.innerHTML = goals.map(goal => {
    const percent = Math.min((goal.current / goal.target) * 100, 100);
    
    return `
      <div class="goal-item">
        <div class="goal-icon">
          <i class="fas fa-bullseye"></i>
        </div>
        <div class="goal-details">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
            <span>${Math.round(percent)}%</span>
          </div>
          <small>${format(goal.current)} / ${format(goal.target)}</small>
        </div>
      </div>
    `;
  }).join('');
}

function renderTransactions(transactions) {
  const container = document.getElementById('transactionsList');
  const recent = transactions.slice(0, 5);
  
  if (recent.length === 0) return;
  
  container.innerHTML = recent.map(t => {
    const isIncome = t.type === 'receita';
    
    return `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
            <i class="fas fa-${isIncome ? 'arrow-down' : 'arrow-up'}"></i>
          </div>
          <div class="transaction-details">
            <h4>${t.category}</h4>
            <p>${t.description || 'Sem descrição'}</p>
          </div>
        </div>
        <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
          ${isIncome ? '+' : '-'} ${format(t.value)}
        </div>
      </div>
    `;
  }).join('');
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  updateDate();
  initCharts();
  loadData();
  
  setInterval(updateDate, 60000);
});
// ===== MENU HAMBURGER FIX =====
class MenuManager {
  constructor() {
    this.menuToggle = document.getElementById('menuToggle');
    this.sidebar = document.getElementById('sidebar');
    this.overlay = document.getElementById('overlay');
    this.content = document.getElementById('content');
    this.closeMenu = document.getElementById('closeMenu');
    
    this.init();
  }

  init() {
    // Configurar event listeners
    this.setupEventListeners();
    
    // Configurar listener de redimensionamento
    this.setupResizeListener();
    
    // Fechar menu ao clicar em links
    this.setupNavLinks();
  }

  setupEventListeners() {
    // Botão hamburger
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => this.openMenu());
    }
    
    // Overlay
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeMenuHandler());
    }
    
    // Botão fechar (se existir)
    if (this.closeMenu) {
      this.closeMenu.addEventListener('click', () => this.closeMenuHandler());
    }
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMenuHandler();
      }
    });
  }

  setupNavLinks() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMenuHandler();
        }
      });
    });
  }

  openMenu() {
    if (this.sidebar) this.sidebar.classList.add('active');
    if (this.overlay) this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeMenuHandler() {
    if (this.sidebar) this.sidebar.classList.remove('active');
    if (this.overlay) this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Inicializar menu quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const menuManager = new MenuManager();
});