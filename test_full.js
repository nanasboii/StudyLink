const http = require("http");

const data = JSON.stringify({ email: "tutor@example.com", password: "password123" });
const options = {
  hostname: "127.0.0.1", port: 5005, path: "/auth/login", method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": data.length }
};

const req = http.request(options, res => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => {
    const json = JSON.parse(body);
    const token = json.token;
    if (!token) return console.log("Login failed", body);
    
    http.get({
      hostname: "127.0.0.1", port: 5005, path: "/users/me/submitted-reviews",
      headers: { "Authorization": "Bearer " + token }
    }, res2 => {
      let b = "";
      res2.on("data", c => b += c);
      res2.on("end", () => console.log("Reviews:", b));
    });
  });
});
req.write(data); req.end();
