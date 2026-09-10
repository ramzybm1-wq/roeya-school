const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', '..', 'apps', 'admin', 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} admin views.`);

// Link replacements map based on link text or surrounding markup
const replacementMap = [
  // Exact link matches
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>dashboard<\/span>[\s\n\r]*<span>Dashboard<\/span>)/gi, replacement: 'href="/dashboard"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<div[^>]*>[\s\n\r]*<span[^>]*>how_to_reg<\/span>[\s\n\r]*<span>Inscriptions<\/span>)/gi, replacement: 'href="/inscriptions"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*Toutes les demandes[\s\n\r]*<\/a>)/gi, replacement: 'href="/inscriptions"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span>Nouvelles<\/span>)/gi, replacement: 'href="/inscriptions?status=NEW"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*En attente[\s\n\r]*<\/a>)/gi, replacement: 'href="/inscriptions?status=PENDING"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*Acceptées[\s\n\r]*<\/a>)/gi, replacement: 'href="/inscriptions?status=ACCEPTED"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*Refusées[\s\n\r]*<\/a>)/gi, replacement: 'href="/inscriptions?status=REFUSED"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*Liste d'attente[\s\n\r]*<\/a>)/gi, replacement: 'href="/liste-attente"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*Annulées[\s\n\r]*<\/a>)/gi, replacement: 'href="/inscriptions?status=CANCELLED"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>domain<\/span>[\s\n\r]*<span>Établissements<\/span>)/gi, replacement: 'href="/etablissements"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>layers<\/span>[\s\n\r]*<span>Niveaux &amp; Capacités<\/span>)/gi, replacement: 'href="/niveaux-capacites"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>calendar_month<\/span>[\s\n\r]*<span>Années scolaires<\/span>)/gi, replacement: 'href="/annees-scolaires"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>payments<\/span>[\s\n\r]*<span>Tarifs<\/span>)/gi, replacement: 'href="/tarifs"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>description<\/span>[\s\n\r]*<span>Documents<\/span>)/gi, replacement: 'href="/documents"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>perm_media<\/span>[\s\n\r]*<span>Médias<\/span>)/gi, replacement: 'href="/medias"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>analytics<\/span>[\s\n\r]*<span>Analyses<\/span>)/gi, replacement: 'href="/dashboard"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>summarize<\/span>[\s\n\r]*<span>Rapports &amp; Exports<\/span>)/gi, replacement: 'href="/rapports"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>manage_accounts<\/span>[\s\n\r]*<span>Utilisateurs &amp; Rôles<\/span>)/gi, replacement: 'href="/utilisateurs"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>shield_person<\/span>[\s\n\r]*<span>Sécurité &amp; Activité<\/span>)/gi, replacement: 'href="/utilisateurs"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>settings<\/span>[\s\n\r]*<span>Paramètres<\/span>)/gi, replacement: 'href="/parametres"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>notifications<\/span>)/gi, replacement: 'href="/notifications"' },
  { regex: /href="\/dashboard#"/g, replacement: 'href="/dashboard"' },
  { regex: /href="#"(?=[^>]*>[\s\n\r]*<span[^>]*>logout<\/span>)/gi, replacement: 'href="/login"' },
];

let totalModified = 0;

for (const file of files) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const { regex, replacement } of replacementMap) {
    content = content.replace(regex, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    console.log(`Updated links in: ${file}`);
  }
}

console.log(`Successfully updated ${totalModified} files.`);
