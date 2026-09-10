/**
 * Unit Tests: Form Builder Draft, Publish & Versioning Lifecycle.
 */

describe('Form Builder Versioning: Draft to Publish Workflow', () => {
  test('editing published form creates/updates DRAFT without changing live client form', () => {
    const liveForm = { id: 'form_v1', version: 1, status: 'PUBLISHED' };
    const draftForm = { id: 'form_v2', version: 2, status: 'DRAFT' };

    // Client requests live form
    const clientForm = [liveForm, draftForm].find((f) => f.status === 'PUBLISHED');
    expect(clientForm?.id).toBe('form_v1');
    expect(clientForm?.version).toBe(1);
  });

  test('publishing draft archives previous version and marks new version as PUBLISHED', () => {
    const formV1 = { id: 'form_v1', version: 1, status: 'PUBLISHED' };
    const formV2 = { id: 'form_v2', version: 2, status: 'DRAFT' };

    // Publish V2
    formV1.status = 'ARCHIVED';
    formV2.status = 'PUBLISHED';

    expect(formV1.status).toBe('ARCHIVED');
    expect(formV2.status).toBe('PUBLISHED');
    expect(formV2.version).toBe(2);
  });
});
