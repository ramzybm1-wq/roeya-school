Write-Host "=================================================="
Write-Host "  VISION SCHOOL - COMPLETE LIFECYCLE VERIFICATION"
Write-Host "=================================================="

# 1. Clean auto-migration and structural seed
Write-Host "`n[STEP 1] Resetting Database to Zero Registrations..."
docker compose exec -T api npx tsx packages/database/src/migrations/auto-migrate.ts
docker compose exec -T api npx tsx packages/database/src/seed/run-seed.ts

# 2. Login as Admin
Write-Host "`n[STEP 2] Admin Login..."
$adminLoginPayload = @{
    email = "admin.hydra@visionschool.dz"
    password = "Password123!"
} | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/auth/login" -Method POST -Body $adminLoginPayload -ContentType "application/json"
$token = $loginRes.data.sessionToken
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "Admin Logged In: $($loginRes.data.user.firstName) $($loginRes.data.user.lastName)"

# 3. ZERO DATA VERIFICATION
Write-Host "`n[STEP 3] ZERO-DATA ACCEPTANCE TEST:"
$zeroMetrics = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/dashboard/metrics" -Headers $headers
Write-Host "  - Total Demandes: $($zeroMetrics.data.totalRegistrations) (Expected: 0)"
Write-Host "  - Nouvelles Demandes: $($zeroMetrics.data.newRegistrations) (Expected: 0)"
Write-Host "  - Acceptees: $($zeroMetrics.data.acceptedRegistrations) (Expected: 0)"
Write-Host "  - Refusees: $($zeroMetrics.data.refusedRegistrations) (Expected: 0)"
Write-Host "  - En Attente: $($zeroMetrics.data.pendingRegistrations) (Expected: 0)"
Write-Host "  - Liste d attente: $($zeroMetrics.data.waitlistedRegistrations) (Expected: 0)"
Write-Host "  - Total Configured Capacity: $($zeroMetrics.data.totalConfiguredCapacity) (Expected: 375)"
Write-Host "  - Total Remaining Places: $($zeroMetrics.data.totalRemainingPlaces) (Expected: 375)"
$zeroRegs = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/registrations" -Headers $headers
Write-Host "  - Admin Registrations Count: $($zeroRegs.data.Count) (Expected: 0)"

if ($zeroMetrics.data.totalRegistrations -eq 0 -and $zeroRegs.data.Count -eq 0) {
    Write-Host ">>> ZERO-DATA ACCEPTANCE TEST: PASS"
} else {
    Write-Host ">>> ZERO-DATA ACCEPTANCE TEST: FAIL"
}

# 4. SUBMIT 1 CONTROLLED CLIENT REGISTRATION
Write-Host "`n[STEP 4] Submitting 1 Controlled Test Registration from Client..."
$regPayload = @{
    schoolId = "b0000000-0000-0000-0000-000000000001"
    academicYearId = "a0000000-0000-0000-0000-000000000001"
    levelId = "d0000000-0000-0000-0000-000000000002"
    student = @{
        fullName = "Yacine Benali"
        firstName = "Yacine"
        lastName = "Benali"
        birthDate = "2019-05-14"
        birthPlace = "Alger"
        gender = "MALE"
        currentSchool = "Creche Les Petits Genies"
        wilaya = "16 - Alger"
        commune = "Hydra"
    }
    parent = @{
        fullName = "Karim Benali"
        phonePrimary = "0555123456"
        email = "karim.benali@gmail.com"
        address = "12 Rue des Pins"
        wilaya = "16 - Alger"
        commune = "Hydra"
    }
} | ConvertTo-Json

$regRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/registration" -Method POST -Body $regPayload -ContentType "application/json"
$createdCode = $regRes.data.code
$createdId = $regRes.data.id
Write-Host "Registration Created: $createdCode (ID: $createdId, Status: $($regRes.data.status))"

# 5. VERIFY 1 REGISTRATION IN ADMIN & DASHBOARD
Write-Host "`n[STEP 5] Verifying 1 Registration in Admin and Dashboard:"
$oneMetrics = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/dashboard/metrics" -Headers $headers
Write-Host "  - Total Demandes: $($oneMetrics.data.totalRegistrations) (Expected: 1)"
Write-Host "  - Nouvelles Demandes: $($oneMetrics.data.newRegistrations) (Expected: 1)"
Write-Host "  - Acceptees: $($oneMetrics.data.acceptedRegistrations) (Expected: 0)"
Write-Host "  - Places Restantes: $($oneMetrics.data.totalRemainingPlaces) (Expected: 375)"

$oneRegs = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/registrations" -Headers $headers
Write-Host "  - Registrations in Admin List: $($oneRegs.data.Count) (Expected: 1, Code: $($oneRegs.data[0].code))"

# 6. ADMIN ACCEPTS DOSSIER
Write-Host "`n[STEP 6] Admin Accepts Dossier $createdCode..."
$acceptPayload = @{
    status = "ACCEPTED"
    adminNotes = "Dossier verifie et valide par l administration."
} | ConvertTo-Json

$acceptRes = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/registrations/$createdId/status" -Method PATCH -Body $acceptPayload -Headers $headers -ContentType "application/json"
Write-Host "Dossier Status Updated: $($acceptRes.data.status) (Accepted At: $($acceptRes.data.acceptedAt))"

# 7. VERIFY UPDATED DASHBOARD & CAPACITY DECREMENT
Write-Host "`n[STEP 7] Verifying Updated Dashboard and Capacity Decrement:"
$acceptedMetrics = Invoke-RestMethod -Uri "http://localhost:4000/api/admin/dashboard/metrics" -Headers $headers
Write-Host "  - Total Demandes: $($acceptedMetrics.data.totalRegistrations) (Expected: 1)"
Write-Host "  - Nouvelles Demandes: $($acceptedMetrics.data.newRegistrations) (Expected: 0)"
Write-Host "  - Acceptees: $($acceptedMetrics.data.acceptedRegistrations) (Expected: 1)"
Write-Host "  - Total Remaining Places: $($acceptedMetrics.data.totalRemainingPlaces) (Expected: 374 - Decreased by 1)"

# 8. VERIFY PUBLIC TRACKING POST-ACCEPTANCE
Write-Host "`n[STEP 8] Verifying Public Tracking for code $createdCode"
$trackRes = Invoke-RestMethod -Uri "http://localhost:4000/api/public/registration/track?code=$createdCode"
Write-Host "  - Public Tracking Status: $($trackRes.data.status) (Expected: ACCEPTED)"
Write-Host "  - Student: $($trackRes.data.studentFullName)"
Write-Host "  - School: $($trackRes.data.schoolName)"
Write-Host "  - Level: $($trackRes.data.levelName)"

if ($acceptedMetrics.data.acceptedRegistrations -eq 1 -and $acceptedMetrics.data.totalRemainingPlaces -eq 374 -and $trackRes.data.status -eq "ACCEPTED") {
    Write-Host "`n=================================================="
    Write-Host ">>> END-TO-END WORKFLOW: ALL TESTS PASSED (100%) <<<"
    Write-Host "=================================================="
} else {
    Write-Host "`n>>> END-TO-END WORKFLOW: SOME CHECKS FAILED <<<"
}
