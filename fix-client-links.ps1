$viewsDir = "c:\Users\Ramzy\project\apps\client\views"
$files = Get-ChildItem -Path $viewsDir -Filter "*.html"

Write-Host "Found $($files.Count) client HTML views to inspect and fix."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    $orig = $content

    $content = $content -replace 'href="#"(?=[^>]*>\s*Accueil\s*</a>)', 'href="/"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Notre école\s*</a>)', 'href="/notre-ecole"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Niveaux &amp; Admissions\s*</a>)', 'href="/niveaux-admissions"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Galerie\s*</a>)', 'href="/galerie"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*FAQ\s*</a>)', 'href="/faq"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Contact\s*</a>)', 'href="/contact"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Suivi de dossier\s*</a>)', 'href="/suivi"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Suivre ma demande\s*</a>)', 'href="/suivi"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Inscrire mon enfant\s*</a>)', 'href="/inscription"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Pré-inscription\s*</a>)', 'href="/inscription"'
    $content = $content -replace 'href="#"(?=[^>]*>\s*Politique de confidentialité\s*</a>)', 'href="/confidentialite"'

    if ($content -ne $orig) {
        Set-Content -Path $file.FullName -Value $content -Encoding utf8
        Write-Host "Updated links in $($file.Name)"
    }
}

Write-Host "Client link audit and update completed."
