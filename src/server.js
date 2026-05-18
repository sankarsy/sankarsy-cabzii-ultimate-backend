const { app } = require("./app");
const { connectDb } = require("./config/db");
const { env, validateEnv } = require("./config/env");

async function startServer() {
  validateEnv();
  await connectDb();

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
