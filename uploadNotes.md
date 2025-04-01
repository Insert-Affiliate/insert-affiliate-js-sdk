# 📦 Uploading `insert-affiliate-js-sdk` to npm

This guide walks you through the steps to build, version, tag, and publish the SDK to npm.

---

## ✅ 1. Build the SDK

Run the build command using `tsup` to compile TypeScript into JavaScript:

```bash
npm run build
```

This outputs compiled files to the dist/ folder, including:

- CommonJS + ESM builds
- Type definitions (.d.ts)


## 🔢 2. Bump the Version
Update the version field in package.json based on changes:

Change Type	Version Format
- Bug fix:	1.0.0 → 1.0.1
- New feature:	1.0.0 → 1.1.0
- Breaking change:	1.0.0 → 2.0.0

## 🏷 3. Commit and Tag the Release
```bash
git add .
git commit -m "Release v1.0.1"

# Tag it
git tag v1.0.1

# Push both the commit and the tag
git push origin main --tags
```

## 🔐 4. Login to npm (if you haven’t)
```bash
npm login
```

## 🚀 5. Publish to npm
```bash
npm publish --access public
```