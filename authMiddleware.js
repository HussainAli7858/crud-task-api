const supabase = require("./supabase.js");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] === "") {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user; // attach the verified user for the route to use
  req.token = token;    // also keep the raw token, needed for logout
  next();
}

module.exports = requireAuth;