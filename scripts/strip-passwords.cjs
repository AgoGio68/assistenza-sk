const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/assistenza-sk/users_old_all.json', 'utf8'));

const strippedUsers = data.users.map(u => {
    const { passwordHash, salt, ...rest } = u;
    return rest;
});

fs.writeFileSync('c:/assistenza-sk/users_stripped.json', JSON.stringify({ users: strippedUsers }, null, 2));
console.log("Stripped passwords from 8 users.");
