const fs = require('fs');
// Very simple regex replacement to mock out localstorage just for this script
const storageCode = fs.readFileSync('src/lib/workspaceStorage.ts', 'utf8');
const mockedStorage = storageCode.replace(/localStorage\.getItem\(WORKSPACE_STORAGE_KEY\)/g, 'global.__mockStorage')
                                 .replace(/localStorage\.setItem\(WORKSPACE_STORAGE_KEY, JSON\.stringify\(ws\)\)/g, 'global.__mockStorage = JSON.stringify(ws)');

fs.writeFileSync('src/lib/workspaceStorage.ts', mockedStorage);
