-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProcessType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "entryDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    "archiveReason" TEXT,
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Piece" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "measures" TEXT,
    "description" TEXT,
    "notes" TEXT,
    CONSTRAINT "Piece_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteStep" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pieceId" INTEGER NOT NULL,
    "processTypeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "note" TEXT,
    CONSTRAINT "RouteStep_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RouteStep_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "ProcessType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pieceId" INTEGER NOT NULL,
    "deliveredAt" DATETIME NOT NULL,
    "note" TEXT,
    "registeredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "stepName" TEXT,
    "detail" TEXT,
    "userId" INTEGER,
    CONSTRAINT "LogEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessType_name_key" ON "ProcessType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Piece_orderId_key" ON "Piece"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStep_pieceId_position_key" ON "RouteStep"("pieceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_pieceId_key" ON "Delivery"("pieceId");

-- CreateIndex
CREATE INDEX "LogEntry_orderId_idx" ON "LogEntry"("orderId");

-- CreateIndex
CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");

-- Bitácora inmutable (RN-16): no se permite editar ni borrar eventos.
CREATE TRIGGER "LogEntry_no_update" BEFORE UPDATE ON "LogEntry"
BEGIN SELECT RAISE(ABORT, 'La bitácora no se puede modificar'); END;

CREATE TRIGGER "LogEntry_no_delete" BEFORE DELETE ON "LogEntry"
BEGIN SELECT RAISE(ABORT, 'La bitácora no se puede borrar'); END;
