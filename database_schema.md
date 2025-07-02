# 📊 Database Schema Overview

This schema defines the structure for a system with microservices: **Authentication**, **User Profiles**, **Club Management**, **Event Management**, **Finance**, **Notifications**, and **Reporting**.

...

CREATE INDEX idx_club_summary_period ON report_service.club_financial_summary(club_id, start_date, end_date);