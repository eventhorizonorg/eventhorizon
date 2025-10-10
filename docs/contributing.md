# Contributing Guide

Thank you for your interest in contributing to Event Horizon!

## How to Contribute
1. Fork the repo and create a feature branch.
2. Make your changes, following the [Cursor Rules](cursor-rules.md).
3. Add or update tests as needed in `tests/`.
4. Run all checks locally:
   ```bash
   flake8 .
   black --check .
   isort --check .
   pytest
   ```
5. Commit and push your branch.
6. Open a pull request with a clear description.

## Code Style
- Python: Black, flake8, isort
- JavaScript: ES6+, no `console.log` in production
- Docs: Use Markdown, keep docs in `docs/`

## Issues
- Please search for existing issues before opening a new one.
- Use clear, descriptive titles and provide steps to reproduce bugs.

## Code of Conduct
- Be respectful and inclusive. See `CODE_OF_CONDUCT.md`. 