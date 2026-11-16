'use strict';

/**
 * Persistence for AI Health Assessments (FE-04).
 *
 * Assessment answers and results are sensitive health information, so, in line
 * with CS-17, the full payload is stored only as AES-256-GCM ciphertext. The
 * plaintext columns are limited to what the history list and trend chart need
 * (score, band, risk level) and carry no raw measurements or answers.
 *
 * Every query is scoped by user_id. The id alone is never enough to read or
 * delete a record, which prevents one user reading another's assessment by
 * guessing ids (IDOR).
 */

const { encryptForDatabase, decryptFromDatabase } = require('../services/encryptionService');

const TABLE = 'health_assessments';

const SUMMARY_COLUMNS =
  'id, user_id, overall_score, wellness_band, risk_level, ai_model_used, engine_version, created_at';

const ENCRYPTED_COLUMNS =
  'encrypted_payload, encryption_iv, encryption_auth_tag, encryption_key_version';

function defaultClient() {
  // Required lazily so unit tests and the questionnaire endpoint do not need a
  // configured database.
  return require('../dbConnection');
}

function toSummary(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    overallScore: Number(row.overall_score),
    band: row.wellness_band,
    risk: row.risk_level,
    aiModelUsed: Boolean(row.ai_model_used),
    engineVersion: row.engine_version,
  };
}

async function decryptRow(row) {
  const payload = await decryptFromDatabase(row, {
    encrypted: 'encrypted_payload',
    iv: 'encryption_iv',
    authTag: 'encryption_auth_tag',
  });
  return { ...payload, id: row.id, createdAt: row.created_at };
}

function createHealthAssessmentRepository(client) {
  const db = () => client || defaultClient();

  return {
    async create(userId, assessment) {
      const encrypted = await encryptForDatabase(assessment);
      const { data, error } = await db()
        .from(TABLE)
        .insert({
          user_id: userId,
          overall_score: assessment.result.overall.score,
          wellness_band: assessment.result.overall.band.key,
          risk_level: assessment.result.overall.risk.key,
          ai_model_used: Boolean(assessment.ai?.model?.available),
          engine_version: assessment.result.engineVersion,
          encrypted_payload: encrypted.encrypted,
          encryption_iv: encrypted.iv,
          encryption_auth_tag: encrypted.authTag,
          encryption_key_version: encrypted.keyVersion,
          encrypted_at: new Date().toISOString(),
        })
        .select(SUMMARY_COLUMNS)
        .single();

      if (error) throw error;
      return toSummary(data);
    },

    async listForUser(userId, { limit = 12 } = {}) {
      const { data, error } = await db()
        .from(TABLE)
        .select(SUMMARY_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(toSummary);
    },

    async findForUser(userId, id) {
      const { data, error } = await db()
        .from(TABLE)
        .select(`${SUMMARY_COLUMNS}, ${ENCRYPTED_COLUMNS}`)
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? decryptRow(data) : null;
    },

    async findLatestForUser(userId) {
      const { data, error } = await db()
        .from(TABLE)
        .select(`${SUMMARY_COLUMNS}, ${ENCRYPTED_COLUMNS}`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? decryptRow(data) : null;
    },

    async deleteForUser(userId, id) {
      const { data, error } = await db()
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
        .select('id');

      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    },
  };
}

module.exports = {
  createHealthAssessmentRepository,
  healthAssessmentRepository: createHealthAssessmentRepository(),
};
