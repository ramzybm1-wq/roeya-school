$routes = @(
    '/',
    '/notre-ecole',
    '/niveaux-admissions',
    '/galerie',
    '/faq',
    '/contact',
    '/confidentialite',
    '/inscription',
    '/inscription/eleve',
    '/inscription/parent',
    '/inscription/documents',
    '/inscription/confirmation',
    '/suivi'
)

Write-Host "=== VERIFYING ALL CLIENT ROUTES ==="
foreach ($r in $routes) {
    try {
        $res = Invoke-WebRequest -Uri ("http://localhost:3000" + $r) -UseBasicParsing
        Write-Host "CLIENT ROUTE $r -> $($res.StatusCode) OK"
    } catch {
        Write-Host "CLIENT ROUTE $r -> FAILED: $_"
    }
}
