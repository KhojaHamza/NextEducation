CREATE OR REPLACE FUNCTION prevent_sent_message_change() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'SENT' THEN
    RAISE EXCEPTION 'Sent messages are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_immutable
BEFORE UPDATE OR DELETE ON "messages"
FOR EACH ROW EXECUTE FUNCTION prevent_sent_message_change();

CREATE OR REPLACE FUNCTION prevent_announcement_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Announcements are immutable: publish a corrective announcement instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_immutable
BEFORE UPDATE OR DELETE ON "announcements"
FOR EACH ROW EXECUTE FUNCTION prevent_announcement_change();