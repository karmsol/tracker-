-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'ISSUED', 'EMAILED');

-- CreateTable
CREATE TABLE "SalaryProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "baseSalary" INTEGER NOT NULL,
    "hra" INTEGER NOT NULL DEFAULT 0,
    "specialAllowance" INTEGER NOT NULL DEFAULT 0,
    "pfDeduction" INTEGER NOT NULL DEFAULT 0,
    "taxDeduction" INTEGER NOT NULL DEFAULT 0,
    "otherDeduction" INTEGER NOT NULL DEFAULT 0,
    "bankLast4" TEXT,
    "panMasked" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedById" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "baseSalary" INTEGER NOT NULL,
    "hra" INTEGER NOT NULL,
    "specialAllowance" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "pfDeduction" INTEGER NOT NULL,
    "taxDeduction" INTEGER NOT NULL,
    "otherDeduction" INTEGER NOT NULL,
    "totalDeductions" INTEGER NOT NULL,
    "netPay" INTEGER NOT NULL,
    "bankLast4" TEXT,
    "panMasked" TEXT,
    "status" "PayslipStatus" NOT NULL DEFAULT 'ISSUED',
    "notes" TEXT,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryProfile_organizationId_idx" ON "SalaryProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryProfile_organizationId_userId_key" ON "SalaryProfile"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Payslip_organizationId_year_month_idx" ON "Payslip"("organizationId", "year", "month");

-- CreateIndex
CREATE INDEX "Payslip_userId_createdAt_idx" ON "Payslip"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_organizationId_userId_year_month_key" ON "Payslip"("organizationId", "userId", "year", "month");

-- AddForeignKey
ALTER TABLE "SalaryProfile" ADD CONSTRAINT "SalaryProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryProfile" ADD CONSTRAINT "SalaryProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
