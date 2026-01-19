const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

exports.register = (req, res) => {
  const { name, email, password } = req.body;
  const hash = bcrypt.hashSync(password, 8);

  db.run(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hash],
    function (err) {
      if (err) return res.json({ error: "Email já cadastrado" });

      const token = jwt.sign({ id: this.lastID }, "SEGREDO_LG");
      res.json({ token });
    }
  );
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({ id: user.id }, "SEGREDO_LG");
    res.json({ token });
  });
};
