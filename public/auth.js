function checkSession() {
  const token = localStorage.getItem("sessionToken");
  if (!token) {
    window.location.href = "/login.html";
  }
}

function logout() {
  localStorage.removeItem("sessionToken");
  window.location.href = "/login.html";
}

