const express = require("express");
const cors = require("cors");
const db = require("./database");
const auth = require("./auth");
const authMiddleware = require("./middleware");

const app = express();
app.use(cors());
app.use(express.json());

// auth
app.post("/register", auth.register);
app.post("/login", auth.login);

// criar transação
app.post("/transactions", authMiddleware, (req, res) => {
  const { type, category, value, date, description } = req.body;

  db.run(
    `INSERT INTO transactions 
    (user_id, type, category, value, date, description)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [req.userId, type, category, value, date, description],
    () => res.json({ success: true })
  );
});

// listar transações
app.get("/transactions", authMiddleware, (req, res) => {
  db.all(
    "SELECT * FROM transactions WHERE user_id = ?",
    [req.userId],
    (err, rows) => res.json(rows)
  );
});

// metas
app.post("/goals", authMiddleware, (req, res) => {
  const { title, target } = req.body;

  db.run(
    "INSERT INTO goals (user_id, title, target, current) VALUES (?, ?, ?, 0)",
    [req.userId, title, target],
    () => res.json({ success: true })
  );
});

app.get("/goals", authMiddleware, (req, res) => {
  db.all(
    "SELECT * FROM goals WHERE user_id = ?",
    [req.userId],
    (err, rows) => res.json(rows)
  );
});

app.listen(3000, () => {
  console.log("🚀 financeiroL+G rodando na porta 3000");
});
app.delete("/transactions/:id", authMiddleware, (req, res) => {
  db.run(
    "DELETE FROM transactions WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId],
    () => res.json({ success: true })
  );
});
// adicionar valor à meta
app.put("/goals/:id", authMiddleware, (req,res)=>{
  db.run(
    "UPDATE goals SET current = current + ? WHERE id = ? AND user_id = ?",
    [req.body.value, req.params.id, req.userId],
    ()=>res.json({success:true})
  );
});

// remover meta
app.delete("/goals/:id", authMiddleware, (req,res)=>{
  db.run(
    "DELETE FROM goals WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId],
    ()=>res.json({success:true})
  );
});


app.post("/investments", (req, res) => {
  const { userId, title, value, rate, months } = req.body;

  const finalValue = value * Math.pow(1 + rate / 100, months);
  const profit = finalValue - value;

  db.run(
    `INSERT INTO investments 
     (user_id, title, value, rate, months, final_value, profit)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, value, rate, months, finalValue, profit],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao salvar investimento" });

      res.json({ success: true });
    }
  );
});
