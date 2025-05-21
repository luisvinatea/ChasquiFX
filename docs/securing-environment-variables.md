# Securing Environment Variables in ChasquiFX

This document provides guidance on properly securing sensitive information like JWT secrets, API keys, and database credentials in the ChasquiFX application.

## Why Environment Variables?

Using environment variables for sensitive information provides several benefits:

1. **Separation of Concerns**: Keeps sensitive data out of the codebase
2. **Environment Flexibility**: Different values for different environments (dev, test, prod)
3. **Security**: Prevents accidental leaks through source control
4. **Compliance**: Follows security best practices for credential storage

## Required Environment Variables

The following environment variables are required for the application:

### For All Environments:

- `JWT_SECRET`: Secret key for JWT token generation and validation

### For Production Only:

- `MONGODB_URI`: MongoDB connection string
- `EMAIL_SERVICE_API_KEY`: Email service provider API key

## Proper Handling of Example Files

### Do's and Don'ts for Example Files

When creating example files like `.env.example`:

✅ **DO**:

- Use clear placeholder text (e.g., `<REPLACE_WITH_YOUR_KEY>`)
- Add comments explaining these are placeholders
- Include warnings that these are not real credentials
- Use obviously fake URLs and information

❌ **DON'T**:

- Use values that look like real credentials or URLs
- Include actual hostnames, usernames, or database names
- Use credentials that were ever valid, even if now expired
- Use formats that could be mistaken for real secrets by security scanners

### Example Format for Connection Strings

For MongoDB connection strings, use this format in example files:

```
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/<DATABASE>
```

Instead of:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

The second example may trigger security scanners even though it's just an example.

### Security Scanning Considerations

Many organizations use automated security scanning tools that look for patterns matching credentials. To avoid false positives:

1. Format placeholder values with clear `<ANGLE_BRACKETS>`
2. Add comments indicating these are examples/placeholders
3. Consider using values like `YOUR_JWT_SECRET_HERE` instead of realistic-looking examples

## Setting Up Environment Variables

### Local Development

1. Copy the `.env.example` file to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in the values:

   ```
   JWT_SECRET=your_strong_secret_key_here
   ```

3. For development, a placeholder JWT_SECRET can be used, but **never** use placeholders in production.

### Production (Vercel)

1. In the Vercel dashboard, navigate to your project
2. Go to Settings > Environment Variables
3. Add each required variable:
   - `JWT_SECRET`: Generate a strong random string ([UUID generator](https://www.uuidgenerator.net/) can help)
   - `MONGODB_URI`: Your MongoDB connection URL
   - `EMAIL_SERVICE_API_KEY`: Your email provider API key

## Generating Secure JWT Secrets

For production, generate a secure random string for JWT_SECRET. Here are ways to generate one:

### Using Node.js:

```javascript
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using OpenSSL:

```bash
openssl rand -hex 32
```

## Validation

The application validates environment variables on startup:

- Development: Missing variables will use defaults with warnings
- Production: Missing required variables will prevent startup

## Security Best Practices

1. **Never commit .env files** to source control
2. **Never hard-code secrets** in source code
3. **Rotate secrets periodically** for enhanced security
4. **Use different secrets** for development and production
5. **Limit access** to production environment variables

## Troubleshooting

If you encounter environment variable issues:

1. Run the validation script: `npm run validate-env`
2. Check your `.env` file exists and has the correct variables
3. For Vercel deployments, verify variables are set in the Vercel dashboard

## References

- [OWASP: Use of hard-coded password](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [12 Factor App: Config](https://12factor.net/config)
- [Vercel Environment Variables Documentation](https://vercel.com/docs/environment-variables)
