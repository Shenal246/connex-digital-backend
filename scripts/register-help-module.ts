import { prisma } from '../src/common/utils/db';

async function registerHelpModule() {
    console.log('Registering Help Center module in IAM (Simplified)...');

    try {
        // 1. Register Module
        const helpModule = await prisma.systemModule.upsert({
            where: { key: 'help_center' },
            update: {
                name: 'Help Center',
                icon: 'HelpCircle',
                route: '/admin/help',
                order: 10
            },
            create: {
                name: 'Help Center',
                key: 'help_center',
                icon: 'HelpCircle',
                route: '/admin/help',
                order: 10
            }
        });

        console.log('Module registered:', helpModule.name);

        // 2. Register Single Management Resource
        const resource = await prisma.resource.upsert({
            where: { moduleId_key: { moduleId: helpModule.id, key: 'management' } },
            update: { name: 'Management' },
            create: {
                moduleId: helpModule.id,
                name: 'Management',
                key: 'management'
            }
        });
        console.log(`Resource registered: Management`);

        // 3. Register single ACCESS permission
        await prisma.permission.upsert({
            where: { resourceId_action: { resourceId: resource.id, action: 'ACCESS' } },
            update: {},
            create: { resourceId: resource.id, action: 'ACCESS' }
        });
        console.log(`Permission created: help_center.management.ACCESS`);

        // 4. Cleanup old resources (Optional but recommended by user request "Without adding as seperate modules")
        // We delete the granular resources since they are no longer needed
        const oldResourceKeys = ['articles', 'categories', 'faqs'];
        await prisma.resource.deleteMany({
            where: {
                moduleId: helpModule.id,
                key: { in: oldResourceKeys }
            }
        });
        console.log('Granular resources cleaned up.');

        console.log('Simplified IAM registration for Help Center completed successfully.');

    } catch (error) {
        console.error('Error registering help module:', error);
    } finally {
        await prisma.$disconnect();
    }
}

registerHelpModule();
