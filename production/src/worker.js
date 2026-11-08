import { createApp } from "./app.js";
import knowledge from "./knowledge.generated.json";
import assets from "./assets.generated.json";
const app = createApp({ assets, knowledge, commit: __SOURCE_COMMIT__ });
export default { fetch: app };
