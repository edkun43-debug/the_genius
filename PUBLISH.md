# Publish THE GENIUS free

This project is ready for a free Render web-service deployment.

1. Create a **private** repository at [GitHub](https://github.com/new). Name it `the-genius` and leave the README, `.gitignore`, and license options unticked.
2. Upload every file from this project folder except `.env`. Keep `public/`, `Dockerfile`, `server.mjs`, `package.json`, and `render.yaml` in the repository root.
3. In [Render](https://dashboard.render.com/), choose **New → Blueprint**, connect GitHub, and choose the `the-genius` repository.
4. Render reads `render.yaml`. When it asks for `GROQ_API_KEY`, paste a fresh key as the secret. Do not put it in GitHub or in any source file.
5. Select **Apply**, then wait for the deployment log to say it is live. Open the `https://…onrender.com` URL that Render provides.

Free services sleep after 15 minutes with no visitors. The first request after that can take about one minute while the service restarts.
