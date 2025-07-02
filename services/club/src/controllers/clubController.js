import { GetClubEventsDTO } from '../dtos/clubEventDto.js';
import { getClubEventsService, getClubByIdService } from '../services/clubService.js';

export const getClubEvents = async (req, res, next) => {
  try {
    const clubId = req.params.id;
    const dto = new GetClubEventsDTO(req.query, clubId);
    const result = await getClubEventsService(clubId, dto);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getClubById = async (req, res, next) => {
  try {
    const clubId = req.params.id;
    const club = await getClubByIdService(clubId);
    
    res.status(200).json(club);
  } catch (error) {
    next(error);
  }
};
