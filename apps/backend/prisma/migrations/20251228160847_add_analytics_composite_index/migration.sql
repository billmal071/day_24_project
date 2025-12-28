-- CreateIndex
CREATE INDEX "request_logs_api_key_id_status_code_timestamp_idx" ON "request_logs"("api_key_id", "status_code", "timestamp" DESC);
