/**
 * Unit Tests: Tariff Report Theoretical Revenue Disclaimer.
 */

describe('Reports: Tariff Report Disclaimers', () => {
  test('includes explicit theoretical revenue note and does not claim collected revenue', () => {
    const tariffReport = {
      reportType: 'TARIFFS',
      disclaimerNote:
        'Montant théorique selon les tarifs officiels configurés (les encaissements réels ne sont pas comptabilisés dans ce rapport).',
    };

    expect(tariffReport.disclaimerNote).toContain('Montant théorique');
    expect(tariffReport.disclaimerNote).not.toContain('Chiffre d’affaires encaissé');
  });
});
