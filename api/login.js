export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { user, password } = req.body;

    // Llegim la variable d’entorn USERS
    const users = JSON.parse(process.env.USERS || "{}");

    // Validar credencials
    if (users[user] && users[user] === password) {
      const token = Math.random().toString(36).substring(2); // token simple
      return res.status(200).json({ success: true, token });
    }

    return res.status(401).json({ success: false, message: "Credencials incorrectes" });
  } catch (err) {
    console.error("Error serverless:", err);
    return res.status(500).json({ success: false, message: "Error intern del servidor" });
  }
}
