const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Help Center...');

    // 1. Categories
    const categories = [
        { name: 'Getting Started', description: 'Everything you need to know to get up and running.', icon: 'Rocket', order: 1 },
        { name: 'Security & Access', description: 'MFA setup, password management, and security best practices.', icon: 'Shield', order: 2 },
        { name: 'Workflows & Approvals', description: 'Learn how to create and manage automated approval workflows.', icon: 'GitBranch', order: 3 },
    ];

    for (const cat of categories) {
        await prisma.helpCategory.upsert({
            where: { name: cat.name },
            update: cat,
            create: cat
        });
    }

    const createdCats = await prisma.helpCategory.findMany();
    const gettingStarted = createdCats.find(c => c.name === 'Getting Started');
    const security = createdCats.find(c => c.name === 'Security & Access');

    // 2. Articles
    const articles = [
        {
            title: 'Welcome to TurHR',
            slug: 'welcome-to-turhr',
            content: 'Welcome to TurHR! This guide will help you navigate the basic features of our platform.\n\n### Navigation\nUse the sidebar to access different modules like Dashboard, Notifications, and Settings.\n\n### Profile Setup\nMake sure to update your profile in the Settings module to ensure all notifications reach the right place.',
            categoryId: gettingStarted.id,
            isPublished: true,
            order: 1
        },
        {
            title: 'Setting up Multi-Factor Authentication',
            slug: 'mfa-setup-guide',
            content: 'Security is our top priority. Follow these steps to enable MFA on your account:\n\n1. Go to **Settings** > **Security**.\n2. Click on **Enable MFA**.\n3. Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.).\n4. Enter the 6-digit code to verify.\n\nOnce enabled, you will need this code every time you log in.',
            categoryId: security.id,
            isPublished: true,
            order: 1
        }
    ];

    for (const art of articles) {
        await prisma.helpArticle.upsert({
            where: { slug: art.slug },
            update: art,
            create: art
        });
    }

    // 3. FAQs
    const faqs = [
        {
            question: 'How do I reset my password?',
            answer: 'You can reset your password from the login page by clicking "Forgot Password" or from your Security Settings if you are already logged in.',
            order: 1
        },
        {
            question: 'What happens if I lose my MFA device?',
            answer: 'Please contact your system administrator. They can temporarily disable MFA for your account so you can set it up on a new device.',
            order: 2
        }
    ];

    for (const faq of faqs) {
        await prisma.fAQ.create({ data: faq });
    }

    console.log('Help Center seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
