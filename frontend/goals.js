const token = localStorage.getItem("token");
if (!token) location.href = "index.html";

document.getElementById("logout").onclick = () => {
  localStorage.removeItem("token");
  location.href = "index.html";
};

const goalsEl = document.getElementById("goals");
const form = document.getElementById("goalForm");

// criar meta
form.onsubmit = e => {
  e.preventDefault();
  fetch("http://localhost:3000/goals", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer "+token
    },
    body:JSON.stringify({
      title: title.value,
      target: parseFloat(target.value)
    })
  }).then(() => {
    form.reset();
    load();
  });
};

// listar metas
function load(){
  fetch("http://localhost:3000/goals", {
    headers:{ Authorization:"Bearer "+token }
  })
  .then(r=>r.json())
  .then(goals=>{
    goalsEl.innerHTML="";
    goals.forEach(g=>{
      const pct = Math.min((g.current/g.target)*100,100);
      goalsEl.innerHTML += `
        <div class="goal-card">
          <h4>${g.title}</h4>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <small>${fmt(g.current)} / ${fmt(g.target)}</small>
          <div class="actions">
            <input type="number" placeholder="Adicionar valor" step="0.01"
              onkeydown="if(event.key==='Enter'){add(${g.id}, this.value)}">
            <button class="del" onclick="removeGoal(${g.id})">Excluir</button>
          </div>
        </div>
      `;
    });
  });
}

// adicionar valor à meta
function add(id, value){
  fetch(`http://localhost:3000/goals/${id}`, {
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer "+token
    },
    body:JSON.stringify({ value: parseFloat(value) })
  }).then(load);
}

// remover meta
function removeGoal(id){
  fetch(`http://localhost:3000/goals/${id}`, {
    method:"DELETE",
    headers:{ Authorization:"Bearer "+token }
  }).then(load);
}

const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

load();
