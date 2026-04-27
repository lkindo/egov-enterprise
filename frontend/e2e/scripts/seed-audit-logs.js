const { Client } = require('pg');

async function seed() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'egov',
        password: 'egov123',
        database: 'egovdb',
    });

    try {
        await client.connect();
        console.log('>>> Connected to DB');

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const logs = [
            ['REQ_20260427_0001', 'AuthService', 'login', 'AUTH', 'webmaster', today],
            ['REQ_20260427_0002', 'UserService', 'createUser', 'USER', 'webmaster', today],
            ['REQ_20260427_0003', 'BoardService', 'deleteArticle', 'DELETE', 'webmaster', today],
            ['REQ_20260427_0004', 'SystemConfigService', 'updateCode', 'SYS', 'webmaster', today],
            ['REQ_20260427_0005', 'AuthService', 'logout', 'AUTH', 'webmaster', today],
        ];

        for (const log of logs) {
            await client.query(
                'INSERT INTO NSYSLOG (REQUST_ID, SVC_NM, METHOD_NM, PROCESS_SE_CODE, RQESTER_ID, OCCRRNC_DE) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (REQUST_ID) DO NOTHING',
                log
            );
        }

        console.log('>>> Successfully seeded 5 audit logs.');
    } catch (err) {
        console.error('>>> Error seeding logs:', err);
    } finally {
        await client.end();
    }
}

seed();
