Write-Host "=== TEST 1: HEALTH CHECKS ==="
$apiHealth = Invoke-RestMethod -Uri "http://localhost:4000/health"
Write-Host "API Health: $($apiHealth.status)"
$apiReady = Invoke-RestMethod -Uri "http://localhost:4000/ready"
Write-Host "API Readiness DB: $($apiReady.checks.database)"

Write-Host "`n=== TEST 2: PUBLIC REGISTRATION SUBMISSION ==="
$regPayload = @{
    schoolId = "b0000000-0000-0000-0000-000000000001"
    levelId = "d0000000-0000-0000-0000-000000000002"
    academicYearId = "a0000000-0000-0000-0000-000000000001"
    student = @{
        firstNameFr = "Yacine"
        lastNameFr = "Benali"
        gender = "MALE"
        birthDate = "2018-04-10"
        birthPlace = "Alger"
        currentSchool = "École Maternelle Les Lilas"
    }
    primaryParent = @{
        firstNameFr = "Karim"
        lastNameFr = "Benali"
        phonePrimary = "0555 12 34 56"
        email = "karim.benali@gmail.com"
        address = "12 Rue Didouche Mourad, Alger"
    }
} | ConvertTo-Json -Depth 5

$regRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/registration" -Method POST -Body $regPayload -ContentType "application/json"
$createdCode = $regRes.data.code
$regId = $regRes.data.registrationId
Write-Host "Registration Created: $createdCode (ID: $regId, Status: $($regRes.data.status))"

Write-Host "`n=== TEST 3: PUBLIC TRACKING ==="
$trackRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/registration/track?code=$createdCode&phone=0555123456"
Write-Host "Tracking Verified: Student=$($trackRes.data.studentFullName), Status=$($trackRes.data.status), School=$($trackRes.data.schoolName)"

Write-Host "`n=== TEST 4: ADMIN AUTHENTICATION ==="
$loginPayload = @{
    email = "admin.hydra@visionschool.dz"
    password = "Password123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/auth/login" -Method POST -Body $loginPayload -ContentType "application/json"
$token = $loginRes.data.sessionToken
Write-Host "Admin Logged In: $($loginRes.data.user.firstName) $($loginRes.data.user.lastName) (Role: $($loginRes.data.user.role))"

Write-Host "`n=== TEST 5: ADMIN DOSSIER ACCEPTANCE ==="
$headers = @{ "Authorization" = "Bearer $token" }
$acceptPayload = @{ status = "ACCEPTED"; adminNotes = "Dossier validé lors des tests E2E" } | ConvertTo-Json
$acceptRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/registrations/$regId/status" -Method PATCH -Headers $headers -Body $acceptPayload -ContentType "application/json"
Write-Host "Dossier Status Updated: $($acceptRes.data.status) (Accepted At: $($acceptRes.data.acceptedAt))"

Write-Host "`n=== TEST 6: TRACKING POST-ACCEPTANCE ==="
$trackPost = Invoke-RestMethod -Uri "http://localhost:4000/api/public/registration/track?code=$createdCode"
Write-Host "Public Tracking Now Shows: $($trackPost.data.status)"

Write-Host "`n=== TEST 7: DASHBOARD LIVE METRICS ==="
$metrics = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/dashboard/metrics" -Headers $headers
Write-Host "Dashboard Metrics:"
Write-Host "  - Total Accepted: $($metrics.data.totalAcceptedRegistrations)"
Write-Host "  - Total Configured Capacity: $($metrics.data.totalConfiguredCapacity)"
Write-Host "  - Total Remaining Places: $($metrics.data.totalRemainingPlaces)"
Write-Host "  - Active Academic Year: $($metrics.data.activeAcademicYearName)"
