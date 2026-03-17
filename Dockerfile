# =============================================================
# FRONTEND DOCKERFILE
# This uses a "multi-stage build" — a powerful Docker technique.
#
# WHAT IS MULTI-STAGE BUILD?
# Instead of one set of instructions, we have multiple stages:
#   Stage 1 (builder): Install everything, build the app
#   Stage 2 (runner):  Copy ONLY the built output, run it
#
# WHY? Your build tools (TypeScript compiler, Tailwind CLI, etc.)
# are ~500MB+ but the final built app is only ~50MB. Multi-stage
# builds throw away the build tools, making the final image tiny.
#
# Think of it like building a house:
#   Stage 1: Construction site with all tools and materials
#   Stage 2: The finished house — no scaffolding or tools needed
# =============================================================


# ========================
# STAGE 1: BUILD
# ========================
# "AS builder" gives this stage a name so we can reference it later
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (for caching, same reason as backend)
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies like tailwindcss)
# because we need them to BUILD the app
RUN npm ci

# Copy all source code
COPY . .

# ----- IMPORTANT: Build-time environment variables -----
# Next.js "bakes in" environment variables that start with
# NEXT_PUBLIC_ at BUILD TIME (not runtime). This means we need
# to provide them here so they end up in the JavaScript bundle.
#
# ARG = a variable available only during "docker build"
# We set a default value, but you'll override it when building:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com .
ARG NEXT_PUBLIC_API_URL=http://localhost:5001/api

# ENV = an environment variable inside the container
# We set ENV from the ARG so Next.js can read it during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js app (creates optimized production bundle in .next/)
# This compiles React, processes Tailwind CSS, optimizes images, etc.
RUN npm run build


# ========================
# STAGE 2: RUN
# ========================
# Start fresh from a clean Node.js image (no build leftovers)
FROM node:22-alpine

WORKDIR /app

# Copy ONLY what we need from the builder stage:

# 1. The built Next.js app (the .next folder contains compiled output)
COPY --from=builder /app/.next ./.next

# 2. Public assets (favicon, static images, etc.)
COPY --from=builder /app/public ./public

# 3. Package files (needed for "next start" to find the next package)
COPY --from=builder /app/package.json ./package.json

# 4. node_modules (needed at runtime for Next.js server)
COPY --from=builder /app/node_modules ./node_modules

# Next.js production server runs on port 3000 by default
EXPOSE 3000

# Start the optimized Next.js production server
# "next start" serves the pre-built app (unlike "next dev" which
# compiles on-the-fly and has hot reload)
CMD ["npm", "run", "start"]
