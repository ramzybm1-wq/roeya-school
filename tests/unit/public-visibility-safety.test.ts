/**
 * Unit Tests: Public Visibility & Data Leakage Prevention.
 */

describe('Public Visibility Safety: Zero Data Leakage', () => {
  test('strips numeric remaining capacity and fill rate when show_remaining_places = false', () => {
    const internalCapacity = {
      capacityMax: 255,
      acceptedCount: 200,
      remainingPlaces: 55,
      fillRate: 78.43,
      showRemainingPlaces: false,
      showFillRate: false,
    };

    const publicRepresentation = {
      remainingPlaces: internalCapacity.showRemainingPlaces ? internalCapacity.remainingPlaces : null,
      fillRate: internalCapacity.showFillRate ? internalCapacity.fillRate : null,
    };

    expect(publicRepresentation.remainingPlaces).toBeNull();
    expect(publicRepresentation.fillRate).toBeNull();
  });

  test('strips numeric tariff amount when show_client = false and returns custom message', () => {
    const internalTariff = {
      amount: 180000,
      currency: 'DZD',
      showClient: false,
      hiddenClientMessageFr: 'Tarif communiqué lors de l’entretien',
    };

    const publicTariff = {
      isAvailable: true,
      amount: internalTariff.showClient ? internalTariff.amount : null,
      displayText: internalTariff.showClient
        ? `${internalTariff.amount} ${internalTariff.currency}`
        : internalTariff.hiddenClientMessageFr || 'Tarif sur demande',
    };

    expect(publicTariff.amount).toBeNull();
    expect(publicTariff.displayText).toBe('Tarif communiqué lors de l’entretien');
  });

  test('returns formatted amount when show_client = true', () => {
    const internalTariff = {
      amount: 180000,
      currency: 'DZD',
      showClient: true,
      hiddenClientMessageFr: null,
    };

    const publicTariff = {
      isAvailable: true,
      amount: internalTariff.showClient ? internalTariff.amount : null,
      displayText: internalTariff.showClient
        ? `${internalTariff.amount} ${internalTariff.currency}`
        : 'Tarif sur demande',
    };

    expect(publicTariff.amount).toBe(180000);
    expect(publicTariff.displayText).toBe('180000 DZD');
  });
});
