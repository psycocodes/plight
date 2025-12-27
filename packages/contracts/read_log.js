
const fs = require('fs');
// Start reading from the end or just read all. The file is small.
// Using utf16le because PowerShell > defaults to it.
const content = fs.readFileSync('deploy_final.log', 'utf16le');
const lines = content.split('\n');
const line = lines.find(l => l.includes('SampleProtocol deployed to:'));
console.log('FOUND:', line ? line.trim() : 'NOT FOUND');
