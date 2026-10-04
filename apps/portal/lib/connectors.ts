/* The connector catalog clients see (Spec §7.2). Tier A is standard and
   included; B needs a one-time setup; C is built as an Engineering project.
   Every connection is read-only. */

export type Connector = {
  id: string;
  name: string;
  category: string;
  tier: "A" | "B" | "C";
  how: "oauth" | "folder" | "upload" | "dbuser" | "export" | "custom";
  streams: string[];
  note?: string;
};

export const TIER_LABEL = { A: "Standard", B: "Setup required", C: "Custom" } as const;
export const TIER_ABOUT = {
  A: "Included in your plan. Counts as one source.",
  B: "Counts as one source, plus a one-time setup with your IT.",
  C: "Built for you as an Engineering project, quoted first.",
} as const;
export const HOW_LABEL = {
  oauth: "Official connection: you sign in to the tool and click Allow",
  folder: "Folder sync: point us at one shared folder",
  upload: "Upload files here in the Portal",
  dbuser: "Read-only database user, set up with your IT",
  export: "Scheduled file export from the system",
  custom: "Built for you",
} as const;

export const CONNECTORS: Connector[] = [
  { id: "quickbooks_online", name: "QuickBooks Online", category: "Accounting", tier: "A", how: "oauth", streams: ["Invoices", "Bills", "Journal entries", "Customers", "Vendors", "Classes"] },
  { id: "xero", name: "Xero", category: "Accounting", tier: "A", how: "oauth", streams: ["Invoices", "Bills", "Journals", "Contacts"] },
  { id: "sage_intacct", name: "Sage Intacct", category: "Accounting", tier: "A", how: "oauth", streams: ["GL entries", "AR", "AP", "Projects"] },
  { id: "quickbooks_desktop", name: "QuickBooks Desktop", category: "Accounting", tier: "B", how: "export", streams: ["Scheduled report exports"], note: "Desktop has no cloud connection, so it sends scheduled exports to a shared folder." },
  { id: "netsuite", name: "NetSuite", category: "Accounting", tier: "B", how: "oauth", streams: ["Transactions", "Customers", "Vendors", "Items"] },
  { id: "business_central", name: "Microsoft Dynamics 365 Business Central", category: "Accounting", tier: "B", how: "oauth", streams: ["G/L entries", "Customers", "Vendors"] },
  { id: "procore", name: "Procore", category: "Construction and projects", tier: "A", how: "oauth", streams: ["Projects", "Budgets", "Commitments", "Change orders", "RFIs"] },
  { id: "smartsheet", name: "Smartsheet", category: "Construction and projects", tier: "A", how: "oauth", streams: ["Sheets you choose"] },
  { id: "viewpoint_vista", name: "Viewpoint Vista", category: "Construction and projects", tier: "B", how: "dbuser", streams: ["Job cost", "AP", "AR", "Payroll"] },
  { id: "upload", name: "Excel and CSV files", category: "Files and spreadsheets", tier: "A", how: "upload", streams: ["Any file that matches a template"] },
  { id: "google_drive", name: "Google Sheets and Drive", category: "Files and spreadsheets", tier: "A", how: "folder", streams: ["Sheets and files in one folder"] },
  { id: "sharepoint", name: "SharePoint and OneDrive", category: "Files and spreadsheets", tier: "A", how: "folder", streams: ["Excel files in one folder"] },
  { id: "sftp", name: "SFTP drop", category: "Files and spreadsheets", tier: "B", how: "export", streams: ["Nightly files from any system"] },
  { id: "gusto", name: "Gusto", category: "Payroll and HR", tier: "A", how: "oauth", streams: ["Payroll runs", "Hours", "Departments"] },
  { id: "adp", name: "ADP", category: "Payroll and HR", tier: "A", how: "oauth", streams: ["Pay rates", "Hours"] },
  { id: "hubspot", name: "HubSpot", category: "Sales and payments", tier: "A", how: "oauth", streams: ["Deals", "Companies", "Contacts"] },
  { id: "salesforce", name: "Salesforce", category: "Sales and payments", tier: "A", how: "oauth", streams: ["Opportunities", "Accounts"] },
  { id: "stripe", name: "Stripe", category: "Sales and payments", tier: "A", how: "oauth", streams: ["Charges", "Payouts", "Customers"] },
  { id: "square", name: "Square", category: "Sales and payments", tier: "A", how: "oauth", streams: ["Sales", "Items", "Locations"] },
  { id: "sql", name: "SQL Server, PostgreSQL, or MySQL", category: "Databases and other systems", tier: "B", how: "dbuser", streams: ["Tables you choose, read-only"] },
  { id: "other", name: "Something else", category: "Databases and other systems", tier: "C", how: "custom", streams: ["Whatever your system can export or be read from"], note: "If your system can export or be read, we can take it. Your Readiness Check says which path and what it costs." },
];

export const connectorById = (id: string) => CONNECTORS.find((c) => c.id === id);
