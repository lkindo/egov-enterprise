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
 * 臾몄옄硫붿떆吏瑜??꾪븳 DB Util ?대옒??(?꾨젅?꾩썙??鍮꾩쥌??踰꾩쟾) Apache commons??DBCP瑜??쒖슜???덈줈 媛??꾨줈?앺듃??留욊쾶
 * ?섏젙 ?꾩슂 (EX : DataSource ?ъ슜 ??
 *
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.11.24
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.11.24  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2017-02-13  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2020-07-01  ?좎슜??         DBCP2 愿??蹂寃쎌궗???곸슜
 *   2025.06.09  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린), AvoidSynchronizedAtMethodLevel(硫붿꽌???섏??먯꽌 ?숆린?붾? ?쇳븯?몄슂)
 *
 *      </pre>
 */
public class SmsBasicDBUtil {
	/** Driver load ?щ? */
	private static boolean isDriverLoaded = false;

	/** Connection Pool Alias */
	private static final String JDBC_ALIAS = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_ALIAS");
	/** JDBC Driver 紐?*/
	private static final String JDBC_DRIVER = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_DRIVER");
	/** JDBC ?묒냽 URL */
	private static final String JDBC_URL = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_URL");
	/** JDBC ?묒냽 ?ъ슜?륤D */
	private static final String JDBC_USER = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_USER");
	/** JDBC ?묒냽 ?⑥뒪?뚮뱶 */
	private static final String JDBC_PASSWORD = EgovProperties.getProperty(Globals.SMSDB_CONF_PATH, "JDBC_PASSWORD");
	/** ?쒕쾲??pool?먯꽌 媛뽯떎 ?????덈뒗 理쒕? 而ㅻ꽖??媛쒖닔 */
	private static final int MAX_TOTAL = 20;
	/** 諛섎궔吏곹썑 pool????뺣맆 ???덈뒗 理쒕? ?좏쑕而ㅻ꽖??媛쒖닔 */
	private static final int MAX_IDLE = 10;
	/** ?ъ슜?섏? ?딄퀬 pool???좎???理쒖냼?쒖쓽 而ㅻ꽖??媛쒖닔 */
	private static final int MIN_IDLE = 5;
	// 理쒕? 而ㅻ꽖?섏씠 20?닿퀬 maxIdle??10?멸꼍??
	// DB?붿껌???좏쑕?곹깭媛 ?섎㈃ 20媛쒓퉴吏 ?앹꽦??而ㅻ꽖?섑?? 10媛쒓퉴吏 ?좏쑕而ㅻ꽖?섏쑝濡?以꾩뼱?ㅼ닔 ?덈떎. (10~20媛쒓퉴吏 而ㅻ꽖?섑???媛쒖닔媛 ?앹꽦諛?
	// 諛섎궔??諛섎났?쒕떎.)
	// ?댄썑 理쒖냼 IDLE源뚯? 以꾩뼱?ㅼ닔 ?덈떎.
	/** 而ㅻ꽖??timeout */
	private static final int MAX_WAIT_MILLIS = 20000;
	/** auto commit ?щ? */
	private static final boolean DEFAULT_AUTOCOMMIT = true;
	/** read only ?щ? */
	private static final boolean DEFAULT_READONLY = false;

	/** Logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(SmsBasicDBUtil.class);

	/**
	 * Connection Pool ?앹꽦.
	 *
	 * @param alias
	 * @param bds
	 * @throws Exception
	 */
	protected static void createPools(String alias, BasicDataSource bds) {

		DataSourceConnectionFactory factory = new DataSourceConnectionFactory(bds);
		PoolableConnectionFactory poolableConnectionFactory;

		poolableConnectionFactory = new PoolableConnectionFactory(factory, null);

		// 而ㅻ꽖?섏씠 ?좏슚?쒖? ?뺤씤
		poolableConnectionFactory.setValidationQuery(" SELECT 1 FROM DUAL ");
		// 而ㅻ꽖??????ㅼ젙 ?뺣낫瑜??앹꽦
		GenericObjectPoolConfig<PoolableConnection> poolConfig = new GenericObjectPoolConfig<>();
		// ?좏슚 而ㅻ꽖??寃??二쇨린
		poolConfig.setTimeBetweenEvictionRuns(Duration.ofMillis(1000L * 60L * 1L));
		// ????덈뒗 而ㅻ꽖?섏씠 ?좏슚?쒖? 寃???좊Т ?ㅼ젙
		poolConfig.setTestWhileIdle(true);
		// 湲곕낯媛?: false /true ??寃쎌슦 validationQuery 瑜?留ㅻ쾲 ?섑뻾?쒕떎.
		poolConfig.setTestOnBorrow(false);
		// 而ㅻ꽖??理쒖냼媛쒖닔 ?ㅼ젙
		poolConfig.setMinIdle(bds.getMinIdle());
		// 諛섎궔吏곹썑 而ㅻ꽖??理쒖냼媛쒖닔 ?ㅼ젙
		poolConfig.setMaxIdle(bds.getMaxIdle());
		// 而ㅻ꽖??理쒕? 媛쒖닔 ?ㅼ젙
		poolConfig.setMaxTotal(bds.getMaxTotal());
		GenericObjectPool<PoolableConnection> connectionPool = new GenericObjectPool<PoolableConnection>( // NOPMD
				poolableConnectionFactory, poolConfig);
		// PoolableConnectionFactory 而ㅻ꽖??? ?곌껐
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
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
		if (stmt != null) {
			try {
				stmt.close();
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
		if (conn != null) {
			try {
				conn.close();
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			} catch (SQLException ignore) {
				LOGGER.error("[SQLExceptionException] : database access error occurs");
			}
		}
	}
}
