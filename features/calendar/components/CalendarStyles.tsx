"use client";

/**
 * Global overrides for react-big-calendar. Kept in its own file so the very
 * long style string doesn't drown out the calendar's logic.
 */
export default function CalendarStyles() {
  return (
    <style>{`
      /* Year View Styles */
      .year-view { font-family: 'Roboto', Arial, sans-serif; }
      .month-container { transition: all 0.2s ease; }
      .month-container:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
      .month-days { min-height: 120px; }
      .day-cell {
        height: 24px; width: 24px; font-size: 11px; border-radius: 50%;
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; transition: all 0.1s ease;
      }
      .day-cell:hover:not(:empty) { background-color: #e6e6e6; font-weight: 500; }
      .event-dot { margin-top: 1px; background-color: #4285f4; height: 4px; width: 4px; }
      .day-cell.has-events { position: relative; }

      .rtl { direction: rtl; text-align: right; }
      .ltr { direction: ltr; text-align: left; }

      .rbc-month-view { border: none; background: #fff; }
      .rbc-month-row {
        justify-content: center; padding-top: 20px; padding-bottom: 20px;
        min-height: 150px; height: auto !important;
      }
      .rbc-off-range-bg { background: #eff6ff; }
      .rbc-header { font-weight: normal; border-bottom: none; }
      .rbc-date-cell { padding: 5px; text-align: center; }
      .rbc-today { background-color: #eff6ff; }
      .rbc-event { border-radius: 4px; padding: 4px 8px; border: none; }
      .rbc-time-view { border: none; padding-right: 3%; }
      .rbc-time-header { height: auto !important; min-height: 60px; display: flex !important; }
      .rbc-time-header-content { border-left: none; flex: 1; }
      .rbc-timeslot-group { border-bottom: 1px solid #e2e8f0; min-height: 60px; }
      .rbc-agenda-event-cell, .rbc-agenda-date-cell, .rbc-agenda-time-cell { width: 41.79%; }
      .rbc-day-slot .rbc-time-slot { border-top: none; }
      .rbc-time-content { border-top: none; overflow-y: visible; }
      .rbc-day-slot .rbc-events-container { margin-right: 0; }
      .rbc-rtl .rbc-day-slot .rbc-events-container { margin-left: 0; }
      .rbc-time-view .rbc-header { border-bottom: 1px solid #e2e8f0; }
      .rbc-time-view .rbc-row { background: #fff; }
      .rbc-time-content > * + * > * { border-left: 1px solid #e2e8f0; }
      .rbc-rtl .rbc-time-content > * + * > * { border-right: 1px solid #e2e8f0; border-left: none; }
      .rbc-time-gutter { font-size: 12px; width: 60px; text-align: center; color: #64748b; padding-right: 10px; }
      .rbc-rtl .rbc-time-gutter { padding-left: 10px; padding-right: 0; }
      .rbc-allday-cell { display: none; }
      .rbc-time-view .rbc-header.rbc-today { background-color: #eff6ff; }
      .rbc-time-view .rbc-day-bg.rbc-today { background-color: #eff6ff; }
      .rbc-event-content { font-weight: 500; }
      .rbc-month-view .rbc-event { min-height: 20px; height: auto !important; }
      .rbc-month-view .rbc-event-content { white-space: normal; overflow: visible; }
      .rbc-month-row { overflow: visible; }
      .rbc-row-segment { padding: 0 1px; }
      .rbc-day-slot:nth-child(odd) .rbc-time-slot { background-color: #f9fafb; }
      .rbc-day-slot:nth-child(even) .rbc-time-slot { background-color: #ffffff; }

      @media (max-width: 1400px) and (min-width: 991px) {
        .rbc-time-view { padding-right: 2%; }
      }
      @media (max-width: 991px) and (min-width: 320px) {
        .rbc-time-view { overflow: scroll; width: 800px; }
      }
      @media (max-width: 1300px) and (min-width: 320px) {
        .rbc-time-view, .rbc-month-view, .rbc-agenda-view { width: 800px; overflow: scroll; }
      }

      .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td { border-left: 1px solid #d4c7c7; }
      .rbc-header + .rbc-header { border-left: 1px solid #ececec; }
      .rbc-agenda-view table.rbc-agenda-table thead > tr > th { padding: 3px 21px; }

      @media (max-width: 767px) and (min-width: 320px) {
        .rbc-agenda-table th:nth-child(3), .rbc-agenda-table td:nth-child(3) { min-width: 90px !important; }
      }
      @media (max-width: 768px) {
        .rbc-toolbar { flex-direction: column; align-items: flex-start; }
        .rbc-toolbar-label { margin: 10px 0; }
        .rbc-btn-group { margin-bottom: 10px; }
        .rbc-time-content { min-width: 600px; }
        .rbc-time-header-content { min-width: 600px; }
        .rbc-calendar { min-height: 500px; padding-right: 10% !important; }
      }

      .rbc-event { overflow: visible !important; }
      .rbc-month-row .rbc-event { z-index: 3; }

      .custom-header-cell {
        display: flex; flex-direction: column; justify-content: center;
        height: 100%; padding: 20px 10px; width: 182px; align-items: start;
      }
      .custom-header-cell-day {
        font-size: 10px; color: #71717A; text-transform: uppercase; font-weight: 700;
      }
      .custom-header-cell-date { font-size: 22px; font-weight: 400; color: #000000; }

      /* Day View Styles */
      .custom-day-header { padding: 10px; border-bottom: 1px solid #e5e5e5; }
      .rbc-time-view .rbc-time-header-cell .rbc-header { font-weight: bold; padding: 10px 0; }
      .rbc-time-view .rbc-time-content { border-top: 1px solid #e5e5e5; }
      .rbc-time-view .rbc-time-gutter { font-weight: 500; }
      .rbc-day-slot .rbc-event {
        border-radius: 4px; border: none !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    `}</style>
  );
}
