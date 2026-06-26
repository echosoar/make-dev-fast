# TypeScript Web Library

A modern TypeScript library template for web development with hot reload and live preview.

## Features

- 🚀 **Development Server**: Live preview with hot reload
- 🔧 **TypeScript**: Full TypeScript support with strict mode
- 🧪 **Testing**: Jest testing framework with coverage
- 📦 **Build**: Webpack for bundling with UMD output
- 🎨 **Linting**: ESLint with TypeScript support
- 🔍 **IDE Support**: VSCode settings for auto-lint and formatting

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

This will open your browser at `http://localhost:3000` with a live preview of your library.

### Building

Build the library for production:

```bash
npm run build
```

This creates:
- `dist/main.js` - UMD bundle for browsers
- `dist/index.js` - CommonJS module
- `dist/index.d.ts` - TypeScript declarations

### Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run coverage
```

### Linting

Check code quality:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

## Project Structure

```
├── src/
│   └── index.ts          # Main library code
├── test/
│   ├── setup.js          # Test setup
│   └── index.test.ts     # Unit tests
├── public/
│   └── index.html        # Demo page
├── dist/                 # Built files (generated)
├── webpack.config.js     # Webpack configuration
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest configuration
└── .eslintrc.json        # ESLint configuration
```

## Usage

### In Browser (UMD)

```html
<script src="dist/main.js"></script>
<script>
  console.log(MyLibrary.hello('World'));
</script>
```

### As NPM Module

```javascript
import { hello, Calculator } from 'your-library-name';

console.log(hello('World'));

const calc = new Calculator();
const result = calc.add(5).multiply(2).getResult(); // 10
```

## Development Tips

- The dev server automatically reloads when you change source files
- Use the demo page at `http://localhost:3000` to test your library
- TypeScript declarations are automatically generated during build
- ESLint is configured for TypeScript and will auto-fix on save in VSCode