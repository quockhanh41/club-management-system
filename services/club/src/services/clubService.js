import { getClubById, getClubEvents } from '../repositories/clubRepository.js';

export async function getClubEventsService(clubId, filters) {
  // First check if club exists
  const club = await getClubById(clubId);
  if (!club) {
    const error = new Error('Club not found');
    error.name = 'NotFoundError';
    error.error = 'CLUB_NOT_FOUND';
    throw error;
  }

  // Get filtered events
  return await getClubEvents(clubId, filters);
}

export async function getClubByIdService(clubId) {
  const club = await getClubById(clubId);
  if (!club) {
    const error = new Error('Club not found');
    error.name = 'NotFoundError';
    error.error = 'CLUB_NOT_FOUND';
    throw error;
  }
  return club;
}
