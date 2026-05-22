# Toon Ranks Email Aliases

The public website should keep `Toon Ranks` as the product brand and use `support@toonranks.com` for user-facing contact links. Other aliases exist for backend/system workflows and future product areas.

## Alias Map

| Purpose | Alias | Frontend usage |
| --- | --- | --- |
| Human support/contact | `support@toonranks.com` | Contact page, Terms, Privacy, and public support metadata. |
| Signup verification | `noreply@toonranks.com` | Backend sender for verification emails. Do not use as a public contact link. |
| Password reset | `accounts@toonranks.com` | Backend sender for password reset emails. Do not use as a public contact link. |
| Billing/subscription | `billing@toonranks.com` | Reserved for future subscription and billing UI. |
| Internal/admin alerts | `admin@toonranks.com` | Reserved for internal notifications. Do not expose as public support. |

## Implementation Notes

Shared constants live in `src/config/site.ts`.

- Use `CONTACT_EMAIL` or `SUPPORT_EMAIL` for public pages.
- Use `BILLING_EMAIL` only when a billing/subscription UI exists.
- Do not display `VERIFICATION_EMAIL`, `PASSWORD_RESET_EMAIL`, or `ADMIN_EMAIL` as general user support addresses.
- Avoid committing SMTP credentials, email app passwords, or secret manager values to this repository.
