const fs = require("fs");
const p = "src/pages/LearningHomePage.jsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/\$\{\s*(text(?:-[a-z0-9/%\[\].]+)+)\s*\}/gi, "$1");
s = s.replace(/\$\{\s*(border(?:-[a-z0-9/%\[\].]+)+)\s*\}/gi, "$1");
s = s.replace(/className=\{(text(?:-[a-z0-9/%\[\].]+)+)\}/g, 'className="$1"');
fs.writeFileSync(p, s);
