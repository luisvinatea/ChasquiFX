// Simple test to check if MUI packages can be imported
try {
  const mui = require("@mui/material");
  const muiIcons = require("@mui/icons-material");
  const emotion = require("@emotion/react");
  const emotionStyled = require("@emotion/styled");

  console.log("✅ @mui/material imported successfully");
  console.log("✅ @mui/icons-material imported successfully");
  console.log("✅ @emotion/react imported successfully");
  console.log("✅ @emotion/styled imported successfully");
  console.log("🎉 All MUI dependencies are working correctly!");
} catch (error) {
  console.error("❌ Error importing MUI dependencies:", error.message);
  process.exit(1);
}
