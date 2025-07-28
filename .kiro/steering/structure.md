# Project Structure

## Directory Organization
```
/
├── src/                 # Source code
├── tests/              # Test files
├── docs/               # Documentation
├── config/             # Configuration files
├── scripts/            # Build and utility scripts
├── assets/             # Static assets (images, fonts, etc.)
└── .kiro/              # Kiro configuration and steering
    └── steering/       # AI assistant guidance files
```

## File Naming Conventions
- Use kebab-case for file and directory names
- Use descriptive, meaningful names
- Group related files in appropriate directories
- Keep file names concise but clear

## Code Organization
- Separate concerns into logical modules
- Keep functions and classes focused on single responsibilities
- Use consistent import/export patterns
- Organize code by feature rather than file type when possible

## Configuration Files
- Keep environment-specific configs separate
- Use version control for shared configurations
- Document any required environment variables
- Store sensitive data in environment variables, not in code

## Documentation Standards
- Include README.md with setup and usage instructions
- Document APIs and public interfaces
- Keep inline comments focused on "why" not "what"
- Update documentation when making changes