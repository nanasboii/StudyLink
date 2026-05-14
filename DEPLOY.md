Deployment Notes

This project is configured to build the Vue frontend and run the Node API from a single Docker image (multi-stage build).

Required environment variables (Railway / production):

- FRONTEND_ORIGIN: public URL of your frontend, e.g. https://your-app.up.railway.app
- DATABASE_URL: Postgres connection string for production DB
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM: SMTP credentials for sending emails
- SESSION_DURATION_HOURS (optional)
- STREAK_TIMEZONE (optional)

Recommended steps for Railway deploy

1. Use the repository Dockerfile (multi-stage) — Railway will build the image and produce a runnable artifact.
2. Set the env vars in the Railway project (FRONTEND_ORIGIN, DATABASE_URL, SMTP_*, etc.).
3. Deploy the project. The runtime command is `node src/server.js` (Dockerfile provides `CMD`).

Local tests

- Build frontend locally:

```bash
npm install
npm run build
```

- Build the Docker image locally (optional):

```bash
docker build -t studylink:local .
docker run -p 3000:3000 studylink:local
```

Notes

- We removed committed `dist/` from tracking and configured the Dockerfile to build the frontend inside the image. If you prefer to commit `dist/` instead, modify `.gitignore` accordingly and adjust the Dockerfile.
- Ensure `.env` does not set `NODE_ENV=production` for Vite — Vite warns about NODE_ENV in .env files. Use Railway's environment variables to set NODE_ENV if needed.
- Before redeploying: confirm SMTP credentials and authorized IPs (Brevo/Sendinblue may require IP allowlist). Use the `/test-email` endpoint to verify.
