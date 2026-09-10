// Automated Test Script for ROEYA SCHOOL — Client Account First Architecture
// Tests all 17 verification checklist items from Section 41.

const CLIENT_BASE = process.env.CLIENT_BASE || 'http://client:3000';
const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';

const results = [];

function recordResult(num, description, pass, details = '') {
  results.push({ num, description, status: pass ? 'PASS' : 'FAIL', details });
  const badge = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[Item ${num}] ${badge} — ${description}`);
  if (details) {
    console.log(`   └─ Details: ${details}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 STARTING E2E VERIFICATION: ROEYA SCHOOL CLIENT ACCOUNT FIRST');
  console.log('===============================================================\n');

  let parent1Token = null;
  let parent1User = null;
  let child1Id = null;
  let child1Code = null;
  let child2Id = null;
  let child2Code = null;
  let parent2Token = null;
  let adminToken = null;

  const timestamp = Date.now();
  const parent1Email = `parent1_${timestamp}@test.dz`;
  const parent2Email = `parent2_${timestamp}@test.dz`;

  // 1. Anonymous visitor GET /inscription -> redirected to /connexion?redirect=/inscription (or blocked)
  try {
    const res = await fetch(`${CLIENT_BASE}/inscription`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    const isRedirect = (res.status === 302 || res.status === 307 || res.status === 301) && location.includes('/connexion');
    recordResult(1, 'Anonymous visitor GET /inscription -> redirected to /connexion', isRedirect, `HTTP ${res.status}, Location: ${location}`);
  } catch (err) {
    recordResult(1, 'Anonymous visitor GET /inscription -> redirected to /connexion', false, err.message);
  }

  // 2. Anonymous visitor POST /api/public/registration -> returns 401 Unauthorized
  try {
    const res = await fetch(`${API_BASE}/public/registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: 'dummy-school',
        levelId: 'dummy-level',
        student: { firstNameFr: 'Test', lastNameFr: 'Student' }
      })
    });
    const body = await res.json().catch(() => ({}));
    const is401 = res.status === 401;
    recordResult(2, 'Anonymous visitor POST /api/public/registration -> returns 401 Unauthorized', is401, `HTTP ${res.status}, Message: ${body.error?.message || JSON.stringify(body)}`);
  } catch (err) {
    recordResult(2, 'Anonymous visitor POST /api/public/registration -> returns 401 Unauthorized', false, err.message);
  }

  // 3. Create parent account via POST /api/public/client/register -> success, token returned
  try {
    const res = await fetch(`${API_BASE}/public/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: parent1Email,
        password: 'Password123!',
        firstName: 'Farid',
        lastName: 'Mansouri',
        phone: '0550123456',
        address: '14 Rue Didouche Mourad',
        wilaya: 'Alger',
        commune: 'Alger-Centre'
      })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && body.data?.token;
    if (isSuccess) {
      parent1Token = body.data.token;
      parent1User = body.data.user;
    }
    recordResult(3, 'Create parent account via POST /api/public/client/register -> success, token returned', isSuccess, `User: ${parent1Email}, Token length: ${parent1Token?.length || 0}`);
  } catch (err) {
    recordResult(3, 'Create parent account via POST /api/public/client/register -> success, token returned', false, err.message);
  }

  // 4. Check parent profile via GET /api/public/client/me -> returns parent identity
  try {
    const res = await fetch(`${API_BASE}/public/client/me`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const body = await res.json();
    const isIdentityMatch = res.ok && body.success && body.data?.email === parent1Email && body.data?.firstName === 'Farid';
    recordResult(4, 'Check parent profile via GET /api/public/client/me -> returns parent identity', isIdentityMatch, `Name: ${body.data?.firstName} ${body.data?.lastName}, Phone: ${body.data?.phone}`);
  } catch (err) {
    recordResult(4, 'Check parent profile via GET /api/public/client/me -> returns parent identity', false, err.message);
  }

  // Helper: Get active school and level from public offerings
  let targetSchoolId = null;
  let targetLevelId = null;
  let targetChoiceId = null;
  try {
    const offeringsRes = await fetch(`${API_BASE}/public/admission-offerings`);
    const offeringsBody = await offeringsRes.json();
    if (offeringsBody.success && offeringsBody.data && offeringsBody.data.length > 0) {
      const off = offeringsBody.data[0];
      targetSchoolId = off.schoolId;
      targetLevelId = off.levelId;
    }
  } catch (e) {}

  if (!targetSchoolId || !targetLevelId) {
    targetSchoolId = '2219bc3d-5499-4896-bf7a-0b15edc883e2';
    targetLevelId = '62fa148b-1c1b-45de-a194-7174935284cd';
  }

  // 5. Submit child registration 1 as logged-in parent via POST /api/public/registration with Bearer token
  try {
    const res = await fetch(`${API_BASE}/public/registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parent1Token}`
      },
      body: JSON.stringify({
        schoolId: targetSchoolId,
        levelId: targetLevelId,
        student: {
          firstNameFr: 'Amine',
          lastNameFr: 'Mansouri',
          gender: 'MALE',
          birthDate: '2016-04-12',
          birthPlace: 'Alger',
          currentSchool: 'École Ibn Khaldoun'
        },
        primaryParent: {
          firstNameFr: 'Farid',
          lastNameFr: 'Mansouri',
          phonePrimary: '0550123456',
          email: parent1Email,
          address: '14 Rue Didouche Mourad'
        }
      })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && (body.data?.id || body.data?.registrationId);
    if (isSuccess) {
      child1Id = body.data.id || body.data.registrationId;
      child1Code = body.data.code || body.data.registrationCode;
    }
    recordResult(5, 'Submit child registration 1 as logged-in parent -> returns registration code', isSuccess, `Code: ${child1Code}, ID: ${child1Id}`);
  } catch (err) {
    recordResult(5, 'Submit child registration 1 as logged-in parent -> returns registration code', false, err.message);
  }

  // 6. Submit child registration 2 as same logged-in parent -> success, different code, same parent account
  try {
    const res = await fetch(`${API_BASE}/public/registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parent1Token}`
      },
      body: JSON.stringify({
        schoolId: targetSchoolId,
        levelId: targetLevelId,
        student: {
          firstNameFr: 'Inès',
          lastNameFr: 'Mansouri',
          gender: 'FEMALE',
          birthDate: '2018-09-20',
          birthPlace: 'Alger',
          currentSchool: 'Jardin d\'enfants El Wouroud'
        },
        primaryParent: {
          firstNameFr: 'Farid',
          lastNameFr: 'Mansouri',
          phonePrimary: '0550123456',
          email: parent1Email,
          address: '14 Rue Didouche Mourad'
        }
      })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && (body.data?.id || body.data?.registrationId);
    if (isSuccess) {
      child2Id = body.data.id || body.data.registrationId;
      child2Code = body.data.code || body.data.registrationCode;
    }
    const isDifferentCode = isSuccess && child1Code !== child2Code;
    recordResult(6, 'Submit child registration 2 as same parent -> different code, same account', isDifferentCode, `Child 1: ${child1Code}, Child 2: ${child2Code}`);
  } catch (err) {
    recordResult(6, 'Submit child registration 2 as same parent -> different code, same account', false, err.message);
  }

  // 7. Fetch parent registrations via GET /api/public/client/registrations -> returns 2 children
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const body = await res.json();
    const dossiers = body.data || [];
    const hasBoth = dossiers.some(d => d.id === child1Id) && dossiers.some(d => d.id === child2Id);
    recordResult(7, 'Fetch parent registrations via GET /api/public/client/registrations -> returns 2 children', res.ok && hasBoth, `Total dossiers returned: ${dossiers.length}`);
  } catch (err) {
    recordResult(7, 'Fetch parent registrations via GET /api/public/client/registrations -> returns 2 children', false, err.message);
  }

  // 8. Fetch child 1 detail via GET /api/public/client/registrations/:id -> returns full details
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations/${child1Id}`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const body = await res.json();
    const isFullDetail = res.ok && body.success && body.data?.student?.firstName === 'Amine' && body.data?.school && body.data?.level;
    recordResult(8, 'Fetch child 1 detail via GET /api/public/client/registrations/:id -> returns full details', isFullDetail, `Student: ${body.data?.student?.firstName} ${body.data?.student?.lastName}, Level: ${body.data?.level?.nameFr || body.data?.level?.name}`);
  } catch (err) {
    recordResult(8, 'Fetch child 1 detail via GET /api/public/client/registrations/:id -> returns full details', false, err.message);
  }

  // 9. Create a second parent account
  try {
    const res = await fetch(`${API_BASE}/public/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: parent2Email,
        password: 'Password123!',
        firstName: 'Samia',
        lastName: 'Brahimi',
        phone: '0551987654'
      })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && body.data?.token;
    if (isSuccess) {
      parent2Token = body.data.token;
    }
    recordResult(9, 'Create a second parent account via POST /api/public/client/register -> success', isSuccess, `User: ${parent2Email}`);
  } catch (err) {
    recordResult(9, 'Create a second parent account via POST /api/public/client/register -> success', false, err.message);
  }

  // 10. Parent 2 tries to fetch child 1 via GET /api/public/client/registrations/:id1 -> returns 403 Forbidden (IDOR test)
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations/${child1Id}`, {
      headers: { Authorization: `Bearer ${parent2Token}` }
    });
    const isForbidden = res.status === 403;
    recordResult(10, 'Parent 2 tries to fetch child 1 -> returns 403 Forbidden (Strict IDOR test)', isForbidden, `HTTP Status: ${res.status}`);
  } catch (err) {
    recordResult(10, 'Parent 2 tries to fetch child 1 -> returns 403 Forbidden (Strict IDOR test)', false, err.message);
  }

  // 11. Admin login via POST /api/admin/auth/login
  try {
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@visionschool.dz',
        password: 'Password123!'
      })
    });
    const body = await res.json();
    const token = body.data?.sessionToken || body.data?.token;
    const isSuccess = res.ok && body.success && !!token;
    if (isSuccess) {
      adminToken = token;
    }
    recordResult(11, 'Admin login via POST /api/admin/auth/login -> success, admin token returned', isSuccess, `Role: ${body.data?.user?.role || 'SUPER_ADMIN'}`);
  } catch (err) {
    recordResult(11, 'Admin login via POST /api/admin/auth/login -> success, admin token returned', false, err.message);
  }

  // 12. Admin gets registration 1 -> sees linked client account details
  try {
    const res = await fetch(`${API_BASE}/admin/registrations/${child1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    const hasAccount = res.ok && body.success && (body.data?.hasClientAccount === true || body.data?.clientUserId);
    recordResult(12, 'Admin gets registration 1 -> sees linked client account details', hasAccount, `hasClientAccount: ${body.data?.hasClientAccount}, clientUser: ${body.data?.clientUser?.email || 'N/A'}`);
  } catch (err) {
    recordResult(12, 'Admin gets registration 1 -> sees linked client account details', false, err.message);
  }

  // 13. Admin changes status to UNDER_REVIEW -> success
  try {
    const res = await fetch(`${API_BASE}/admin/registrations/${child1Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'UNDER_REVIEW' })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && body.data?.status === 'UNDER_REVIEW';
    recordResult(13, 'Admin changes status to UNDER_REVIEW -> success', isSuccess, `Status: ${body.data?.status}`);
  } catch (err) {
    recordResult(13, 'Admin changes status to UNDER_REVIEW -> success', false, err.message);
  }

  // 14. Parent 1 checks registration 1 -> sees status UNDER_REVIEW
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations/${child1Id}`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const body = await res.json();
    const isUnderReview = res.ok && body.success && body.data?.status === 'UNDER_REVIEW';
    recordResult(14, 'Parent 1 checks registration 1 -> sees live status UNDER_REVIEW', isUnderReview, `Live Parent Status: ${body.data?.status}`);
  } catch (err) {
    recordResult(14, 'Parent 1 checks registration 1 -> sees live status UNDER_REVIEW', false, err.message);
  }

  // 15. Admin changes status to ACCEPTED -> success
  try {
    const res = await fetch(`${API_BASE}/admin/registrations/${child1Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'ACCEPTED' })
    });
    const body = await res.json();
    const isSuccess = res.ok && body.success && body.data?.status === 'ACCEPTED';
    recordResult(15, 'Admin changes status to ACCEPTED -> success', isSuccess, `Status: ${body.data?.status}`);
  } catch (err) {
    recordResult(15, 'Admin changes status to ACCEPTED -> success', false, err.message);
  }

  // 16. Parent 1 checks registration 1 -> sees status ACCEPTED
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations/${child1Id}`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const body = await res.json();
    const isAccepted = res.ok && body.success && body.data?.status === 'ACCEPTED';
    recordResult(16, 'Parent 1 checks registration 1 -> sees live status ACCEPTED', isAccepted, `Live Parent Status: ${body.data?.status}`);
  } catch (err) {
    recordResult(16, 'Parent 1 checks registration 1 -> sees live status ACCEPTED', false, err.message);
  }

  // 17. Parent 1 updates profile (phone/address) via PUT /api/public/client/profile -> success, reflected in /me
  try {
    const newPhone = '0550998877';
    const newAddress = '25 Boulevard Colonel Amirouche';
    const res = await fetch(`${API_BASE}/public/client/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parent1Token}`
      },
      body: JSON.stringify({
        phone: newPhone,
        address: newAddress,
        wilaya: 'Alger',
        commune: 'Alger-Centre'
      })
    });
    const updateBody = await res.json();

    const meRes = await fetch(`${API_BASE}/public/client/me`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    const meBody = await meRes.json();
    const isProfileReflected = meRes.ok && meBody.success && meBody.data?.phone === newPhone && meBody.data?.address === newAddress;
    recordResult(17, 'Parent 1 updates profile via PUT /api/public/client/profile -> reflected in /me', isProfileReflected, `Updated Phone: ${meBody.data?.phone}, Address: ${meBody.data?.address}`);
  } catch (err) {
    recordResult(17, 'Parent 1 updates profile via PUT /api/public/client/profile -> reflected in /me', false, err.message);
  }

  console.log('\n===============================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY:');
  console.log('===============================================================');
  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);
  console.log(`Overall Result: ${allPassed ? '🏆 ALL 17 ITEMS PASSED' : '⚠️ SOME ITEMS FAILED'}`);
  console.log('===============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests();
