const test = require('node:test');
const assert = require('node:assert/strict');

const {
    assertReadOnlyQuery,
    executableSql,
    readDbConfig,
    readQuery,
} = require('./db-bridge');

test('allows the supported read-only query families', () => {
    for (const query of [
        'SELECT * FROM information_schema.tables',
        'WITH rows AS (SELECT 1 AS id) SELECT * FROM rows',
        'SHOW transaction_read_only',
        'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM meta_standard_words',
        'VALUES (1), (2);',
    ]) {
        assert.doesNotThrow(() => assertReadOnlyQuery(query), query);
    }
});

test('allows semicolons and write-looking words only when they are data or comments', () => {
    const query = "SELECT 'DELETE FROM tb_user_info; UPDATE x' AS sample /* DROP TABLE x; */;";
    assert.equal(assertReadOnlyQuery(query), query.slice(0, -1));
    assert.doesNotMatch(executableSql(query), /delete|update|drop/i);
});

test('rejects multiple statements', () => {
    assert.throws(() => assertReadOnlyQuery('SELECT 1; SELECT 2'), /Multiple SQL statements/);
});

test('rejects DML, DDL and transaction control', () => {
    for (const query of [
        "INSERT INTO tb_user_info(user_id) VALUES ('attacker')",
        "UPDATE tb_user_info SET user_nm = 'attacker'",
        'DELETE FROM tb_user_info',
        'DROP TABLE tb_user_info',
        'ALTER TABLE tb_user_info ADD COLUMN unsafe text',
        'TRUNCATE tb_user_info',
        'BEGIN',
        'COMMIT',
    ]) {
        assert.throws(() => assertReadOnlyQuery(query), /Only read-only|write or transaction-control/, query);
    }
});

test('rejects write CTEs and EXPLAIN of a write', () => {
    assert.throws(
        () => assertReadOnlyQuery('WITH removed AS (DELETE FROM tb_user_info RETURNING *) SELECT * FROM removed'),
        /write or transaction-control/,
    );
    assert.throws(
        () => assertReadOnlyQuery('EXPLAIN ANALYZE DELETE FROM tb_user_info'),
        /write or transaction-control/,
    );
});

test('rejects locking, SELECT INTO and known side-effecting functions', () => {
    for (const query of [
        'SELECT * FROM tb_user_info FOR UPDATE',
        'SELECT * INTO TEMP snapshot FROM tb_user_info',
        "SELECT nextval('sq_user')",
        "SELECT dblink_exec('remote', 'DELETE FROM target')",
    ]) {
        assert.throws(
            () => assertReadOnlyQuery(query),
            /not allowed|side-effecting|write or transaction-control/,
            query,
        );
    }
});

test('rejects unterminated strings and comments', () => {
    assert.throws(() => assertReadOnlyQuery("SELECT 'unfinished"), /unterminated/);
    assert.throws(() => assertReadOnlyQuery('SELECT 1 /* unfinished'), /unterminated/);
});

test('requires all connection secrets and validates the port', () => {
    for (const missing of ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD']) {
        const environment = {
            DB_HOST: 'db.example.invalid',
            DB_NAME: 'database',
            DB_USERNAME: 'readonly',
            DB_PASSWORD: 'not-a-real-secret',
        };
        delete environment[missing];
        assert.throws(() => readDbConfig(environment), new RegExp(missing));
    }

    assert.throws(() => readDbConfig({
        DB_HOST: 'db.example.invalid',
        DB_NAME: 'database',
        DB_USERNAME: 'readonly',
        DB_PASSWORD: 'not-a-real-secret',
        DB_PORT: '5432junk',
    }), /DB_PORT/);
});

test('reads inline SQL without treating flags as the query', () => {
    assert.equal(readQuery(['--json', 'SELECT 1']), 'SELECT 1');
    assert.throws(() => readQuery(['--json']), /No query provided/);
});
