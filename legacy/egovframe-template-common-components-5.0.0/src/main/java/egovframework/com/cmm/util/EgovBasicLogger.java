package egovframework.com.cmm.util;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Utility class to support to logging information
 * 
 * @author Vincent Han
 * @since 2014.09.18
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.09.18  ?쒖??꾨젅?꾩썙?ъ꽱??理쒖큹 ?앹꽦
 *   2025.05.27  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
public class EgovBasicLogger {
	private static final Level IGNORE_INFO_LEVEL = Level.OFF;
	private static final Level DEBUG_INFO_LEVEL = Level.FINEST;
	private static final Level INFO_INFO_LEVEL = Level.INFO;

	private static final Logger IGNORE_LOGGER = Logger.getLogger("ignore");
	private static final Logger DEBUG_LOGGER = Logger.getLogger("debug");
	private static final Logger INFO_LOGGER = Logger.getLogger("info");

	/**
	 * 湲곕줉?대굹 泥섎━媛 遺덊븘?뷀븳 寃쎌슦 ?ъ슜.
	 * 
	 * @param message
	 * @param exception
	 */
	public static void ignore(String message, Exception exception) {
		if (exception == null) {
			IGNORE_LOGGER.log(IGNORE_INFO_LEVEL, message);
		} else {
			IGNORE_LOGGER.log(IGNORE_INFO_LEVEL, message, exception);
		}
	}

	/**
	 * 湲곕줉?대굹 泥섎━媛 遺덊븘?뷀븳 寃쎌슦 ?ъ슜.
	 * 
	 * @param message
	 * @param exception
	 */
	public static void ignore(String message) {
		ignore(message, null);
	}

	/**
	 * ?붾쾭洹??뺣낫瑜?湲곕줉?섎뒗 寃쎌슦 ?ъ슜.
	 * 
	 * @param message
	 * @param exception
	 */
	public static void debug(String message, Exception exception) {
		if (exception == null) {
			DEBUG_LOGGER.log(DEBUG_INFO_LEVEL, message);
		} else {
			DEBUG_LOGGER.log(DEBUG_INFO_LEVEL, message, exception);
		}
	}

	/**
	 * ?붾쾭洹??뺣낫瑜?湲곕줉?섎뒗 寃쎌슦 ?ъ슜.
	 * 
	 * @param message
	 * @param exception
	 */
	public static void debug(String message) {
		debug(message, null);
	}

	/**
	 * ?쇰컲?곸씠 ?뺣낫瑜?湲곕줉?섎뒗 寃쎌슦 ?ъ슜.
	 * 
	 * @param message
	 * @param exception
	 */
	public static void info(String message) {
		INFO_LOGGER.log(INFO_INFO_LEVEL, message);
	}
}
