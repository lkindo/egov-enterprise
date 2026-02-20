package egovframework.com.cop.sms.service.impl;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;

import org.apache.commons.dbcp2.BasicDataSource;
import org.apache.commons.dbcp2.DataSourceConnectionFactory;
import org.apache.commons.dbcp2.PoolableConnection;
import org.apache.commons.dbcp2.PoolableConnectionFactory;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.Globals;

/**
 * ????? DB Util ?????(?????????? Apache commons??DBCP???????? ???????
 * ?? ? (EX : DataSource ??????
 *
 * @author ?????? ????
 * @since 2009.11.24
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.11.24  ????         ????
 *   2017-02-13  ????          ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
 *   2020-07-01  ???         DBCP2 ??????
 *   2025.06.09  ????         PMD???????? ????????-CloseResource(?????), AvoidSynchronizedAtMethodLevel(??????? ???? ???)
 *
 *      </pre>
 **/
public class SmsBasicDBUtil {
	/** Driver load ??? **/
	private static boolean isDriverLoaded = false;

	/** Connection Pool Alias **/
	private static final String JDBC_ALIAS = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_ALIAS");
	/** JDBC Driver ?**/
	private static final String JDBC_DRIVER = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_DRIVER");
	/** JDBC ? URL **/
	private static final String JDBC_URL = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_URL");
	/** JDBC ? ???? **/
	private static final String JDBC_USER = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_USER");
	/** JDBC ? ????? **/
	private static final String JDBC_PASSWORD = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_PASSWORD");
	/** ????pool?? ???????? ? ?????**/
	private static final int MAX_TOTAL = 20;
	/**  pool????? ???? ? ??????**/
	private static final int MAX_IDLE = 10;
	/** ?????? ???pool????????? ?????**/
	private static final int MIN_IDLE = 5;
	// ? ??? 20???maxIdle??10???
	// DB????? ?? 20?? ?????????? 10?? ??????? ??. (10~20?? ???????? ???
	// ?????.)
	// ?? ??IDLE? ?? ??.
	/** ???timeout **/
	private static final int MAX_WAIT_MILLIS = 20000;
	/** auto commit ??? **/
	private static final boolean DEFAULT_AUTOCOMMIT = true;
	/** read only ??? **/
	private static final boolean DEFAULT_READONLY = false;

	/** Logger **/
	private static final Logger LOGGER = LoggerFactory.getLogger(SmsBasicDBUtil.class);

	/**
	 * Connection Pool ??.
	 *
	 * @param alias
	 * @param bds
	 * @throws Exception
	 **/
	protected static void createPools(String alias, BasicDataSource bds) {

		DataSourceConnectionFactory factory = new DataSourceConnectionFactory(bds);
		PoolableConnectionFactory poolableConnectionFactory;

		poolableConnectionFactory = new PoolableConnectionFactory(factory, null);

		// ??? ???? ?
		poolableConnectionFactory.setValidationQuery(" SELECT 1 FROM DUAL ");
		// ????????? ?????
		GenericObjectPoolConfig<PoolableConnection> poolConfig = new GenericObjectPoolConfig<>();
		// ? ??????
		poolConfig.setTimeBetweenEvictionRuns(Duration.ofMillis(1000L * 60L * 1L));
		// ?????? ??? ???? ??????
		poolConfig.setTestWhileIdle(true);
		// ???: false /true ????validationQuery ???????.
		poolConfig.setTestOnBorrow(false);
		// ????? ??
		poolConfig.setMinIdle(bds.getMinIdle());
		//  ????? ??
		poolConfig.setMaxIdle(bds.getMaxIdle());
		// ???? ????
		poolConfig.setMaxTotal(bds.getMaxTotal());
		GenericObjectPool<PoolableConnection> connectionPool = new GenericObjectPool<PoolableConnection>( // NOPMD
				poolableConnectionFactory, poolConfig);
		// PoolableConnectionFactory ????? ?
		poolableConnectionFactory.setPool(connectionPool);

		LOGGER.info("Pool : {}", poolableConnectionFactory.getClass().getName());

	}

	protected static synchronized void loadDriver() { // NOPMD - AvoidSynchronizedAtMethodLevel
		BasicDataSource bds = new BasicDataSource(); // NOPMD - CloseResource

		bds.setDriverClassName(JDBC_DRIVER);
		bds.setUrl(JDBC_URL);
		bds.setUsername(JDBC_USER);
		bds.setPassword(JDBC_PASSWORD);
		bds.setMaxTotal(MAX_TOTAL);
		bds.setMaxIdle(MAX_IDLE);
		bds.setMinIdle(MIN_IDLE);
		bds.setMaxWaitMillis(MAX_WAIT_MILLIS);
		bds.setDefaultAutoCommit(DEFAULT_AUTOCOMMIT);
		bds.setDefaultReadOnly(DEFAULT_READONLY);

		createPools(JDBC_ALIAS, bds);
		isDriverLoaded = true;
		LOGGER.info("Initialized pool : {}", JDBC_ALIAS);
	}

	public static Connection getConnection() throws Exception {
		if (!isDriverLoaded) {
			loadDriver();
		}

		Connection connection = DriverManager.getConnection("jdbc:apache:commons:dbcp:" + JDBC_ALIAS);
		return connection;
	}

	public static void close(ResultSet rs, Statement stmt, Connection conn) {
		if (rs != null) {
			try {
				rs.close();
				// 2017.02.08 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
		if (stmt != null) {
			try {
				stmt.close();
				// 2017.02.08 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
		if (conn != null) {
			try {
				conn.close();
				// 2017.02.08 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
	}
}
