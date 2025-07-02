export class GetClubEventsDTO {
  constructor(query, clubId) {
    this.clubId = clubId;
    
    // Validate and set status filter
    const allowedStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled', null];
    this.status = query.status?.toLowerCase() || null;
    
    if (this.status && !allowedStatuses.includes(this.status)) {
      throw new Error(`Invalid status value: '${this.status}'. Allowed values are: ${allowedStatuses.filter(s => s !== null).join(', ')}`);
    }

    // Validate and set date range
    this.startFrom = query.start_from || null;
    this.startTo = query.start_to || null;

    if (this.startFrom && !this.isValidDate(this.startFrom)) {
      throw new Error('start_from must be a valid date in YYYY-MM-DD format');
    }

    if (this.startTo && !this.isValidDate(this.startTo)) {
      throw new Error('start_to must be a valid date in YYYY-MM-DD format');
    }

    if (this.startFrom && this.startTo && this.startFrom > this.startTo) {
      throw new Error('start_from cannot be later than start_to');
    }

    // Validate and set pagination
    this.page = parseInt(query.page) || 1;
    this.limit = parseInt(query.limit) || 10;

    if (this.page < 1) {
      throw new Error('page must be greater than 0');
    }

    if (this.limit < 1 || this.limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }

    // Calculate offset for pagination
    this.offset = (this.page - 1) * this.limit;
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }
} 