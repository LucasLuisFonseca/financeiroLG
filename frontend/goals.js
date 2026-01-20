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
const goalsContainer = document.getElementById('goalsContainer');
const totalGoalsEl = document.getElementById('totalGoals');
const totalSavedEl = document.getElementById('totalSaved');
const completedGoalsEl = document.getElementById('completedGoals');
const filterStatus = document.getElementById('filterStatus');

// Carregar metas
async function loadGoals() {
  try {
    const response = await fetch("https://financeirolg.onrender.com/goals", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar metas');
    
    const goals = await response.json();
    updateStats(goals);
    renderGoals(goals);
    
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao carregar metas');
  }
}

// Atualizar estatísticas
function updateStats(goals) {
  let totalGoals = 0;
  let totalSaved = 0;
  let completed = 0;

  goals.forEach(goal => {
    totalGoals += goal.target;
    totalSaved += goal.current;
    if (goal.current >= goal.target) {
      completed++;
    }
  });

  totalGoalsEl.textContent = format(totalGoals);
  totalSavedEl.textContent = format(totalSaved);
  completedGoalsEl.textContent = completed;
}

// Renderizar metas
function renderGoals(goals) {
  if (!goals || goals.length === 0) {
    goalsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bullseye"></i>
        <h3>Nenhuma meta criada</h3>
        <p>Crie sua primeira meta para começar a economizar</p>
      </div>
    `;
    return;
  }

  // Filtrar metas
  const filter = filterStatus.value;
  let filteredGoals = goals;
  
  if (filter === 'active') {
    filteredGoals = goals.filter(g => g.current < g.target);
  } else if (filter === 'completed') {
    filteredGoals = goals.filter(g => g.current >= g.target);
  }

  if (filteredGoals.length === 0) {
    goalsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-filter"></i>
        <h3>Nenhuma meta encontrada</h3>
        <p>Tente mudar o filtro</p>
      </div>
    `;
    return;
  }

  // Renderizar metas
  goalsContainer.innerHTML = filteredGoals.map(goal => {
    const percent = Math.min((goal.current / goal.target) * 100, 100);
    const isCompleted = goal.current >= goal.target;
    const cardClass = isCompleted ? 'goal-card completed' : 'goal-card active';
    const progressClass = isCompleted ? 'progress-fill completed' : 'progress-fill';

    return `
      <div class="${cardClass}" data-id="${goal.id}">
        <button class="delete-btn" onclick="deleteGoal(${goal.id})">
          <i class="fas fa-trash"></i>
        </button>
        
        <div class="goal-header">
          <div>
            <div class="goal-title">${goal.title}</div>
            <span class="goal-category">${goal.category || 'Geral'}</span>
          </div>
        </div>

        <div class="goal-amounts">
          <div class="goal-current">${format(goal.current)}</div>
          <div class="goal-target">Meta: ${format(goal.target)}</div>
        </div>

        <div class="goal-progress">
          <div class="progress-bar">
            <div class="${progressClass}" style="width: ${percent}%"></div>
          </div>
          <div class="progress-info">
            <span>${percent.toFixed(1)}% concluído</span>
            <span>${format(goal.target - goal.current)} restante</span>
          </div>
        </div>

        ${!isCompleted ? `
          <div class="goal-actions">
            <input type="number" 
                   class="add-input" 
                   placeholder="Valor para adicionar" 
                   step="0.01"
                   min="0"
                   onkeydown="if(event.key === 'Enter') addToGoal(${goal.id}, this)">
            <button class="add-btn" onclick="addToGoal(${goal.id}, this.previousElementSibling)">
              Adicionar
            </button>
          </div>
        ` : `
          <div class="goal-completed">
            <div style="color: var(--success); font-weight: 500; text-align: center;">
              <i class="fas fa-check-circle"></i> Meta concluída!
            </div>
          </div>
        `}
      </div>
    `;
  }).join('');
}

// Criar nova meta
document.getElementById('goalForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('title');
  const target = document.getElementById('target');
  const category = document.getElementById('category');
  
  if (!title.value.trim() || !target.value) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  try {
    const response = await fetch("https://financeirolg.onrender.com/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        title: title.value,
        target: parseFloat(target.value),
        category: category.value
      })
    });

    if (!response.ok) throw new Error('Erro ao criar meta');

    // Limpar formulário
    title.value = '';
    target.value = '';
    
    // Recarregar metas
    await loadGoals();
    
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao criar meta');
  }
};

// Adicionar valor à meta
async function addToGoal(id, inputElement) {
  const value = parseFloat(inputElement.value);
  
  if (!value || value <= 0) {
    alert('Digite um valor válido');
    return;
  }

  try {
    const response = await fetch(`https://financeirolg.onrender.com/goals/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ value })
    });

    if (!response.ok) throw new Error('Erro ao adicionar valor');

    // Limpar input
    inputElement.value = '';
    
    // Recarregar metas
    await loadGoals();
    
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao adicionar valor');
  }
}

// Deletar meta
async function deleteGoal(id) {
  if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

  try {
    const response = await fetch(`https://financeirolg.onrender.com/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (!response.ok) throw new Error('Erro ao excluir meta');

    await loadGoals();
    
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao excluir meta');
  }
}

// Filtrar metas
filterStatus.addEventListener('change', async () => {
  try {
    const response = await fetch("https://financeirolg.onrender.com/goals", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar metas');
    
    const goals = await response.json();
    renderGoals(goals);
    
  } catch (error) {
    console.error('Erro:', error);
  }
});

// Mostrar erro
function showError(message) {
  goalsContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar</h3>
      <p>${message}</p>
      <button onclick="loadGoals()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
        Tentar novamente
      </button>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  updateDate();
  loadGoals();
  
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