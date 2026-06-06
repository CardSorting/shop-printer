# Day 2 Operations: Extending the Engine

Once you have initialized the WoodBine engine, use this guide to perform common development and operational tasks.

## 🏗 Building New Features

When adding new capabilities, follow the **Joy-Zoning Workflow**:

1. **Domain**: Define your models in `src/domain/models.ts` and rules in `src/domain/rules.ts`.
2. **Infrastructure**: If new storage is required, add or extend a Firestore repository in `src/infrastructure/repositories/firestore/` and expose the contract through `src/domain/repositories.ts`.
3. **Core**: Create or update a service in `src/core/` to orchestrate the new logic. Wire it into `src/core/container.ts`.
4. **API**: Create a Next.js route in `src/app/api/` to expose the service.
5. **UI**: Build the interface in `src/ui/pages/` using the shared components in `src/ui/components/admin/`.

## 🗄 Database Management

WoodBine currently uses Firestore for application persistence.

- **Schema changes**: Update Domain models, repository interfaces, Firestore mappers, and API parsers together.
- **Seeding**: Update `src/infrastructure/services/SeedDataLoader.ts` to include mock data for new features.
- **Backups**: Use Firestore export/scheduled backup tooling for production data. Do not document or rely on local SQLite file copies for the current architecture.
- **Indexes**: Add Firestore composite indexes when new queries require them, then document the query path in the relevant wiki page.

## 🔐 Security & Permissions

- **Adding Admin Routes**: Always wrap your page components in `AdminLayout` and protect your API routes with `requireAdminSession()`.
- **Rate Limiting**: If you add a new public mutation, add a rate-limit bucket in `src/infrastructure/server/apiGuards.ts`.
- **Secrets**: Never hardcode secrets. Use `.env` and access them via `process.env`.

## 📈 Monitoring & Maintenance

- **Audit Logs**: Inspect the `AuditService` logs for sensitive merchant operations.
- **Linting**: Run `npm run lint` before every commit to maintain the industrial code standard.
- **Build Verification**: Run `npm run build` locally to catch Next.js CSR/SSR boundary issues before deployment.

---

## Useful Shortcuts
- **Cmd+K**: Open the Admin Command Palette.
- **npm run setup**: Reset and re-initialize the workspace.
- **npm run dev**: Launch the development engine.
