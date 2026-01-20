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

// Menu - Mesma função do dashboard
function initMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  
  if (menuToggle && sidebar && overlay) {
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
  }
}

// Logout
function initLogout() {
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("token");
      localStorage.removeItem('theme');
      window.location.href = "index.html";
    };
  }
}

// Data atual
function updateDate() {
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = date.toLocaleDateString('pt-BR', options);
  }
}

// Formatar moeda
function format(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Formatar número
function formatNumber(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Elementos DOM e variáveis globais
let monthSelect, yearSelect, periodDisplay;
let trendChart, categoryChart, comparisonChart;

// Preencher anos
function populateYears() {
  yearSelect = document.getElementById('year');
  if (!yearSelect) return;
  
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  
  for (let y = currentYear; y >= currentYear - 5; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
}

// Definir mês atual como padrão
function setCurrentMonth() {
  monthSelect = document.getElementById('month');
  if (!monthSelect) return;
  
  const currentMonth = new Date().getMonth();
  monthSelect.value = currentMonth;
}

// Obter dados comparativos dos últimos 6 meses
async function getComparativeData(selectedMonth, selectedYear) {
  try {
    const response = await fetch("https://financeirolg.onrender.com/transactions", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar transações');
    
    const transactions = await response.json();
    const monthsData = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Pegar dados dos últimos 6 meses (incluindo o atual)
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = monthNames[month];
      
      // Filtrar transações do mês
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === month && 
               transactionDate.getFullYear() === year;
      });
      
      // Calcular receitas e despesas
      let income = 0;
      let expense = 0;
      
      monthTransactions.forEach(t => {
        if (t.type === "receita") {
          income += t.value;
        } else {
          expense += t.value;
        }
      });
      
      monthsData.push({
        label: `${monthName}/${year.toString().slice(-2)}`,
        monthIndex: i,
        income,
        expense,
        balance: income - expense,
        total: monthTransactions.length
      });
    }
    
    return monthsData;
    
  } catch (error) {
    console.error('Erro ao carregar dados comparativos:', error);
    return [];
  }
}

// Carregar relatório
async function loadReport() {
  const reportType = document.getElementById('reportType')?.value || 'monthly';
  const month = parseInt(monthSelect?.value || new Date().getMonth());
  const year = parseInt(yearSelect?.value || new Date().getFullYear());
  const chartType = document.getElementById('chartType')?.value || 'line';
  
  try {
    const response = await fetch("https://financeirolg.onrender.com/transactions", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar transações');
    
    const transactions = await response.json();
    
    // Carregar dados comparativos
    const comparativeData = await getComparativeData(month, year);
    
    // Atualizar display do período
    periodDisplay = document.getElementById('periodDisplay');
    if (periodDisplay) {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      periodDisplay.innerHTML = `
        <i class="far fa-calendar-alt"></i>
        <span>${monthNames[month]} de ${year}</span>
      `;
    }
    
    // Processar dados
    processReportData(transactions, month, year, reportType, chartType, comparativeData);
    
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao carregar relatório');
  }
}

// Processar dados do relatório
function processReportData(transactions, month, year, reportType, chartType, comparativeData) {
  // Filtrar transações do mês/ano selecionado
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  
  // Calcular totais
  let income = 0;
  let expense = 0;
  const categories = {};
  const dailyData = {};
  
  monthlyTransactions.forEach(t => {
    const day = new Date(t.date).getDate();
    
    if (t.type === "receita") {
      income += t.value;
      dailyData[day] = (dailyData[day] || 0) + t.value;
    } else {
      expense += t.value;
      dailyData[day] = (dailyData[day] || 0) - t.value;
      categories[t.category] = (categories[t.category] || 0) + t.value;
    }
  });
  
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  
  // Calcular variação percentual vs mês anterior
  let incomeChange = 0;
  let expenseChange = 0;
  
  if (comparativeData.length >= 2) {
    const currentMonthData = comparativeData[5]; // Último mês (atual)
    const previousMonthData = comparativeData[4]; // Penúltimo mês
    
    if (previousMonthData.income > 0) {
      incomeChange = ((currentMonthData.income - previousMonthData.income) / previousMonthData.income) * 100;
    }
    
    if (previousMonthData.expense > 0) {
      expenseChange = ((currentMonthData.expense - previousMonthData.expense) / previousMonthData.expense) * 100;
    }
  }
  
  // Atualizar resumo
  updateSummary(income, expense, balance, savingsRate, incomeChange, expenseChange);
  
  // Atualizar gráficos
  updateCharts(dailyData, categories, comparativeData, chartType);
  
  // Atualizar tabela
  updateTransactionsTable(monthlyTransactions);
}

// Atualizar resumo com variações
function updateSummary(income, expense, balance, savingsRate, incomeChange, expenseChange) {
  const incomeEl = document.getElementById('income');
  const expenseEl = document.getElementById('expense');
  const balanceEl = document.getElementById('balance');
  const savingsRateEl = document.getElementById('savingsRate');
  
  if (incomeEl) incomeEl.textContent = format(income);
  if (expenseEl) expenseEl.textContent = format(expense);
  if (balanceEl) balanceEl.textContent = format(balance);
  if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;
  
  // Atualizar variações
  const incomeChangeEl = document.getElementById('incomeChange');
  const expenseChangeEl = document.getElementById('expenseChange');
  
  if (incomeChangeEl) incomeChangeEl.textContent = `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%`;
  if (expenseChangeEl) expenseChangeEl.textContent = `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}%`;
  
  // Cor do saldo
  const balanceChangeEl = document.getElementById('balanceChange');
  
  if (balanceEl) {
    if (balance >= 0) {
      balanceEl.style.color = 'var(--success)';
      if (balanceChangeEl) {
        balanceChangeEl.className = 'card-change positive';
        balanceChangeEl.innerHTML = `
          <i class="fas fa-arrow-up"></i>
          <span>Positivo</span>
        `;
      }
    } else {
      balanceEl.style.color = 'var(--danger)';
      if (balanceChangeEl) {
        balanceChangeEl.className = 'card-change negative';
        balanceChangeEl.innerHTML = `
          <i class="fas fa-arrow-down"></i>
          <span>Negativo</span>
        `;
      }
    }
  }
  
  // Cor da taxa de economia
  const savingsChangeEl = document.getElementById('savingsChange');
  
  if (savingsRateEl) {
    if (savingsRate >= 20) {
      savingsRateEl.style.color = 'var(--success)';
      if (savingsChangeEl) savingsChangeEl.className = 'card-change positive';
    } else if (savingsRate >= 10) {
      savingsRateEl.style.color = 'var(--warning)';
      if (savingsChangeEl) savingsChangeEl.className = 'card-change';
    } else {
      savingsRateEl.style.color = 'var(--danger)';
      if (savingsChangeEl) savingsChangeEl.className = 'card-change negative';
    }
  }
  
  // Cor das variações
  if (incomeChangeEl) {
    const incomeChangeParent = incomeChangeEl.parentElement;
    if (incomeChangeParent) {
      incomeChangeParent.className = incomeChange >= 0 ? 'card-change positive' : 'card-change negative';
    }
  }
  
  if (expenseChangeEl) {
    const expenseChangeParent = expenseChangeEl.parentElement;
    if (expenseChangeParent) {
      expenseChangeParent.className = expenseChange <= 0 ? 'card-change positive' : 'card-change negative';
    }
  }
}

// Inicializar gráficos
function initCharts() {
  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
  const comparisonCtx = document.getElementById('comparisonChart')?.getContext('2d');
  
  if (trendCtx) {
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Saldo Diário',
          data: [],
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#1e40af',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Saldo: ${format(context.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { 
              color: 'rgba(255, 255, 255, 0.1)',
              borderDash: [5, 5]
            },
            ticks: {
              callback: (value) => 'R$ ' + formatNumber(value)
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 10
            }
          }
        }
      }
    });
  }
  
  if (categoryCtx) {
    categoryChart = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
            '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
            '#059669', '#10b981', '#34d399', '#6ee7b7'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
              font: { size: 12 },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${format(context.raw)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  if (comparisonCtx) {
    comparisonChart = new Chart(comparisonCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Receitas',
            data: [],
            backgroundColor: '#059669',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Despesas',
            data: [],
            backgroundColor: '#dc2626',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${format(context.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { 
              color: 'rgba(255, 255, 255, 0.1)',
              borderDash: [5, 5]
            },
            ticks: {
              callback: (value) => 'R$ ' + formatNumber(value)
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
  
  // Configurar eventos dos botões de gráfico
  document.querySelectorAll('.chart-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.chart-option').forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// Atualizar gráficos
function updateCharts(dailyData, categories, comparativeData, chartType) {
  // Gráfico de tendência
  const days = Object.keys(dailyData).sort((a, b) => a - b);
  const dailyValues = days.map(d => dailyData[d]);
  const cumulativeValues = [];
  let cumulative = 0;
  
  dailyValues.forEach(value => {
    cumulative += value;
    cumulativeValues.push(cumulative);
  });
  
  const hasTrendData = days.length > 0;
  const trendChartEmpty = document.getElementById('trendChartEmpty');
  if (trendChartEmpty) {
    trendChartEmpty.style.display = hasTrendData ? 'none' : 'flex';
  }
  
  if (trendChart && hasTrendData) {
    const activeType = document.querySelector('.chart-option.active')?.dataset.type || 'daily';
    
    if (activeType === 'daily') {
      trendChart.data.labels = days.map(d => `${d}`);
      trendChart.data.datasets[0].data = dailyValues;
      trendChart.data.datasets[0].label = 'Saldo Diário';
    } else if (activeType === 'cumulative') {
      trendChart.data.labels = days.map(d => `${d}`);
      trendChart.data.datasets[0].data = cumulativeValues;
      trendChart.data.datasets[0].label = 'Saldo Acumulado';
    }
    trendChart.update();
  }
  
  // Gráfico de categorias
  const hasCategoryData = Object.keys(categories).length > 0;
  const categoryChartEmpty = document.getElementById('categoryChartEmpty');
  if (categoryChartEmpty) {
    categoryChartEmpty.style.display = hasCategoryData ? 'none' : 'flex';
  }
  
  if (categoryChart && hasCategoryData) {
    // Ordenar categorias por valor (maior para menor)
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
      }, {});
    
    categoryChart.data.labels = Object.keys(sortedCategories);
    categoryChart.data.datasets[0].data = Object.values(sortedCategories);
    categoryChart.update();
  }
  
  // Gráfico comparativo mensal
  const hasComparisonData = comparativeData && comparativeData.length > 0;
  const comparisonChartEmpty = document.getElementById('comparisonChartEmpty');
  if (comparisonChartEmpty) {
    comparisonChartEmpty.style.display = hasComparisonData ? 'none' : 'flex';
  }
  
  if (comparisonChart && hasComparisonData) {
    const labels = comparativeData.map(data => data.label);
    const incomes = comparativeData.map(data => data.income);
    const expenses = comparativeData.map(data => data.expense);
    
    comparisonChart.data.labels = labels;
    comparisonChart.data.datasets[0].data = incomes;
    comparisonChart.data.datasets[1].data = expenses;
    comparisonChart.update();
  }
}

// Atualizar tabela de transações
function updateTransactionsTable(transactions) {
  const tbody = document.getElementById('transactionsBody');
  if (!tbody) return;
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="table-empty">
            <i class="fas fa-exchange-alt"></i>
            <p>Nenhuma transação no período selecionado</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Ordenar por data (mais recente primeiro)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  tbody.innerHTML = transactions.map(t => {
    const date = new Date(t.date);
    const isIncome = t.type === 'receita';
    const rowClass = isIncome ? 'income-row' : 'expense-row';
    const typeText = isIncome ? 'Receita' : 'Despesa';
    
    return `
      <tr class="${rowClass}">
        <td>${date.toLocaleDateString('pt-BR')}</td>
        <td>
          <span style="display: inline-block; padding: 4px 12px; background: ${isIncome ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'}; color: ${isIncome ? 'var(--success)' : 'var(--danger)'}; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${typeText}
          </span>
        </td>
        <td>${t.category}</td>
        <td>${t.description || '-'}</td>
        <td>
          <span style="font-weight: 600; color: ${isIncome ? 'var(--success)' : 'var(--danger)'}">
            ${isIncome ? '+' : '-'} ${format(t.value)}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Carregar biblioteca jsPDF dinamicamente
async function loadPDFLibrary() {
  return new Promise((resolve, reject) => {
    // Verificar se jsPDF já está carregado
    if (typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined') {
      resolve();
      return;
    }
    
    // Carregar jsPDF
    const script1 = document.createElement('script');
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script1.onload = () => {
      // Carregar autoTable
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
      script2.onload = resolve;
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

// Exportar relatório PDF
async function exportReport() {
  try {
    // Carregar biblioteca se necessário
    await loadPDFLibrary();
    
    // Verificar se jsPDF está disponível
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      throw new Error('Biblioteca jsPDF não carregada');
    }
    
    const jsPDF = window.jspdf.jsPDF || window.jsPDF;
    
    // Criar documento
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Configurações
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Financeiro - L & G Finanças', margin, margin + 10);
    
    // Período
    const month = parseInt(monthSelect?.value || new Date().getMonth());
    const year = parseInt(yearSelect?.value || new Date().getFullYear());
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${monthNames[month]} de ${year}`, margin, margin + 20);
    doc.text(`Data do relatório: ${new Date().toLocaleDateString('pt-BR')}`, margin, margin + 27);
    
    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, margin + 33, pageWidth - margin, margin + 33);
    
    // Resumo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', margin, margin + 45);
    
    // Dados do resumo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryY = margin + 55;
    const summaryData = [
      ['Receitas', document.getElementById('income')?.textContent || 'R$ 0,00'],
      ['Despesas', document.getElementById('expense')?.textContent || 'R$ 0,00'],
      ['Saldo', document.getElementById('balance')?.textContent || 'R$ 0,00'],
      ['Taxa de Economia', document.getElementById('savingsRate')?.textContent || '0%']
    ];
    
    summaryData.forEach(([label, value], index) => {
      doc.text(label + ':', margin, summaryY + (index * 8));
      doc.text(value, margin + 60, summaryY + (index * 8));
    });
    
    // Carregar transações para a tabela
    const transactions = await getMonthlyTransactions();
    
    // Adicionar página para tabela se necessário
    let yPosition = summaryY + 40;
    if (yPosition > 180 && transactions.length > 0) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Tabela de transações
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Transações do Período', margin, yPosition);
    
    if (transactions.length > 0) {
      const tableHeaders = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']];
      const tableData = transactions.map(t => {
        const date = new Date(t.date);
        return [
          date.toLocaleDateString('pt-BR'),
          t.type === 'receita' ? 'Receita' : 'Despesa',
          t.category,
          t.description || '-',
          `${t.type === 'receita' ? '+' : '-'} ${format(t.value)}`
        ];
      });
      
      // Adicionar totais
      const totalIncome = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.value, 0);
      const totalExpense = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.value, 0);
      const balance = totalIncome - totalExpense;
      
      tableData.push(['', '', '', '', '']);
      tableData.push(['', '', '', 'TOTAL RECEITAS:', format(totalIncome)]);
      tableData.push(['', '', '', 'TOTAL DESPESAS:', format(totalExpense)]);
      tableData.push(['', '', '', 'SALDO FINAL:', format(balance)]);
      
      // Usar autoTable se disponível
      if (typeof doc.autoTable !== 'undefined') {
        doc.autoTable({
          startY: yPosition + 10,
          head: tableHeaders,
          body: tableData,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [30, 64, 175],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
      } else {
        // Fallback: tabela simples
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let tableY = yPosition + 15;
        
        // Cabeçalhos
        tableHeaders[0].forEach((header, i) => {
          doc.text(header, margin + (i * 35), tableY);
        });
        
        tableY += 5;
        
        // Dados
        tableData.forEach((row, rowIndex) => {
          row.forEach((cell, i) => {
            doc.text(cell, margin + (i * 35), tableY);
          });
          tableY += 5;
        });
      }
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhuma transação no período selecionado', margin, yPosition + 20);
    }
    
    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} • Gerado por L & G Finanças • ${new Date().toLocaleDateString('pt-BR')}`,
        margin,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Salvar PDF
    const fileName = `relatorio-financeiro-${monthNames[month].toLowerCase()}-${year}.pdf`;
    doc.save(fileName);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF. ' + error.message);
  }
}

// Obter transações do mês atual
async function getMonthlyTransactions() {
  try {
    const month = parseInt(monthSelect?.value || new Date().getMonth());
    const year = parseInt(yearSelect?.value || new Date().getFullYear());
    
    const response = await fetch("https://financeirolg.onrender.com/transactions", {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar transações');
    
    const transactions = await response.json();
    
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return [];
  }
}

// Exportar CSV
async function exportCSV() {
  try {
    const transactions = await getMonthlyTransactions();
    
    if (transactions.length === 0) {
      alert('Nenhuma transação para exportar');
      return;
    }
    
    // Cabeçalhos do CSV
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
    
    // Dados formatados
    const csvData = transactions.map(t => {
      const date = new Date(t.date);
      return [
        date.toLocaleDateString('pt-BR'),
        t.type === 'receita' ? 'Receita' : 'Despesa',
        `"${t.category}"`,
        `"${t.description || ''}"`,
        t.value.toFixed(2).replace('.', ',')
      ];
    });
    
    // Adicionar linha de total
    const totalIncome = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.value, 0);
    const totalExpense = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.value, 0);
    const balance = totalIncome - totalExpense;
    
    csvData.push([]);
    csvData.push(['', '', '', 'TOTAL RECEITAS:', totalIncome.toFixed(2).replace('.', ',')]);
    csvData.push(['', '', '', 'TOTAL DESPESAS:', totalExpense.toFixed(2).replace('.', ',')]);
    csvData.push(['', '', '', 'SALDO FINAL:', balance.toFixed(2).replace('.', ',')]);
    
    // Criar conteúdo CSV
    const csvContent = [
      headers.join(';'),
      ...csvData.map(row => row.join(';'))
    ].join('\n');
    
    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    alert('Erro ao exportar CSV');
  }
}

// Mostrar erro
function showError(message) {
  const container = document.querySelector('.transactions-container');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro ao carregar</h3>
        <p>${message}</p>
        <button onclick="loadReport()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Tentar novamente
        </button>
      </div>
    `;
  }
}

// Inicializar eventos
function initEvents() {
  // Tema toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.onclick = () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      themeToggle.innerHTML = isDark 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
    };
  }
  
  // Botão gerar relatório
  const generateBtn = document.getElementById('filter');
  if (generateBtn) {
    generateBtn.addEventListener('click', loadReport);
  }
  
  // Botão exportar PDF
  const exportPdfBtn = document.querySelector('.export-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportReport);
  }
  
  // Botão exportar CSV
  const exportCsvBtn = document.querySelector('[onclick*="exportCSV"]');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportCSV);
  }
  
  // Botão limpar filtros
  const clearFiltersBtn = document.querySelector('[onclick*="clearFilters"]');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Implementar lógica de limpar filtros se necessário
      loadReport();
    });
  }
}

// Inicializar aplicação
function initApp() {
  loadTheme();
  updateDate();
  initMenu();
  initLogout();
  populateYears();
  setCurrentMonth();
  initCharts();
  initEvents();
  
  // Carregar relatório inicial após um pequeno delay
  setTimeout(() => {
    loadReport();
  }, 100);
  
  // Atualizar data a cada minuto
  setInterval(updateDate, 60000);
}

// Iniciar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initApp);
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