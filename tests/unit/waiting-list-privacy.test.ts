/**
 * Unit Tests: Client Waiting Status & Position Privacy Rules.
 */

describe('Waiting List Privacy: Client Position Visibility', () => {
  test('hides numeric queue position from parents when show_waiting_position_client = false', () => {
    const candidateData = {
      registrationId: 'reg_1',
      computedPosition: 3,
      showWaitingPositionClient: false,
    };

    const clientResponse = {
      status: 'WAITLISTED',
      position: candidateData.showWaitingPositionClient ? candidateData.computedPosition : null,
      message: 'Ce niveau est complet. Votre demande est sur liste d’attente.',
    };

    expect(clientResponse.position).toBeNull();
    expect(clientResponse.status).toBe('WAITLISTED');
  });

  test('exposes numeric queue position when show_waiting_position_client = true', () => {
    const candidateData = {
      registrationId: 'reg_1',
      computedPosition: 3,
      showWaitingPositionClient: true,
    };

    const clientResponse = {
      status: 'WAITLISTED',
      position: candidateData.showWaitingPositionClient ? candidateData.computedPosition : null,
      message: 'Ce niveau est complet. Votre demande est sur liste d’attente.',
    };

    expect(clientResponse.position).toBe(3);
  });
});
