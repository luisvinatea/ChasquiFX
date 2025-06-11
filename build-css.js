import fs from "fs";
import path from "path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildCSS() {
  try {
    // Define CSS files to process
    const cssFiles = [
      {
        input: path.join(__dirname, "src/global.css"),
        output: path.join(__dirname, "dist/global.css"),
      },
      {
        input: path.join(__dirname, "src/index.css"),
        output: path.join(__dirname, "dist/index.css"),
      },
    ];

    // Ensure dist directory exists
    if (!fs.existsSync(path.join(__dirname, "dist"))) {
      fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
    }

    // Process each CSS file
    for (const file of cssFiles) {
      if (fs.existsSync(file.input)) {
        console.log(`📄 Processing: ${path.basename(file.input)}`);

        const inputCSS = fs.readFileSync(file.input, "utf8");

        const result = await postcss([tailwindcss, autoprefixer]).process(
          inputCSS,
          {
            from: file.input,
            to: file.output,
          }
        );

        fs.writeFileSync(file.output, result.css);

        if (result.map) {
          fs.writeFileSync(file.output + ".map", result.map.toString());
        }

        console.log(`✅ Built: ${path.basename(file.output)}`);
      } else {
        console.log(`⚠️  File not found: ${path.basename(file.input)}`);
      }
    }

    console.log("🎉 All CSS files built successfully!");
  } catch (error) {
    console.error("❌ Error building CSS:", error.message);
    process.exit(1);
  }
}

buildCSS();
