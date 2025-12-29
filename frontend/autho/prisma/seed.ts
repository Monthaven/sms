import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  "admin",
  "manager",
  "caller",
  "dev",
  "investor",
  "lender",
  "vendor",
  "om_ops",
  "sms_ops",
  "deals_ops",
];

const documents = [
  { kind: "nda", title: "Non-Disclosure Agreement" },
  { kind: "psa", title: "Purchase and Sale Agreement" },
  { kind: "loi", title: "Letter of Intent" },
  { kind: "kyc", title: "KYC / Identity Verification" },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role },
    });
  }

  for (const doc of documents) {
    await prisma.document.upsert({
      where: { kind: doc.kind },
      update: { title: doc.title },
      create: { kind: doc.kind, title: doc.title },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
