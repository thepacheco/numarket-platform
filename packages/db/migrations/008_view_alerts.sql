-- Alerts made from a view in Explore: "tell me when something new matches
-- these filters" or "when this column's total crosses a line". The view and
-- the condition live in params.
alter table alert_rules drop constraint alert_rules_kind_check;
alter table alert_rules add constraint alert_rules_kind_check
  check (kind in ('job_over_budget', 'ar_over_60', 'rfi_waiting', 'cash_below', 'flag_opened', 'weekly_summary', 'view'));
