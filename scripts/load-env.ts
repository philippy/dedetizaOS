// Carrega .env.local antes dos outros imports (o tsx não faz isso sozinho).
import { config } from "dotenv";
config({ path: ".env.local" });
