$viewsDir = "c:\Users\Ramzy\project\apps\admin\views"
$files = Get-ChildItem -Path $viewsDir -Filter "*.html"

Write-Host "Found $($files.Count) admin HTML views to inspect and fix."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    $orig = $content

    # Fix general hash links
    $content = $content -replace 'href="/dashboard#"', 'href="/dashboard"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>dashboard</span>\s*<span>Dashboard</span>)', 'href="/dashboard"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<div[^>]*>\s*<span[^>]*>how_to_reg</span>\s*<span>Inscriptions</span>)', 'href="/inscriptions"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Toutes les demandes\s*</a>)', 'href="/inscriptions"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span>Nouvelles</span>)', 'href="/inscriptions?status=NEW"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*En attente\s*</a>)', 'href="/inscriptions?status=PENDING"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Acceptées\s*</a>)', 'href="/inscriptions?status=ACCEPTED"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Refusées\s*</a>)', 'href="/inscriptions?status=REFUSED"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Liste d''attente\s*</a>)', 'href="/liste-attente"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Annulées\s*</a>)', 'href="/inscriptions?status=CANCELLED"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>domain</span>\s*<span>Établissements</span>)', 'href="/etablissements"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>layers</span>\s*<span>Niveaux &amp; Capacités</span>)', 'href="/niveaux-capacites"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>calendar_month</span>\s*<span>Années scolaires</span>)', 'href="/annees-scolaires"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>payments</span>\s*<span>Tarifs</span>)', 'href="/tarifs"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>description</span>\s*<span>Documents</span>)', 'href="/documents"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>perm_media</span>\s*<span>Médias</span>)', 'href="/medias"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>analytics</span>\s*<span>Analyses</span>)', 'href="/dashboard"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>summarize</span>\s*<span>Rapports &amp; Exports</span>)', 'href="/rapports"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>manage_accounts</span>\s*<span>Utilisateurs &amp; Rôles</span>)', 'href="/utilisateurs"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>shield_person</span>\s*<span>Sécurité &amp; Activité</span>)', 'href="/utilisateurs"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>settings</span>\s*<span>Paramètres</span>)', 'href="/parametres"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>notifications</span>)', 'href="/notifications"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>logout</span>)', 'href="/login"'

    # Fix "+ Nouvelle inscription" buttons
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>add</span>\s*<span>Nouvelle inscription</span>)', 'href="/inscriptions/nouvelle"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*<span[^>]*>add</span>\s*<span>\+ Nouvelle inscription</span>)', 'href="/inscriptions/nouvelle"'

    if ($content -ne $orig) {
        Set-Content -Path $file.FullName -Value $content -Encoding utf8
        Write-Host "Updated links in $($file.Name)"
    }
}

Write-Host "Admin link audit and update completed."
