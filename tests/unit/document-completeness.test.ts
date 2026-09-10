/**
 * Unit Tests: Dossier Document Completeness Calculation.
 */

describe('Document Completeness: Mandatory vs Optional Rules', () => {
  test('incomplete when mandatory document is missing or not validated', () => {
    const requirements = [
      { docTypeId: 'dt_birth', isRequired: true },
      { docTypeId: 'dt_photo', isRequired: true },
      { docTypeId: 'dt_vaccine', isRequired: true },
      { docTypeId: 'dt_medical', isRequired: false }, // Optional
    ];

    const currentDocuments = [
      { docTypeId: 'dt_birth', status: 'VALIDATED' },
      { docTypeId: 'dt_photo', status: 'VALIDATED' },
      // dt_vaccine is MISSING
      // dt_medical is MISSING (optional)
    ];

    const requiredCount = requirements.filter((r) => r.isRequired).length; // 3
    const requiredValidated = currentDocuments.filter((d) => {
      const req = requirements.find((r) => r.docTypeId === d.docTypeId);
      return req?.isRequired && d.status === 'VALIDATED';
    }).length; // 2

    const isComplete = requiredValidated === requiredCount;
    expect(isComplete).toBe(false);
  });

  test('complete when all mandatory documents are validated, ignoring missing optional docs', () => {
    const requirements = [
      { docTypeId: 'dt_birth', isRequired: true },
      { docTypeId: 'dt_photo', isRequired: true },
      { docTypeId: 'dt_vaccine', isRequired: true },
      { docTypeId: 'dt_medical', isRequired: false }, // Optional
      { docTypeId: 'dt_sport', isRequired: false }, // Optional
    ];

    const currentDocuments = [
      { docTypeId: 'dt_birth', status: 'VALIDATED' },
      { docTypeId: 'dt_photo', status: 'VALIDATED' },
      { docTypeId: 'dt_vaccine', status: 'VALIDATED' },
      // Both optional documents are missing
    ];

    const requiredCount = requirements.filter((r) => r.isRequired).length; // 3
    const requiredValidated = currentDocuments.filter((d) => {
      const req = requirements.find((r) => r.docTypeId === d.docTypeId);
      return req?.isRequired && d.status === 'VALIDATED';
    }).length; // 3

    const isComplete = requiredValidated === requiredCount;
    expect(isComplete).toBe(true);
  });
});
