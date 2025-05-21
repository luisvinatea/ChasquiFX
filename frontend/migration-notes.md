# ChasquiFX Frontend Migration to Vite

## Migration Notes

This frontend has been migrated from Create React App (CRA) to Vite for the following benefits:

- Faster development server startup
- Improved hot module replacement (HMR)
- Better build performance
- Smaller bundle sizes
- Modern ES modules approach
- Less configuration overhead

## Key Changes

1. Project structure updates:
   - `index.js` → `main.jsx`
   - `.js` extensions → `.jsx` for React components
   - `public` folder → `public` folder (but handled differently)

2. Environment variables:
   - CRA: `REACT_APP_*` → Vite: `VITE_*`
   - Update all environment variable references

3. Imports:
   - SVG imports now use `?react` suffix for direct component usage
   - Static assets are imported differently

4. Build output:
   - Output is in `dist` folder instead of `build`
   - Different structure for static assets

## Deployment

- The Vercel configuration has been updated to work with Vite
- The build command is now `npm run build` which runs Vite's build process
- The output directory is now `dist` instead of `build`

## Local Development

1. Start the development server:
   ```
   npm run dev
   ```

2. Build for production:
   ```
   npm run build
   ```

3. Preview the production build:
   ```
   npm run preview
   ```
