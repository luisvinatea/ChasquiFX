# ChasquiFX Deployment Guide

This document provides detailed instructions for setting up and deploying ChasquiFX using Supabase for the database and Vercel for the backend API.

## Prerequisites

Before you begin, make sure you have:

1. A [GitHub](https://github.com/) account
2. A [Vercel](https://vercel.com/) account
3. A [Supabase](https://supabase.com/) account
4. A [SerpAPI](https://serpapi.com/) account

## 1. Supabase Setup

### Create a Supabase Project

1. Sign in to [Supabase](https://supabase.com/)
2. Click **New Project**
3. Name your project (e.g., "ChasquiFX")
4. Choose a database password (save this for later)
5. Select a region close to your users
6. Click **Create new project**

### Set Up Database Tables

1. Once your project is created, go to the **SQL Editor** tab
2. Copy the contents of the `backend/api/db/supabase_schema.sql` file
3. Paste the SQL into the editor and click **Run**
4. Verify that all tables have been created under the **Table Editor** tab

### Get Supabase Credentials

1. Go to the **Settings** tab, then **API**
2. Under **Project URL**, copy the URL (this is your `SUPABASE_URL`)
3. Under **Project API Keys**, copy the **anon public** key (this is your `SUPABASE_ANON_KEY` for the frontend)
4. Also copy the **service_role secret** key (this is your `SUPABASE_KEY` for the backend)

## 2. Vercel Setup for Backend

### Connect Vercel to GitHub

1. Sign in to [Vercel](https://vercel.com/)
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Configure project:
   - Framework preset: Other
   - Root Directory: `/backend`
   - Build Command: None (leave blank)
   - Output Directory: None (leave blank)

### Environment Variables

Add these environment variables to your Vercel project:

1. `SERPAPI_API_KEY` - Your SerpAPI key
2. `SUPABASE_URL` - Your Supabase project URL
3. `SUPABASE_KEY` - Your Supabase service_role key
4. `PYTHONPATH` - Set to `.`

### Deploy the Backend

1. Click **Deploy**
2. Once deployed, note the deployment URL (e.g., `https://chasquifx-backend.vercel.app`)

## 3. GitHub Pages Setup for Frontend

### Set up GitHub Actions Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add the following secrets:
   - `REACT_APP_API_URL` - The Vercel deployment URL from step 2
   - `REACT_APP_SUPABASE_URL` - Your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anon public key

### Enable GitHub Pages

1. Go to **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**

### Deploy the Frontend

1. The GitHub Actions workflow will automatically deploy the frontend when you push to the `main` branch
2. You can also manually trigger the workflow from the **Actions** tab

## 4. Using the Deployed Application

### First-time Setup

1. Navigate to your GitHub Pages URL (e.g., `https://username.github.io/chasquifx/`)
2. Click **Login / Sign Up** to create an account
3. After signing up, go to **API Keys** and enter your SerpAPI key
4. Start using the application!

## Troubleshooting

### Backend Issues

- Check Vercel logs for any errors
- Verify environment variables are set correctly
- Ensure the Supabase service is up and running

### Frontend Issues

- Check GitHub Actions logs for build failures
- Verify the API URL is correctly set in the environment variables
- Ensure the backend is accessible from the frontend

### Database Issues

- Check Supabase logs for any errors
- Verify the SQL schema was executed successfully
- Check row-level security policies are properly configured

## Updating the Application

### Backend Updates

1. Push changes to your GitHub repository
2. Vercel will automatically deploy the changes

### Frontend Updates

1. Push changes to your GitHub repository
2. GitHub Actions will automatically build and deploy the changes
