# ============ Development Stage ============
FROM golang:1.25-alpine AS dev

RUN apk add --no-cache git curl

# Install golang-migrate
RUN curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz | tar xvz \
    && mv migrate /usr/local/bin/migrate

WORKDIR /app

# Copy dependency files first (cache layer)
COPY go.mod ./
# Download dependencies (go.sum created automatically)
RUN go mod download

# Install Air for hot reloading
RUN go install github.com/air-verse/air@latest

# Copy the source code
COPY . .

EXPOSE 8080

# Run Air for hot-reload in development
CMD ["air"]

# ============ Build Stage ============
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api

# ============ Production Stage ============
FROM alpine:3.20 AS production

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /bin/api /bin/api

EXPOSE 8080

ENTRYPOINT ["/bin/api"]