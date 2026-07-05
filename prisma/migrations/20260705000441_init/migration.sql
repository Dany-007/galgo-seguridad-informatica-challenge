-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'analyst', 'viewer', 'service');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "fec_alta" TIMESTAMP(3) NOT NULL,
    "fec_birthday" TIMESTAMP(3) NOT NULL,
    "codigo_zip" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "color_favorito" TEXT NOT NULL,
    "foto_dni" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "auto" TEXT NOT NULL,
    "auto_modelo" TEXT NOT NULL,
    "auto_tipo" TEXT NOT NULL,
    "auto_color" TEXT NOT NULL,
    "cantidad_compras_realizadas" INTEGER NOT NULL,
    "credit_card_enc" BYTEA NOT NULL,
    "credit_card_mask" TEXT NOT NULL,
    "pan_hash" TEXT NOT NULL,
    "credit_card_ccv_enc" BYTEA NOT NULL,
    "cuenta_numero_enc" BYTEA NOT NULL,
    "cuenta_numero_mask" TEXT NOT NULL,
    "geo_latitud_enc" BYTEA NOT NULL,
    "geo_longitud_enc" BYTEA NOT NULL,
    "ip_enc" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'service',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "reason" TEXT,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "records_fetched" INTEGER,
    "records_upserted" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error_message" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_provider_id_key" ON "usuarios"("provider_id");

-- CreateIndex
CREATE INDEX "usuarios_user_name_idx" ON "usuarios"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_username_key" ON "app_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "audit_log_actor_idx" ON "audit_log"("actor");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");
