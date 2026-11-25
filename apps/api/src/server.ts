import { buildApp } from "./app";
import { env } from "./config/env";
import { hydrateWhatsAppStore, hydrateCustomers, hydrateOrganizations, hydrateUsers, hydrateMembers } from "./shared/supabase";
import { store } from "./shared/store";

const app = await buildApp();

// Hidrata o store em memória a partir do Supabase (se configurado).
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  await hydrateOrganizations(store as any);
  await hydrateUsers(store as any);
  await hydrateMembers(store as any);
  await hydrateCustomers(store as any);
  await hydrateWhatsAppStore(store as any);
}

process.on("SIGINT", async () => {
  await app.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await app.close();
  process.exit(0);
});

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`Nexus API disponível em http://localhost:${env.PORT} (docs: /docs)`);
  app.log.info(
    { provider: env.WHATSAPP_PROVIDER, processing: "synchronous" },
    "Sem filas/worker: processamento síncrono na API (compatível com Render Free)",
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
