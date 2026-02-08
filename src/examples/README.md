# Agent SDK Examples

This directory contains example implementations showing how to use the Agent SDK with different wallet providers.

## Available Examples

### Core Examples (No Additional Dependencies)

1. **`with-ethers.ts`** ✅
   - Basic usage with ethers.js Wallet
   - No additional dependencies
   - Works in Node.js or browser

2. **`with-session-keys.ts`** ✅
   - Session key pattern with **in-memory storage**
   - Good for development/testing
   - ⚠️ **For production, use `with-session-keys-database.ts`**

3. **`with-session-keys-database.ts`** ✅ **NEW!**
   - Session key pattern with **real database** (SQLite/PostgreSQL)
   - Production-ready
   - Includes encryption
   - Daily spend tracking
   - See `DATABASE_SETUP_GUIDE.md` for setup

4. **`fetchai-integration.ts`** ✅
   - Fetch.ai ASI integration example
   - Shows automatic payment handling

### React Examples (Require Additional Dependencies)

These examples are for reference and require additional packages:

5. **`with-privy.tsx`** 📝
   - Requires: `@privy-io/react-auth`
   - Shows Privy integration
   - React component example

6. **`with-dynamic.tsx`** 📝
   - Requires: `@dynamic-labs/sdk-react-core`
   - Shows Dynamic.xyz integration
   - React component example

7. **`with-metamask.tsx`** 📝
   - Requires: MetaMask browser extension
   - Shows MetaMask integration
   - React component example

---

## 🗄️ Database Setup for Session Keys

### Quick Answer

**You DON'T need a database if:**
- Using `with-session-keys.ts` (in-memory storage)
- Just testing/developing
- Single-user scenario

**You DO need a database if:**
- Using `with-session-keys-database.ts`
- Production deployment
- Multiple users
- Need persistence

### Setup Options

1. **SQLite (Easiest - No Setup)**
   ```bash
   npm install better-sqlite3
   # That's it! No database server needed
   ```

2. **PostgreSQL (Production)**
   ```bash
   # Install PostgreSQL
   brew install postgresql
   createdb agent_sdk_db
   
   # Install Prisma
   npm install prisma @prisma/client
   npx prisma init
   # Follow DATABASE_SETUP_GUIDE.md
   ```

See `DATABASE_SETUP_GUIDE.md` for complete instructions.

---

## Running Examples

### TypeScript Examples (Node.js)

```bash
# Install dependencies
cd agent-sdk
npm install

# For in-memory storage (no database)
npx ts-node src/examples/with-session-keys.ts

# For database storage (requires database setup)
npx ts-node src/examples/with-session-keys-database.ts
```

### React Examples

React examples are provided for reference. To use them:

1. Install required dependencies:
   ```bash
   npm install @privy-io/react-auth  # For Privy example
   npm install @dynamic-labs/sdk-react-core  # For Dynamic example
   ```

2. Copy the example to your React app
3. Update imports and configuration

---

## 📝 Which Example Should I Use?

### For Development/Testing:
- ✅ `with-ethers.ts` - Simple wallet
- ✅ `with-session-keys.ts` - Session keys with in-memory storage

### For Production:
- ✅ `with-session-keys-database.ts` - Session keys with database
- ✅ See `DATABASE_SETUP_GUIDE.md` for database setup

### For React Apps:
- ✅ `with-privy.tsx` - If using Privy
- ✅ `with-dynamic.tsx` - If using Dynamic.xyz
- ✅ `with-metamask.tsx` - If using MetaMask

---

## Note

The SDK itself is **wallet-agnostic** and doesn't require any of these wallet libraries or databases.
These examples just show how to adapt different wallets and storage solutions to work with the SDK.
