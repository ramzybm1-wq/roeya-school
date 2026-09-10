$routes = @(
    '/dashboard',
    '/inscriptions',
    '/inscriptions/nouvelle',
    '/liste-attente',
    '/waiting-list',
    '/etablissements',
    '/schools',
    '/niveaux-capacites',
    '/levels-capacities',
    '/annees-scolaires',
    '/academic-years',
    '/tarifs',
    '/tariffs',
    '/documents',
    '/medias',
    '/media',
    '/rapports',
    '/reports',
    '/notifications',
    '/utilisateurs',
    '/users',
    '/parametres',
    '/settings'
)

Write-Host "=== VERIFYING ALL ADMIN ROUTES ==="
foreach ($r in $routes) {
    try {
        $res = Invoke-WebRequest -Uri ("http://localhost:3001" + $r) -UseBasicParsing
        Write-Host "ROUTE $r -> $($res.StatusCode) OK"
    } catch {
        Write-Host "ROUTE $r -> FAILED: $_"
    }
}
