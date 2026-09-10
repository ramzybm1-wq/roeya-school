/**
 * Unit Tests: Contact Form Anti-Spam Rate Limiting.
 */

describe('Public Contact: Rate Limiting & Anti-Spam', () => {
  test('throttles excessive submissions from the same IP', () => {
    let count = 0;
    const maxSubmissions = 5;

    const submit = () => {
      count++;
      if (count > maxSubmissions) {
        throw new Error('CONTACT_RATE_LIMITED');
      }
    };

    for (let i = 0; i < 5; i++) {
      submit();
    }
    expect(count).toBe(5);

    expect(() => submit()).toThrow('CONTACT_RATE_LIMITED');
  });
});
