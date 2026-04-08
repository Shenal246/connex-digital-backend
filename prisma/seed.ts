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

    const resourceDefs: { moduleKey: string; name: string; key: string; actions: string[] }[] = [
        // IAM
        { moduleKey: 'iam', name: 'Users', key: 'users', actions: crudActions },
        { moduleKey: 'iam', name: 'Roles & Permissions', key: 'roles', actions: crudActions },
        // HR Ops
        { moduleKey: 'hr_ops', name: 'Employees', key: 'employees', actions: crudActions },
        { moduleKey: 'hr_ops', name: 'Organization Structure', key: 'org', actions: crudActions },
        { moduleKey: 'hr_ops', name: 'Company Tree', key: 'tree', actions: ['READ'] },
        { moduleKey: 'hr_ops', name: 'Manpower Requisitions', key: 'requisitions', actions: crudActions },
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

        }
    }

    console.log('✅ Resources & permissions seeded');

    // ── 4. HR INITIAL DATA ──────────────────────────────────────────────────
    console.log('🏢 Seeding initial HR data...');
    const itDept = await prisma.department.upsert({
        where: { id: 'seed-dept-it' },
        update: {},
        create: { id: 'seed-dept-it', name: 'Information Technology', description: 'Core IT and Infrastructure' },
    });

    const hrDept = await prisma.department.upsert({
        where: { id: 'seed-dept-hr' },
        update: {},
        create: { id: 'seed-dept-hr', name: 'Human Resources', description: 'HR and People Operations' },
    });

    await prisma.designation.upsert({
        where: { id: 'seed-desig-se' },
        update: {},
        create: { id: 'seed-desig-se', name: 'Software Engineer', departmentId: itDept.id },
    });

    await prisma.designation.upsert({
        where: { id: 'seed-desig-hrm' },
        update: {},
        create: { id: 'seed-desig-hrm', name: 'HR Manager', departmentId: hrDept.id },
    });

    console.log('👥 Seeding employee hierarchy...');
    const ceo = await prisma.employee.upsert({
        where: { employeeId: 'EMP-001' },
        update: {},
        create: {
            employeeId: 'EMP-001',
            firstName: 'Sarah',
            lastName: 'Chief',
            gender: 'FEMALE',
            dateOfBirth: new Date('1980-01-01'),
            joinDate: new Date('2020-01-01'),
            status: 'ACTIVE',
            department: { connect: { id: hrDept.id } },
            designation: { connect: { id: 'seed-desig-hrm' } },
        }
    });

    const cto = await prisma.employee.upsert({
        where: { employeeId: 'EMP-002' },
        update: {},
        create: {
            employeeId: 'EMP-002',
            firstName: 'Mike',
            lastName: 'Tech',
            gender: 'MALE',
            dateOfBirth: new Date('1985-01-01'),
            joinDate: new Date('2021-01-01'),
            status: 'ACTIVE',
            department: { connect: { id: itDept.id } },
            designation: { connect: { id: 'seed-desig-se' } },
            reportsTo: { connect: { id: ceo.id } },
        }
    });

    await prisma.employee.upsert({
        where: { employeeId: 'EMP-003' },
        update: {},
        create: {
            employeeId: 'EMP-003',
            firstName: 'John',
            lastName: 'Dev',
            gender: 'MALE',
            dateOfBirth: new Date('1995-01-01'),
            joinDate: new Date('2023-01-01'),
            status: 'PROBATION',
            department: { connect: { id: itDept.id } },
            designation: { connect: { id: 'seed-desig-se' } },
            reportsTo: { connect: { id: cto.id } },
        }
    });

    // ── 5. USERS ─────────────────────────────────────────────────────────────
    console.log('🔑 Seeding platform users...');
    const superAdminHash = await argon2.hash('Password123!');
    const hrAdminHash = await argon2.hash('Password123!');

    await prisma.user.upsert({
        where: { email: 'shenal@connexcodeworks.biz' },
        update: { 
            roleId: superAdminRole.id,
            employeeId: ceo.id 
        },
        create: {
            email: 'shenal@connexcodeworks.biz',
            name: 'Master SuperAdmin',
            passwordHash: superAdminHash,
            roleId: superAdminRole.id,
            employeeId: ceo.id,
        },
    });

    await prisma.user.upsert({
        where: { email: 'hradmin@demo.com' },
        update: { 
            roleId: hrAdminRole.id,
            employeeId: cto.id
        },
        create: {
            email: 'hradmin@demo.com',
            name: 'HR Administrator',
            passwordHash: hrAdminHash,
            roleId: hrAdminRole.id,
            employeeId: cto.id,
        },
    });

    console.log('✅ Demo users & HR hierarchy created');
    console.log('');
    console.log('🎉 Seed complete! Credentials:');
    console.log('   shenal@connexcodeworks.biz  /  Password123!  (SuperAdmin)');
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
