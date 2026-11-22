import fs from "node:fs";
import path from "node:path";
export function readPublicAssets(directory) {
  return Object.fromEntries(
    fs
      .readdirSync(directory)
      .filter(
        (name) =>
          !name.startsWith(".") &&
          /\.(html|css|js|svg|png|ico|webmanifest|xml|txt)$/.test(name) &&
          fs.statSync(path.join(directory, name)).isFile(),
      )
      .map((name) => {
        const binary = /\.(png|ico|webp|jpg|woff2)$/i.test(name);
        return [
          "/" + name,
          {
            encoding: binary ? "base64" : "utf8",
            body: fs
              .readFileSync(path.join(directory, name))
              .toString(binary ? "base64" : "utf8"),
          },
        ];
      }),
  );
}
