const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), "SEGREDO_LG");
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};
