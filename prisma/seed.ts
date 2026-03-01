import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create users
    const passwordHash = await hash('Change@123', 12);

    const manager = await prisma.user.upsert({
        where: { email: 'manager@cashflow.com' },
        update: {},
        create: {
            name: 'Rajesh Kumar',
            email: 'manager@cashflow.com',
            password_hash: passwordHash,
            role: 'STORE_MANAGER',
            must_change_password: true,
        },
    });

    const runner = await prisma.user.upsert({
        where: { email: 'runner@cashflow.com' },
        update: {},
        create: {
            name: 'Suresh Yadav',
            email: 'runner@cashflow.com',
            password_hash: passwordHash,
            role: 'RUNNER',
            must_change_password: true,
        },
    });

    const accountant = await prisma.user.upsert({
        where: { email: 'accountant@cashflow.com' },
        update: {},
        create: {
            name: 'Priya Sharma',
            email: 'accountant@cashflow.com',
            password_hash: passwordHash,
            role: 'ACCOUNTANT',
            must_change_password: true,
        },
    });

    const ceo = await prisma.user.upsert({
        where: { email: 'ceo@cashflow.com' },
        update: {},
        create: {
            name: 'Vikram Mehta',
            email: 'ceo@cashflow.com',
            password_hash: passwordHash,
            role: 'CEO',
            must_change_password: true,
        },
    });

    console.log('Users created:', { manager: manager.id, runner: runner.id, accountant: accountant.id, ceo: ceo.id });

    // Create vendors
    const vendor1 = await prisma.vendor.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Surat Textile Mart',
            gstin: '24AABCS1234H1Z5',
            contact_person: 'Mohammad Ali',
            phone: '+91-9876543210',
            address: 'Ring Road, Surat, Gujarat',
        },
    });

    const vendor2 = await prisma.vendor.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Delhi Trims Wholesale',
            gstin: '07AABCT5678J2Z3',
            contact_person: 'Amit Gupta',
            phone: '+91-9812345678',
            address: 'Chandni Chowk, Delhi',
        },
    });

    const vendor3 = await prisma.vendor.upsert({
        where: { id: '00000000-0000-0000-0000-000000000003' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000003',
            name: 'Ludhiana Thread Works',
            contact_person: 'Harpreet Singh',
            phone: '+91-9988776655',
            address: 'Industrial Area, Ludhiana, Punjab',
        },
    });

    console.log('Vendors created');

    // Create buyers
    const buyer1 = await prisma.buyer.upsert({
        where: { brand_code: 'ZRA-IN' },
        update: {},
        create: {
            name: 'Zara India',
            brand_code: 'ZRA-IN',
            contact_details: 'procurement@zara.in',
        },
    });

    const buyer2 = await prisma.buyer.upsert({
        where: { brand_code: 'HNM-IN' },
        update: {},
        create: {
            name: 'H&M India',
            brand_code: 'HNM-IN',
            contact_details: 'sourcing@hm.in',
        },
    });

    const buyer3 = await prisma.buyer.upsert({
        where: { brand_code: 'MAX-IN' },
        update: {},
        create: {
            name: 'Max Fashion',
            brand_code: 'MAX-IN',
            contact_details: 'orders@maxfashion.in',
        },
    });

    console.log('Buyers created');

    // Create orders
    const order1 = await prisma.order.upsert({
        where: { order_reference: 'ZRA-2026-SS-001' },
        update: {},
        create: {
            order_reference: 'ZRA-2026-SS-001',
            buyer_id: buyer1.id,
            style_name: 'Casual Shirt - Slim Fit',
            season: 'SS2026',
            remarks: 'Spring/Summer 2026 collection',
        },
    });

    const order2 = await prisma.order.upsert({
        where: { order_reference: 'HNM-2026-AW-015' },
        update: {},
        create: {
            order_reference: 'HNM-2026-AW-015',
            buyer_id: buyer2.id,
            style_name: 'Denim Jacket - Oversized',
            season: 'AW2026',
        },
    });

    const order3 = await prisma.order.upsert({
        where: { order_reference: 'MAX-2026-001' },
        update: {},
        create: {
            order_reference: 'MAX-2026-001',
            buyer_id: buyer3.id,
            style_name: 'Kurta - Regular Fit',
            season: 'Festive2026',
        },
    });

    console.log('Orders created');

    // Create materials
    const mat1 = await prisma.material.upsert({
        where: { sku_code: 'FAB-COT-001' },
        update: {},
        create: {
            sku_code: 'FAB-COT-001',
            description: 'Cotton Fabric 60 inch',
            category: 'Fabric',
            unit_of_measure: 'meters',
            default_rate: 120,
        },
    });

    const mat2 = await prisma.material.upsert({
        where: { sku_code: 'FAB-DEN-001' },
        update: {},
        create: {
            sku_code: 'FAB-DEN-001',
            description: 'Denim Fabric 12oz',
            category: 'Fabric',
            unit_of_measure: 'meters',
            default_rate: 280,
        },
    });

    const mat3 = await prisma.material.upsert({
        where: { sku_code: 'TRM-BTN-001' },
        update: {},
        create: {
            sku_code: 'TRM-BTN-001',
            description: 'Shell Buttons (20mm)',
            category: 'Trims',
            unit_of_measure: 'pieces',
            default_rate: 2.5,
        },
    });

    const mat4 = await prisma.material.upsert({
        where: { sku_code: 'TRM-THR-001' },
        update: {},
        create: {
            sku_code: 'TRM-THR-001',
            description: 'Polyester Thread (White)',
            category: 'Thread',
            unit_of_measure: 'kg',
            default_rate: 450,
        },
    });

    const mat5 = await prisma.material.upsert({
        where: { sku_code: 'FAB-SLK-001' },
        update: {},
        create: {
            sku_code: 'FAB-SLK-001',
            description: 'Silk Blend Fabric',
            category: 'Fabric',
            unit_of_measure: 'meters',
            default_rate: 650,
        },
    });

    const mat6 = await prisma.material.upsert({
        where: { sku_code: 'TRM-ZIP-001' },
        update: {},
        create: {
            sku_code: 'TRM-ZIP-001',
            description: 'YKK Zipper (18cm)',
            category: 'Trims',
            unit_of_measure: 'pieces',
            default_rate: 15,
        },
    });

    console.log('Materials created');

    // Create sample material requests
    const mr1 = await prisma.materialRequest.upsert({
        where: { request_no: 'MR-2026-0001' },
        update: {},
        create: {
            request_no: 'MR-2026-0001',
            manager_id: manager.id,
            buyer_id: buyer1.id,
            order_id: order1.id,
            store_location: 'Main Store',
            expected_date: new Date('2026-03-10'),
            remarks: 'Urgent - production starting next week',
            status: 'PENDING_PURCHASE',
            lines: {
                create: [
                    { material_id: mat1.id, quantity: 500, expected_rate: 120, expected_amount: 60000 },
                    { material_id: mat3.id, description: 'White shell buttons', quantity: 2000, expected_rate: 2.5, expected_amount: 5000 },
                    { material_id: mat4.id, quantity: 5, expected_rate: 450, expected_amount: 2250 },
                ],
            },
        },
    });

    const mr2 = await prisma.materialRequest.upsert({
        where: { request_no: 'MR-2026-0002' },
        update: {},
        create: {
            request_no: 'MR-2026-0002',
            manager_id: manager.id,
            buyer_id: buyer2.id,
            order_id: order2.id,
            store_location: 'Main Store',
            status: 'PENDING_PURCHASE',
            lines: {
                create: [
                    { material_id: mat2.id, quantity: 300, expected_rate: 280, expected_amount: 84000 },
                    { material_id: mat6.id, quantity: 500, expected_rate: 15, expected_amount: 7500 },
                ],
            },
        },
    });

    console.log('Material requests created');
    console.log('');
    console.log('Seed completed successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Store Manager: manager@cashflow.com / Change@123');
    console.log('  Runner:        runner@cashflow.com / Change@123');
    console.log('  Accountant:    accountant@cashflow.com / Change@123');
    console.log('  CEO:           ceo@cashflow.com / Change@123');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
