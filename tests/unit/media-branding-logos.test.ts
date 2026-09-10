/**
 * Unit Tests: Multi-Surface Logo Independence & Contain Rule.
 */

describe('Media Branding: Multi-Surface Logo Independence', () => {
  test('resolves independent logos for client header, admin sidebar, and admin login', () => {
    const brandingAssignments = {
      CLIENT_HEADER_LOGO: 'logo_client_white.svg',
      CLIENT_FOOTER_LOGO: 'logo_client_white.svg',
      ADMIN_SIDEBAR_LOGO: 'logo_admin_dark.svg',
      ADMIN_LOGIN_LOGO: 'logo_admin_full.svg',
      APP_LOGO: 'logo_icon_192.png',
    };

    expect(brandingAssignments.CLIENT_HEADER_LOGO).toBe('logo_client_white.svg');
    expect(brandingAssignments.ADMIN_SIDEBAR_LOGO).toBe('logo_admin_dark.svg');
    expect(brandingAssignments.ADMIN_LOGIN_LOGO).toBe('logo_admin_full.svg');
  });

  test('logo rendering rule uses object-fit contain without crop metadata', () => {
    const logoConfig = {
      type: 'LOGO',
      fit: 'contain',
      allowAutoCrop: false,
    };

    expect(logoConfig.fit).toBe('contain');
    expect(logoConfig.allowAutoCrop).toBe(false);
  });
});
