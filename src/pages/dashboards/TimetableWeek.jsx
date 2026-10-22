import '../css/Timetable.css';
import { weekdays } from './timetableConstants';

export default function TimetableWeek({
  entries,
  emptyMessage,
  showTeacher = false,
  onEdit,
  onDelete,
  pendingDeleteId = '',
}) {
  if (!entries.length) {
    return <p className="timetable-empty">{emptyMessage}</p>;
  }

  return (
    <div className="timetable-week-wrap">
      <div className="timetable-week">
        {weekdays.map((day) => {
          const dayEntries = entries
            .filter((entry) => Number(entry.day_of_week) === day.value)
            .sort((first, second) => first.start_time.localeCompare(second.start_time));

          return (
            <section className="timetable-day" key={day.value} aria-label={day.label}>
              <h3>{day.label}</h3>
              <div className="timetable-day-courses">
                {dayEntries.length ? dayEntries.map((entry) => (
                  <article className="timetable-course" key={entry.id}>
                    <div className="timetable-course-time">
                      <strong>{entry.start_time}</strong>
                      <span>{entry.end_time}</span>
                    </div>
                    <div className="timetable-course-details">
                      <strong>{entry.assignment.subject}</strong>
                      <span>{entry.assignment.class.name}</span>
                      {showTeacher && (
                        <span>{entry.assignment.teacher.firstname} {entry.assignment.teacher.lastname}</span>
                      )}
                      {entry.room && <small>Salle {entry.room}</small>}
                    </div>
                    {(onEdit || onDelete) && (
                      <div className="timetable-course-actions">
                        {onEdit && <button type="button" onClick={() => onEdit(entry)}>Modifier</button>}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(entry)}
                            disabled={pendingDeleteId === String(entry.id)}
                          >
                            {pendingDeleteId === String(entry.id) ? 'Suppression…' : 'Supprimer'}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )) : <p className="timetable-day-empty">Aucun cours</p>}
              </div>
              <span className="timetable-day-count">{dayEntries.length} cours</span>
            </section>
          );
        })}
      </div>
    </div>
  );
}
