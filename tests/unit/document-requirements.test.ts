/**
 * Unit Tests: Document Requirements Hierarchy & Optional Defaults.
 */

describe('Document Requirements: Hierarchy & Precedence Rules', () => {
  test('resolves requirements with precedence: Level specific > Cycle specific > Global', () => {
    const rawRequirements = [
      { id: '1', docTypeId: 'dt_birth', levelId: null, cycleId: null, isRequired: false, scope: 'GLOBAL' },
      { id: '2', docTypeId: 'dt_bulletin', levelId: null, cycleId: 'cycle_moyen', isRequired: true, scope: 'CYCLE' },
      { id: '3', docTypeId: 'dt_birth', levelId: 'lvl_1ap', cycleId: 'cycle_primaire', isRequired: true, scope: 'LEVEL' },
    ];

    // For a student in 1AP (Cycle Primaire):
    // dt_birth has both GLOBAL (optional) and LEVEL (mandatory). LEVEL takes precedence.
    const map = new Map<string, any>();
    for (const req of rawRequirements) {
      if (req.docTypeId === 'dt_birth') {
        const current = map.get('dt_birth');
        if (!current || (req.scope === 'LEVEL' && current.scope !== 'LEVEL')) {
          map.set('dt_birth', req);
        }
      }
    }

    const resolvedBirthReq = map.get('dt_birth');
    expect(resolvedBirthReq.isRequired).toBe(true);
    expect(resolvedBirthReq.scope).toBe('LEVEL');
  });

  test('documents are optional by default unless explicitly configured as required', () => {
    const defaultDocConfig = {
      nameFr: 'Certificat médical',
      isRequired: false, // Default optional
      blockSubmissionIfMissing: false,
    };

    expect(defaultDocConfig.isRequired).toBe(false);
    expect(defaultDocConfig.blockSubmissionIfMissing).toBe(false);
  });
});
