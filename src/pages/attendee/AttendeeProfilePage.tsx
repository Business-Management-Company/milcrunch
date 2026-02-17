import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import AttendeeProfile from "./AttendeeProfile";

const AttendeeProfilePageContent = () => {
  const { event } = useAttendeeEvent();
  return (
    <AttendeeProfile
      eventId={event.id}
      event={{
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        venue: event.venue,
        city: event.city,
        state: event.state,
      }}
    />
  );
};

const AttendeeProfilePage = () => (
  <AttendeeLayout activeTab="profile">
    <AttendeeProfilePageContent />
  </AttendeeLayout>
);

export default AttendeeProfilePage;
