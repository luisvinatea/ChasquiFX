# React to Vite Migration Guide for ChasquiFX Frontend

This document provides a comprehensive guide to migrating the ChasquiFX frontend from Create React App (CRA) to Vite.

## Why Migrate to Vite?

1. **Faster Development Experience**

   - Lightning-fast development server startup
   - Instant Hot Module Replacement (HMR)
   - No bundling during development for faster updates

2. **Improved Build Performance**

   - Significantly faster builds
   - Smaller bundle sizes through better tree-shaking
   - Support for pre-bundling dependencies

3. **Modern Features**

   - Native ESM-based dev server
   - Built-in optimizations for production builds
   - Better TypeScript integration (if needed in the future)
   - Simplified configuration

4. **Better Maintenance**
   - Active development and community support
   - Fewer dependencies and "magic" configurations
   - Easier to customize when needed

## Migration Process

### 1. Preparation

Before starting the migration, ensure you have:

- A backup of your current frontend code
- Node.js version 14.18+ or 16+ installed
- Understanding of your application's environment variables and dependencies

### 2. Creating a New Vite Project

Run the provided script to create a new Vite project and migrate your code:

```bash
./migrate-to-vite.sh
```

This script will:

- Create a backup of your current frontend
- Generate a new Vite project with React template
- Install all required dependencies
- Copy over your components, services, and assets
- Set up configuration files for Vite
- Create a migration notes document

### 3. Update Environment Variables

After creating the Vite project, you need to update environment variable references:

```bash
./update-env-vars.sh
```

This script will:

- Update all `.env` files to use the `VITE_` prefix instead of `REACT_APP_`
- Update code references to environment variables
- Create an example `.env` file for reference

### 4. Adapt App.jsx for Vite

To ensure your main App component works properly with Vite:

```bash
./update-app-jsx.sh
```

This script will:

- Create a Vite-compatible version of App.jsx
- Update environment variable references
- Set up the Vite configuration file

### 5. Additional Manual Updates

After running the scripts, review your code and make these additional updates:

#### SVG Imports

In Vite, SVG files can be imported directly as React components using the `?react` suffix:

```javascript
// Old CRA way
import { ReactComponent as Logo } from "./logo.svg";

// New Vite way
import Logo from "./logo.svg?react";
```

#### Static Asset Imports

Update any static asset imports:

```javascript
// Old CRA way
import logo from "./logo.png";

// New Vite way - similar but handled differently internally
import logo from "./logo.png";
```

#### Test Files

Update any test files to work with Vitest (Vite's testing framework) if needed.

### 6. Testing

Before deploying:

1. Run the development server:

   ```bash
   cd frontend
   npm run dev
   ```

2. Check for any console errors
3. Verify all features are working correctly
4. Test environment variables and API connections
5. Build and preview the production build:
   ```bash
   npm run build
   npm run preview
   ```

### 7. Deployment to Vercel

The Vercel configuration has been updated to work with Vite:

1. Update your Vercel project settings to:

   - Build command: `npm run build`
   - Output directory: `dist`

2. Add environment variables to your Vercel project
3. Deploy using Git integration or the Vercel CLI

## Troubleshooting

### Common Issues

1. **Environment Variables Not Available**

   - Ensure they are prefixed with `VITE_`
   - Make sure they're referenced as `import.meta.env.VITE_VARIABLE_NAME`

2. **Assets Not Loading**

   - Check import paths - Vite handles assets differently
   - Ensure public assets are in the correct location

3. **Build Errors**

   - Check for any React version compatibility issues
   - Ensure all dependencies are correctly installed

4. **HMR Not Working**
   - Check for any errors in the console
   - Ensure you're not using any patterns that break HMR

### Getting Help

If you encounter issues:

1. Check the [Vite documentation](https://vitejs.dev/guide/)
2. Review the [Vite React plugin documentation](https://github.com/vitejs/vite/tree/main/packages/plugin-react)
3. Search for similar issues in the [Vite GitHub repository](https://github.com/vitejs/vite/issues)

## References

- [Vite Official Documentation](https://vitejs.dev/)
- [React Framework with Vite](https://vitejs.dev/guide/frameworks.html#react)
- [Migration from CRA to Vite](https://vitejs.dev/guide/migration-from-cra.html)
