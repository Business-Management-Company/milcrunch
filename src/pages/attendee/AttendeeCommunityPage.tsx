import AttendeeLayout, { useAttendeeEvent } from "@/components/layout/AttendeeLayout";
import AttendeeCommunity from "./AttendeeCommunity";

const AttendeeCommunityPageContent = () => {
  const { event } = useAttendeeEvent();
  return (
    <AttendeeCommunity
      eventId={event.id}
      event={{ title: event.title, start_date: event.start_date }}
    />
  );
};

const AttendeeCommunityPage = () => (
  <AttendeeLayout activeTab="community">
    <AttendeeCommunityPageContent />
  </AttendeeLayout>
);

export default AttendeeCommunityPage;
