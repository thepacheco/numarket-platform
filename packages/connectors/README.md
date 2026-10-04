# packages/connectors (Stage B)

Connector framework (Spec §7.6) and one folder per source. Build order: file
uploads, SharePoint/OneDrive, Google Drive, QuickBooks Online, Procore. Every
connector is read-only, incremental, idempotent, and writes a run record.
