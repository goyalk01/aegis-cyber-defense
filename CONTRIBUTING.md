# Contributing to AEGIS

Thank you for your interest in contributing to AEGIS! This document provides guidelines for contributing.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aegis.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push and create a Pull Request

## 📋 Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

- Run backend tests: `cd backend && python -m pytest`
- Run frontend build: `cd frontend && npm run build`
- Test API endpoints: `http://localhost:8000/docs`

## 📝 Commit Message Format

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

Example: `feat: add ML model explainability to attribution engine`

## 🎯 Areas for Contribution

- ML model improvements
- New detection rules
- UI/UX enhancements
- Documentation
- Performance optimizations
- Test coverage

## 📄 Code Style

- **Python**: Follow PEP 8
- **TypeScript**: Use ESLint/Prettier defaults
- **Comments**: Only where logic needs clarification

## 🔒 Security

If you discover a security vulnerability, please email the maintainers directly instead of opening a public issue.

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
