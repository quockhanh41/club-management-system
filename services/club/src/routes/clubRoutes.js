import express from 'express';
import { getClubEvents, getClubById } from '../controllers/clubController.js';

const clubRoutes = express.Router();

// US-006: Filter/Search Events of Club
clubRoutes.get('/api/clubs/:id/events', getClubEvents);

// US-007: View Club Info
clubRoutes.get('/api/clubs/:id', getClubById);

export { clubRoutes };
