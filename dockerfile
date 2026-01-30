# ──────────────────────────────────────────────
# Base: official AWS Lambda Node.js 20
# ──────────────────────────────────────────────
FROM public.ecr.aws/lambda/nodejs:20

# ──────────────────────────────────────────────
# Install Puppeteer / Chromium dependencies
# ──────────────────────────────────────────────
RUN microdnf install -y \
      alsa-lib atk cups-libs gtk3 \
      libXcomposite libXcursor libXdamage libXext libXi libXrandr \
      libXScrnSaver libXtst pango libxkbcommon nss nspr \
      freetype fontconfig ca-certificates wget gnupg tar gzip shadow-utils \
  && microdnf clean all

# ──────────────────────────────────────────────
# Working directory
# ──────────────────────────────────────────────
WORKDIR ${LAMBDA_TASK_ROOT}

# ──────────────────────────────────────────────
# Copy and build your app
# ──────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist

# ──────────────────────────────────────────────
# Environment Variables (from build args)
# ──────────────────────────────────────────────
ARG GEMINI_API_KEY
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_KEY
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION
ARG AWS_S3_BUCKET

ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
ENV AWS_REGION=$AWS_REGION
ENV AWS_S3_BUCKET=$AWS_S3_BUCKET

CMD ["dist/server.handler"]
