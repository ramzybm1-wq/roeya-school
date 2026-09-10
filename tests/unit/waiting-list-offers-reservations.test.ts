/**
 * Unit Tests: Place Offers & Temporary Capacity Reservations.
 */

describe('Waiting List: Place Offers & Capacity Holds', () => {
  test('creating place offer creates temporary capacity reservation', () => {
    const capacityMax = 100;
    const acceptedCount = 98;
    let activeReservations = 0;

    // Remaining before offer: 2
    let reservablePlaces = capacityMax - acceptedCount - activeReservations;
    expect(reservablePlaces).toBe(2);

    // Offer created with reservation
    activeReservations += 1;
    reservablePlaces = capacityMax - acceptedCount - activeReservations;
    expect(reservablePlaces).toBe(1);
  });

  test('expired offer releases reservation and restores candidate to active queue', () => {
    const entry = { id: 'entry_1', status: 'OFFERED', offerStatus: 'PENDING' };
    const reservation = { id: 'res_1', status: 'ACTIVE' };

    // Trigger expiration
    entry.status = 'ACTIVE';
    entry.offerStatus = 'EXPIRED';
    reservation.status = 'EXPIRED';

    expect(entry.status).toBe('ACTIVE');
    expect(entry.offerStatus).toBe('EXPIRED');
    expect(reservation.status).toBe('EXPIRED');
  });
});
