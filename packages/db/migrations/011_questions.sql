-- Questions for the analyst ("Why did this move?", "What does this mean?")
-- live with requests, so replies, history, and reply times work the same.
alter table requests drop constraint requests_kind_check;
alter table requests add constraint requests_kind_check check (kind in ('change', 'app', 'issue', 'improvement', 'question'));
