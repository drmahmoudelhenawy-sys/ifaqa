const fs = require('fs');
const content = fs.readFileSync('public/svg/293.svg', 'utf8');
const contentGroup = content.split('<g id="content">')[1];
const gTags = contentGroup.match(/<g transform="translate/g);
console.log(gTags ? gTags.length : 0);
