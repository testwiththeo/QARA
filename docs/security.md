# Security

## Encryption

| Layer | Standard |
|---|---|
| In Transit | TLS 1.3, mTLS between internal services |
| At Rest | AES-256-GCM |
| Secrets | HashiCorp Vault, auto-rotation every 24h |
| PII | Column-level encryption (pgcrypto) |
| API Keys | bcrypt hash, shown once on creation |
| Media | S3 SSE-S3 encryption |

## Tenant Isolation

- **PostgreSQL**: Row-level security policies on every table
- **Qdrant**: Separate collections per tenant
- **S3**: Prefix isolation (`s3://qara-captures/{tenant_id}/`)
- **API**: Tenant ID embedded in JWT, validated on every request

## Authentication

```
JWT with:
  - sub: user_id
  - tenant_id
  - role: admin | qa_lead | qa_engineer | dev | manager | viewer
  - exp: 24h (refresh with refresh_token)
  - jti: unique token ID (revocable)

API Keys:
  - Prefix: qara_sk_ (secret key), qara_pk_ (public key)
  - Rate limited per key
  - Revocable instantly
```

## Audit Trail

Every state change is logged:
- Actor (user_id or system)
- Action (created, updated, triaged, assigned, etc.)
- Entity (type + id)
- Before/after snapshot (JSON diff)
- Timestamp (monotonic, atomic clock)
- Request ID (end-to-end tracing)
- IP + user agent

Retention: 90 days hot, 1 year cold storage.

## Compliance

- **SOC 2** Type II (target)
- **GDPR** — data export, deletion, consent logging
- **Data Processing Agreement** available for enterprise
- **SSO/SAML** for enterprise tier
- **On-premise** deployment option for regulated industries

## Rate Limits

| Tier | Limit |
|---|---|
| Free | 10 req/min |
| Pro | 100 req/min |
| Enterprise | Custom |
