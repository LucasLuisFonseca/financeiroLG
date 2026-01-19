const form = document.getElementById("authForm");
const toggle = document.getElementById("toggleMode");
const nameInput = document.getElementById("name");

let isLogin = true;

toggle.addEventListener("click", () => {
  isLogin = !isLogin;
  nameInput.classList.toggle("hide");
  toggle.innerText = isLogin ? "Criar conta" : "Já tenho conta";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!isLogin && name.trim() === "") {
    alert("Preencha seu nome");
    return;
  }

  const endpoint = isLogin ? "/login" : "/register";

  fetch("http://localhost:3000" + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(data.error);
      return;
    }

    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  })
  .catch(() => {
    alert("Erro ao conectar com o servidor");
  });
});
