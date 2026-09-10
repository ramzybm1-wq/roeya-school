/**
 * Unit Tests: Waiting Queue Position Privacy in Client Tracking.
 */

describe('Tracking Waiting Position: Visibility Toggles', () => {
  test('omits numeric position when show_waiting_position_client is false', () => {
    const rawData = {
      computedPosition: 4,
      showWaitingPositionClient: false,
    };

    const clientWaitingInfo = {
      isWaitlisted: true,
      position: rawData.showWaitingPositionClient ? rawData.computedPosition : null,
      message: 'Votre demande est positionnée sur liste d’attente.',
    };

    expect(clientWaitingInfo.position).toBeNull();
    expect(clientWaitingInfo.isWaitlisted).toBe(true);
  });

  test('includes numeric position when show_waiting_position_client is true', () => {
    const rawData = {
      computedPosition: 4,
      showWaitingPositionClient: true,
    };

    const clientWaitingInfo = {
      isWaitlisted: true,
      position: rawData.showWaitingPositionClient ? rawData.computedPosition : null,
      message: 'Votre demande est positionnée sur liste d’attente.',
    };

    expect(clientWaitingInfo.position).toBe(4);
  });
});
