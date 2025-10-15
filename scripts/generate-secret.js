#!/usr/bin/env node

const crypto = require('crypto')

function generateSecret() {
  return crypto.randomBytes(32).toString('base64')
}

console.log('Generated NextAuth Secret:')
console.log(generateSecret())
console.log('\nAdd this to your .env file as NEXTAUTH_SECRET=')
