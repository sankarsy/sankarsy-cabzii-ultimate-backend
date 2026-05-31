const { app } = require("./app");
const { connectDb } = require("./config/db");
const { env, validateEnv } = require("./config/env");

async function startServer() {
  validateEnv();
  await connectDb();

  const host = process.env.HOST || "0.0.0.0";
  app.listen(env.port, host, () => {
    console.log(`Server listening on http://${host}:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
