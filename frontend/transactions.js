// Verificação de autenticação
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "index.html";
}

// Tema - Mesma função do dashboard
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

// Menu - Mesma função do dashboard
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

// Elementos DOM
const transactionsContainer = document.getElementById('transactionsContainer');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const monthBalanceEl = document.getElementById('monthBalance');
const transactionsCountEl = document.getElementById('transactionsCount');
const filterToggle = document.getElementById('filterToggle');
const filtersContainer = document.getElementById('filtersContainer');

// Filtros atuais
let currentFilters = {
  type: 'all',
  category: 'all',
  period: 'month',
  sort: 'date_desc'
};

// Alternar visibilidade dos filtros
filterToggle.addEventListener('click', () => {
  filtersContainer.classList.toggle('show');
  filterToggle.classList.toggle('active');
});

// Seleção de tipo (botões)
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('type').value = this.dataset.type;
  });
});

// Carregar transações
async function loadTransactions() {
  try {
    const response = await fetch("https://financeirolg.onrender.com/transactions", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar transações');
    
    const transactions = await response.json();
    updateStats(transactions);
    applyFiltersToTransactions(transactions);
    
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao carregar transações');
  }
}

// Atualizar estatísticas
function updateStats(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    
    if (transaction.type === "receita") {
      totalIncome += transaction.value;
      if (transactionDate.getMonth() === currentMonth && 
          transactionDate.getFullYear() === currentYear) {
        monthIncome += transaction.value;
      }
    } else {
      totalExpense += transaction.value;
      if (transactionDate.getMonth() === currentMonth && 
          transactionDate.getFullYear() === currentYear) {
        monthExpense += transaction.value;
      }
    }
  });

  const monthBalance = monthIncome - monthExpense;

  totalIncomeEl.textContent = format(totalIncome);
  totalExpenseEl.textContent = format(totalExpense);
  monthBalanceEl.textContent = format(monthBalance);
  
  // Cor do saldo do mês
  if (monthBalance >= 0) {
    monthBalanceEl.style.color = 'var(--success)';
  } else {
    monthBalanceEl.style.color = 'var(--danger)';
  }
}

// Aplicar filtros às transações
function applyFiltersToTransactions(transactions) {
  let filtered = [...transactions];
  
  // Filtrar por tipo
  if (currentFilters.type !== 'all') {
    filtered = filtered.filter(t => t.type === currentFilters.type);
  }
  
  // Filtrar por categoria
  if (currentFilters.category !== 'all') {
    filtered = filtered.filter(t => t.category === currentFilters.category);
  }
  
  // Filtrar por período
  if (currentFilters.period !== 'all') {
    const now = new Date();
    let startDate;
    
    switch(currentFilters.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate;
    });
  }
  
  // Ordenar
  filtered.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    switch(currentFilters.sort) {
      case 'date_desc':
        return dateB - dateA;
      case 'date_asc':
        return dateA - dateB;
      case 'value_desc':
        return b.value - a.value;
      case 'value_asc':
        return a.value - b.value;
      default:
        return dateB - dateA;
    }
  });
  
  renderTransactions(filtered);
}

// Renderizar transações
function renderTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exchange-alt"></i>
        <h3>Nenhuma transação encontrada</h3>
        <p>Tente mudar os filtros</p>
      </div>
    `;
    transactionsCountEl.textContent = '0 transações';
    return;
  }

  transactionsCountEl.textContent = `${transactions.length} transações`;
  
  transactionsContainer.innerHTML = transactions.map(transaction => {
    const isReceita = transaction.type === 'receita';
    const iconClass = isReceita ? 'receita' : 'despesa';
    const amountClass = isReceita ? 'receita' : 'despesa';
    
    return `
      <div class="transaction-item" data-id="${transaction.id}">
        <div class="transaction-icon ${iconClass}">
          <i class="fas fa-${isReceita ? 'arrow-down' : 'arrow-up'}"></i>
        </div>
        
        <div class="transaction-details">
          <div class="transaction-header">
            <div class="transaction-title">${transaction.category}</div>
            <div class="transaction-amount ${amountClass}">
              ${isReceita ? '+' : '-'} ${format(transaction.value)}
            </div>
          </div>
          
          <div class="transaction-meta">
            <span class="transaction-date">
              <i class="far fa-calendar"></i>
              ${new Date(transaction.date).toLocaleDateString('pt-BR')}
            </span>
            <span class="transaction-type">
              ${isReceita ? 'Receita' : 'Despesa'}
            </span>
          </div>
          
          ${transaction.description ? `
            <div class="transaction-description">
              ${transaction.description}
            </div>
          ` : ''}
        </div>
        
        <div class="transaction-actions">
          <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Criar nova transação
document.getElementById('transactionForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const type = document.getElementById('type');
  const category = document.getElementById('category');
  const value = document.getElementById('value');
  const date = document.getElementById('date');
  const description = document.getElementById('description');
  
  if (!category.value || !value.value || !date.value) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  try {
    const response = await fetch("https://financeirolg.onrender.com/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        type: type.value,
        category: category.value,
        value: parseFloat(value.value),
        date: date.value,
        description: description.value
      })
    });

    if (!response.ok) throw new Error('Erro ao criar transação');

    // Limpar formulário
    category.value = '';
    value.value = '';
    description.value = '';
    date.value = new Date().toISOString().split('T')[0];
    
    // Recarregar transações
    await loadTransactions();
    
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao criar transação');
  }
};

// Deletar transação
async function deleteTransaction(id) {
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

  try {
    const response = await fetch(`https://financeirolg.onrender.com/transactions/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (!response.ok) throw new Error('Erro ao excluir transação');

    await loadTransactions();
    
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao excluir transação');
  }
}

// Aplicar filtros
function applyFilters() {
  currentFilters = {
    type: document.getElementById('filterType').value,
    category: document.getElementById('filterCategory').value,
    period: document.getElementById('filterPeriod').value,
    sort: document.getElementById('filterSort').value
  };
  
  loadTransactions();
  filtersContainer.classList.remove('show');
}

// Limpar filtros
function clearFilters() {
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterPeriod').value = 'month';
  document.getElementById('filterSort').value = 'date_desc';
  
  applyFilters();
}

// Mostrar erro
function showError(message) {
  transactionsContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar</h3>
      <p>${message}</p>
      <button onclick="loadTransactions()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
        Tentar novamente
      </button>
    </div>
  `;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  updateDate();
  loadTransactions();
  
  // Definir data padrão como hoje
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  
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