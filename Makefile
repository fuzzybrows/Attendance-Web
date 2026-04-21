# Makefile for Choir Attendance Web (Frontend)

SHELL := /bin/bash

.PHONY: install dev build run preview lint test coverage e2e-install e2e e2e-ui e2e-report

# Install dependencies
install:
	npm install

# Run in development mode
dev:
	npm run dev -- --open --host 127.0.0.1

# Build for production
build:
	npm run build

# Run in production mode (build then serve)
run: build
	npm run preview -- --host 0.0.0.0

# Preview production build (without rebuilding)
preview:
	npm run preview -- --host 0.0.0.0

# Lint code
lint:
	npm run lint

# Run unit tests
test:
	npm test

# Run tests with coverage
coverage:
	npm run coverage

# ── E2E Tests (Playwright) ──

# Install E2E dependencies
e2e-install:
	cd e2e && npm install && npx playwright install chromium

# Run all E2E tests (headless)
e2e:
	cd e2e && npx playwright test

# Run E2E tests with interactive UI
e2e-ui:
	cd e2e && npx playwright test --ui

# Show E2E HTML report
e2e-report:
	cd e2e && npx playwright show-report
