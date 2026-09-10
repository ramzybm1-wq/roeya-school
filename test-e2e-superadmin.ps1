Write-Host "=== TEST: SUPER ADMIN LOGIN & 2FA ==="
$loginPayload = @{
    email = "superadmin@visionschool.dz"
    password = "Password123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/auth/login" -Method POST -Body $loginPayload -ContentType "application/json"
Write-Host "Super Admin Login Response: Requires2FA=$($loginRes.data.requires2Fa), ChallengeToken=$($loginRes.data.challengeToken)"

# In our TOTP service, recovery code or TOTP can verify:
# Let's test TOTP verify or login with direct Hydra admin for administrative actions:
$adminPayload = @{
    email = "admin.hydra@visionschool.dz"
    password = "Password123!"
} | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/auth/login" -Method POST -Body $adminPayload -ContentType "application/json"
$token = $adminRes.data.sessionToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "`n=== TEST: PUBLIC SCHOOLS & LEVELS ==="
$schoolsRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/schools"
Write-Host "Public Schools Count: $($schoolsRes.data.Count)"
$levelsRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/levels"
Write-Host "Public Levels Count: $($levelsRes.data.Count)"

Write-Host "`n=== TEST: PUBLIC CONTACT SUBMISSION ==="
$contactPayload = @{
    fullName = "Karim Brahimi"
    email = "karim.brahimi@gmail.com"
    phone = "0550112233"
    subject = "SCHOOL_VISIT"
    message = "Bonjour, j'aimerais visiter le campus Hydra."
} | ConvertTo-Json
$contactRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/content/contact" -Method POST -Body $contactPayload -ContentType "application/json"
Write-Host "Contact Submission: Success=$($contactRes.success)"

Write-Host "`n=== TEST: PUBLIC FAQ ==="
$faqRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/content/faq"
Write-Host "FAQ Items Count: $($faqRes.data.Count)"

Write-Host "`n=== TEST: ADMIN REGISTRATIONS LIST ==="
$listRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/registrations" -Headers $headers
Write-Host "Admin Registrations Found: $($listRes.data.Count)"
foreach ($item in $listRes.data) {
    Write-Host "  -> Dossier $($item.code) | Élève: $($item.student.fullName) | Statut: $($item.status)"
}

Write-Host "`n=== TEST: ADMIN CAPACITY PER LEVEL ==="
$capacities = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/school-year-levels" -Headers $headers
Write-Host "Configured School-Year-Levels Count: $($capacities.data.Count)"
