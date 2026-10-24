/* The words a workspace uses for its own business. The screens are the same
   for every industry; the nouns change. Keys stay the same underneath
   (a "job" in the data is a project for a services firm). */

export type Industry = "construction" | "services";
export const INDUSTRIES: Industry[] = ["construction", "services"];

export type Vocab = {
  industry: Industry;
  label: string; // "Construction"
  company: string; // the kind of company, for copy
  job: string; // "job" | "project"
  jobs: string;
  Job: string;
  Jobs: string;
  customer: string; // "customer" | "client"
  Customer: string;
  customers: string;
  Customers: string;
  rfi: string; // "RFI" | "client request"
  rfis: string;
  Rfis: string;
  rfiShort: string; // column header
  rfiCol: string; // "RFI" | "Request"
  changeOrder: string; // "change order" | "scope change"
  changeOrders: string;
  ChangeOrder: string;
  ChangeOrders: string;
  hours: string; // "crew hours" | "billable hours"
  Hours: string;
  hoursPage: string; // dashboard page title
  fieldReport: string; // "daily field report" | "time entry"
  FieldReport: string;
  fieldReports: string;
  FieldReports: string;
  fieldReportsLong: string; // "Daily field reports" | "Time entries"
  fieldPerson: string; // "superintendent" | "consultant"
  waitingOn: string; // "Waiting on"
  laborCost: string; // "Labor cost"
  costPerfNote: string; // what spending means for this industry
};

export const CONSTRUCTION: Vocab = {
  industry: "construction",
  label: "Construction",
  company: "construction company",
  job: "job",
  jobs: "jobs",
  Job: "Job",
  Jobs: "Jobs",
  customer: "customer",
  Customer: "Customer",
  customers: "customers",
  Customers: "Customers",
  rfi: "RFI",
  rfis: "RFIs",
  Rfis: "RFIs",
  rfiShort: "Open RFIs",
  rfiCol: "RFI",
  changeOrder: "change order",
  changeOrders: "change orders",
  ChangeOrder: "Change order",
  ChangeOrders: "Change orders",
  hours: "crew hours",
  Hours: "Crew hours",
  hoursPage: "Field hours",
  fieldReport: "daily field report",
  FieldReport: "Daily field report",
  fieldReports: "field reports",
  FieldReports: "Field reports",
  fieldReportsLong: "Daily field reports",
  fieldPerson: "superintendent",
  waitingOn: "Waiting on",
  laborCost: "Labor cost",
  costPerfNote: "job costs",
};

export const SERVICES: Vocab = {
  industry: "services",
  label: "Professional services",
  company: "professional services firm",
  job: "project",
  jobs: "projects",
  Job: "Project",
  Jobs: "Projects",
  customer: "client",
  Customer: "Client",
  customers: "clients",
  Customers: "Clients",
  rfi: "client request",
  rfis: "client requests",
  Rfis: "Client requests",
  rfiShort: "Waiting on client",
  rfiCol: "Request",
  changeOrder: "scope change",
  changeOrders: "scope changes",
  ChangeOrder: "Scope change",
  ChangeOrders: "Scope changes",
  hours: "billable hours",
  Hours: "Billable hours",
  hoursPage: "Team hours",
  fieldReport: "time entry",
  FieldReport: "Time entry",
  fieldReports: "time entries",
  FieldReports: "Time entries",
  fieldReportsLong: "Time entries",
  fieldPerson: "consultant",
  waitingOn: "Waiting on",
  laborCost: "Cost of hours",
  costPerfNote: "project costs",
};

export const vocabFor = (i: string | null | undefined): Vocab => (i === "services" ? SERVICES : CONSTRUCTION);
