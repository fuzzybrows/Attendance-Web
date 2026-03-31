# Makefile for Choir Attendance Web (Frontend)

SHELL := /bin/bash

.PHONY: install dev build run preview lint test coverage

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

# Run tests
test:
	npm test

# Run tests with coverage
coverage:
	npm run coverage
