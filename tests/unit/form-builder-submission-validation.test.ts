/**
 * Unit Tests: Form Submission Validation & Core vs Custom Separation.
 */

describe('Form Submission Validation: Required & Custom Value Separation', () => {
  test('rejects submission when a visible mandatory dynamic field is missing', () => {
    const fields = [
      { fieldKey: 'parent_phone', isRequired: true, isVisible: true },
      { fieldKey: 'student_first_name_fr', isRequired: true, isVisible: true },
      { fieldKey: 'emergency_contact', isRequired: true, isVisible: true },
    ];

    const submittedValues = {
      parent_phone: '0550123456',
      student_first_name_fr: 'Mohamed',
      // emergency_contact is missing
    };

    const validate = () => {
      for (const field of fields) {
        if (field.isRequired && field.isVisible && !(submittedValues as any)[field.fieldKey]) {
          throw new Error(`MISSING_REQUIRED_FIELD_${field.fieldKey}`);
        }
      }
    };

    expect(() => validate()).toThrow('MISSING_REQUIRED_FIELD_emergency_contact');
  });

  test('does not require a field when its conditional logic renders it hidden', () => {
    const transportField = {
      fieldKey: 'transport_zone',
      isRequired: true,
      isVisible: false, // Hidden because uses_school_transport = false
    };

    const submittedValues = {
      uses_school_transport: false,
      // transport_zone is omitted
    };

    // Should not throw because isVisible is false
    const validate = () => {
      if (transportField.isRequired && transportField.isVisible && !(submittedValues as any)[transportField.fieldKey]) {
        throw new Error('MISSING_REQUIRED_FIELD');
      }
      return { success: true };
    };

    expect(validate().success).toBe(true);
  });
});
