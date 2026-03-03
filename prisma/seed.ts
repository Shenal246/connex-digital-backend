import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting full platform seed...');

    // ── 1. ROLES ─────────────────────────────────────────────────────────────
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: { description: 'System-wide full access', isSystem: true },
        create: { name: 'SuperAdmin', description: 'System-wide full access', isSystem: true },
    });

    const hrAdminRole = await prisma.role.upsert({
        where: { name: 'HR Admin' },
        update: {},
        create: { name: 'HR Admin', description: 'Human resources administrator' },
    });

    const hrManagerRole = await prisma.role.upsert({
        where: { name: 'HR Manager' },
        update: {},
        create: { name: 'HR Manager', description: 'HR team manager with approval rights' },
    });

    console.log('✅ Roles created');

    // ── 2. MODULES ────────────────────────────────────────────────────────────
    const modules = [
        { name: 'Security & IAM', key: 'iam', icon: 'Shield', order: 100, route: '/admin' },
        { name: 'HR Operations', key: 'hr_ops', icon: 'Users', order: 200, route: '/hr' },
        { name: 'Workflow Engine', key: 'workflows', icon: 'GitBranch', order: 300, route: '/workflows' },
        { name: 'Audit & Compliance', key: 'audit', icon: 'Activity', order: 400, route: '/admin/audit' },
    ];

    const createdModules: Record<string, { id: string }> = {};
    for (const mod of modules) {
        const m = await prisma.systemModule.upsert({
            where: { key: mod.key },
            update: { name: mod.name, icon: mod.icon, route: mod.route, order: mod.order },
            create: mod,
        });
        createdModules[mod.key] = m;
    }

    console.log('✅ Modules created');

    // ── 3. RESOURCES + PERMISSIONS ───────────────────────────────────────────
    const crudActions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    const allActions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'];

    const resourceDefs: { moduleKey: string; name: string; key: string; actions: string[] }[] = [
        // IAM
        { moduleKey: 'iam', name: 'Users', key: 'users', actions: crudActions },
        { moduleKey: 'iam', name: 'Roles & Permissions', key: 'roles', actions: crudActions },
        // HR Ops
        { moduleKey: 'hr_ops', name: 'Employees', key: 'employees', actions: crudActions },
        { moduleKey: 'hr_ops', name: 'Manpower Requisitions', key: 'requisitions', actions: allActions },
        // Workflow Engine
        { moduleKey: 'workflows', name: 'Workflow Definitions', key: 'workflow_definition', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { moduleKey: 'workflows', name: 'Approval Inbox', key: 'approval_task', actions: ['READ', 'APPROVE'] },
        // Audit
        { moduleKey: 'audit', name: 'Audit Logs', key: 'audit_logs', actions: ['READ'] },
    ];

    for (const resDef of resourceDefs) {
        const moduleId = createdModules[resDef.moduleKey].id;

        const resource = await prisma.resource.upsert({
            where: { moduleId_key: { moduleId, key: resDef.key } },
            update: { name: resDef.name },
            create: { moduleId, name: resDef.name, key: resDef.key },
        });

        for (const action of resDef.actions) {
            const perm = await prisma.permission.upsert({
                where: { resourceId_action: { resourceId: resource.id, action } },
                update: {},
                create: { resourceId: resource.id, action },
            });

            // SuperAdmin gets every permission
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: superAdminRole.id, permissionId: perm.id },
            });

            // HR Admin gets full HR Ops access
            if (resDef.moduleKey === 'hr_ops') {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: hrAdminRole.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: hrAdminRole.id, permissionId: perm.id },
                });
            }

            // HR Manager gets HR Ops READ + APPROVE
            if (resDef.moduleKey === 'hr_ops' && ['READ', 'APPROVE'].includes(action)) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: hrManagerRole.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: hrManagerRole.id, permissionId: perm.id },
                });
            }

            // HR Manager gets Workflow inbox READ + APPROVE
            if (resDef.moduleKey === 'workflows' && resDef.key === 'approval_task') {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: hrManagerRole.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: hrManagerRole.id, permissionId: perm.id },
                });
            }
        }
    }

    console.log('✅ Resources & permissions seeded');

    // ── 4. USERS ─────────────────────────────────────────────────────────────
    const superAdminHash = await argon2.hash('Password123!');
    const hrAdminHash = await argon2.hash('Password123!');

    await prisma.user.upsert({
        where: { email: 'superadmin@demo.com' },
        update: { roleId: superAdminRole.id },
        create: {
            email: 'superadmin@demo.com',
            name: 'Master SuperAdmin',
            passwordHash: superAdminHash,
            roleId: superAdminRole.id,
        },
    });

    await prisma.user.upsert({
        where: { email: 'hradmin@demo.com' },
        update: { roleId: hrAdminRole.id },
        create: {
            email: 'hradmin@demo.com',
            name: 'HR Administrator',
            passwordHash: hrAdminHash,
            roleId: hrAdminRole.id,
        },
    });

    console.log('✅ Demo users created');
    console.log('');
    console.log('🎉 Seed complete! Credentials:');
    console.log('   superadmin@demo.com  /  Password123!  (SuperAdmin)');
    console.log('   hradmin@demo.com     /  Password123!  (HR Admin)');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
