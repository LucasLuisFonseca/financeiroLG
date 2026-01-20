// Verificar se já está logado
const token = localStorage.getItem("token");
if (token) {
  window.location.href = "dashboard.html";
}

// Elementos DOM
const authForm = document.getElementById("authForm");
const toggleMode = document.getElementById("toggleMode");
const toggleText = document.getElementById("toggleText");
const toggleTextAction = document.getElementById("toggleTextAction");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const nameGroup = document.getElementById("nameGroup");
const nameInput = document.getElementById("name");
const rememberGroup = document.getElementById("rememberGroup");
const submitBtn = document.getElementById("submitBtn");
const submitText = document.getElementById("submitText");
const themeToggle = document.getElementById("themeToggle");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.querySelector(".toggle-password");

// Estado do formulário
let isLogin = true;

// Tema
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

themeToggle.onclick = () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.innerHTML = isDark 
    ? '<i class="fas fa-sun"></i>' 
    : '<i class="fas fa-moon"></i>';
};

// Alternar entre login e registro
toggleMode.addEventListener("click", () => {
  isLogin = !isLogin;
  
  // Mostrar/ocultar campos
  nameGroup.classList.toggle("hide", isLogin);
  rememberGroup.classList.toggle("hide", !isLogin);
  
  // Atualizar textos
  if (isLogin) {
    formTitle.textContent = "Bem-vindo";
    formSubtitle.textContent = "Entre na sua conta";
    toggleText.textContent = "Não tem uma conta?";
    toggleTextAction.textContent = "Criar conta";
    submitText.textContent = "Entrar";
  } else {
    formTitle.textContent = "Criar conta";
    formSubtitle.textContent = "Comece sua jornada financeira";
    toggleText.textContent = "Já tem uma conta?";
    toggleTextAction.textContent = "Fazer login";
    submitText.textContent = "Criar conta";
  }
  
  // Limpar formulário
  authForm.reset();
  clearMessages();
});

// Mostrar/ocultar senha
togglePasswordBtn.addEventListener("click", () => {
  const icon = togglePasswordBtn.querySelector("i");
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
});

// Login/Registro com Email/Senha
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Obter valores
  const name = nameInput.value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember")?.checked || false;
  
  // Validações básicas
  if (!email || !password) {
    showError("Preencha todos os campos");
    return;
  }
  
  if (!isLogin && !name) {
    showError("Digite seu nome");
    return;
  }
  
  if (password.length < 6) {
    showError("A senha deve ter pelo menos 6 caracteres");
    return;
  }
  
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Digite um email válido");
    return;
  }
  
  // Mostrar loading
  const originalText = submitText.textContent;
  const originalBg = submitBtn.style.background;
  submitText.textContent = "Processando...";
  submitBtn.disabled = true;
  
  try {
    const endpoint = isLogin ? "/login" : "/register";
    const data = {
      email,
      password
    };
    
    if (!isLogin) {
      data.name = name;
    }
    
    const response = await fetch("https://financeirolg.onrender.com" + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Erro ao autenticar");
    }
    
    // Salvar token
    localStorage.setItem("token", result.token);
    
    // Salvar lembrar-me
    if (remember && result.user) {
      localStorage.setItem("user", JSON.stringify(result.user));
    }
    
    // Feedback visual de sucesso
    submitBtn.style.background = "var(--success)";
    submitText.textContent = isLogin ? "Login realizado!" : "Conta criada!";
    
    // Redirecionar após breve delay
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
    
  } catch (error) {
    console.error("Erro:", error);
    
    // Mapear erros comuns
    let errorMessage = error.message;
    if (error.message.includes("email already exists") || error.message.includes("já existe")) {
      errorMessage = "Este email já está registrado";
    } else if (error.message.includes("invalid credentials") || error.message.includes("credenciais")) {
      errorMessage = "Email ou senha incorretos";
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      errorMessage = "Erro de conexão. Verifique sua internet.";
    }
    
    showError(errorMessage);
    
    // Restaurar botão
    submitText.textContent = originalText;
    submitBtn.disabled = false;
    submitBtn.style.background = originalBg;
  }
});

// Funções auxiliares
function showMessage(message, type = "info") {
  clearMessages();
  
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  
  let icon = 'info-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'success') icon = 'check-circle';
  
  messageEl.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  authForm.insertBefore(messageEl, authForm.firstChild);
  
  if (type !== 'info') {
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }
  
  return messageEl;
}

function showError(message) {
  showMessage(message, "error");
}

function showSuccess(message) {
  showMessage(message, "success");
}

function clearMessages() {
  document.querySelectorAll(".message").forEach(msg => msg.remove());
}

// Preencher email salvo
function loadSavedEmail() {
  const savedUser = localStorage.getItem("user");
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      if (user.email) {
        document.getElementById("email").value = user.email;
        const rememberCheckbox = document.getElementById("remember");
        if (rememberCheckbox) {
          rememberCheckbox.checked = true;
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadSavedEmail();
});