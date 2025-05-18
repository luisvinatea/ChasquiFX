import { spawn } from "child_process";
import { getLogger } from "../utils/logger.js";
import path from "path";
import { fileURLToPath } from "url";

const logger = getLogger("python-bridge");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonBridge {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || "python";
    this.rootDir = path.resolve(__dirname, "../../../");
  }

  /**
   * Call a Python method from a module
   * @param {String} modulePath - Python module path (dot notation)
   * @param {String} methodName - Method name to call
   * @param {Array} args - Arguments to pass to the method
   * @returns {Promise<any>} - Results from Python function
   */
  callPythonMethod(modulePath, methodName, args = []) {
    return new Promise((resolve, reject) => {
      // Create a bridging script to call the Python function
      const scriptPath = path.join(this.rootDir, "backend", "api");

      // Prepare the arguments for the Python process
      const scriptArgs = [
        "-c",
        `
import sys
import json
import importlib

try:
    # Import the module dynamically
    module = importlib.import_module("${modulePath}")
    
    # Get the method
    method = getattr(module, "${methodName}")
    
    # Parse arguments if provided
    args = json.loads('${JSON.stringify(args)}')
    
    # Call the method with unpacked arguments
    result = method(*args)
    
    # Print the result as JSON
    print(json.dumps(result))
    
    sys.exit(0)
except Exception as e:
    # Print error as JSON
    print(json.dumps({"error": str(e), "type": str(type(e).__name__)}))
    sys.exit(1)
        `,
      ];

      logger.debug(
        `Calling Python method: ${modulePath}.${methodName} with args: ${JSON.stringify(
          args
        )}`
      );

      // Spawn Python process
      const pythonProcess = spawn(this.pythonPath, scriptArgs, {
        cwd: scriptPath,
      });

      let result = "";
      let errorOutput = "";

      // Collect data from stdout
      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      // Collect error data from stderr
      pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
        logger.error(`Python stderr: ${data}`);
      });

      // Handle process completion
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          return reject(
            new Error(`Python error: ${errorOutput || "Unknown error"}`)
          );
        }

        try {
          // Parse the result as JSON
          const parsedResult = JSON.parse(result.trim());

          // Check if the result contains an error
          if (parsedResult && parsedResult.error) {
            logger.error(`Python error: ${parsedResult.error}`);
            return reject(new Error(`Python error: ${parsedResult.error}`));
          }

          resolve(parsedResult);
        } catch (error) {
          logger.error(`Error parsing Python result: ${error.message}`);
          reject(error);
        }
      });

      // Handle process error
      pythonProcess.on("error", (err) => {
        logger.error(`Failed to start Python process: ${err.message}`);
        reject(err);
      });
    });
  }
}
