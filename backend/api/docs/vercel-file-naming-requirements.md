# Vercel File Naming Requirements

When deploying to Vercel, it's important to follow specific file naming conventions to avoid deployment conflicts. This document outlines these requirements and provides best practices for file organization.

## File Naming Conflicts

Vercel has a constraint where files with the same base name but different extensions in the same directory can conflict during deployment. This can lead to errors like:

```
Two or more files have conflicting paths or names. Please make sure path segments and filenames, without their extension, are unique.
```

### Example Conflict

The following files would conflict because they have the same base name:

- `/api/scripts/auth/test-connection.js`
- `/api/scripts/auth/test-connection.sh`

## Best Practices

### 1. Use Unique Base Names

Every file within the same directory should have a unique base name (name without the extension), regardless of file type.

Good:

- `mongodb-connection-test.js`
- `run-mongodb-test.sh`

Bad:

- `connection-test.js`
- `connection-test.sh`

### 2. Use the `.vercelignore` File

Add patterns to the `.vercelignore` file to exclude files that aren't needed for production. For the ChasquiFX project, we exclude:

- Shell scripts (\*.sh)
- Test files
- Documentation
- Development configuration files

### 3. Organize Files by Type

Consider organizing files by type in different directories to reduce the chance of conflicts:

- `/scripts/js/` - For JavaScript scripts
- `/scripts/shell/` - For shell scripts

### 4. Use Clear, Descriptive Names

Use clear, descriptive names that indicate what the file does and its type:

- `mongodb-atlas-connection-test.js`
- `run-atlas-connection-test.sh`

## Deploy Script Safety Check

The `deploy-api.sh` script includes a safety check that scans for potential file conflicts before deployment. If conflicts are found, the script will:

1. List the conflicting files
2. Prompt you to decide whether to continue with deployment
3. Suggest renaming files to resolve conflicts

## Renaming Files

When renaming files to resolve conflicts:

1. Use the git mv command to maintain history:

   ```bash
   git mv old-name.js new-name.js
   ```

2. Update any references to the renamed file in other files
3. Test locally before deploying again

## Conclusion

Following these naming conventions and using the deploy script's conflict detection will help avoid deployment failures and ensure a smooth deployment process to Vercel.
