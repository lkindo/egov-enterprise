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
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2014.09.18  ?????????????
 *   2025.05.27  ????         PMD???????? ????????-FieldNamingConventions(? ???
 *
 *      </pre>
 **/
public class EgovBasicLogger {
	private static final Level IGNORE_INFO_LEVEL = Level.OFF;
	private static final Level DEBUG_INFO_LEVEL = Level.FINEST;
	private static final Level INFO_INFO_LEVEL = Level.INFO;

	private static final Logger IGNORE_LOGGER = Logger.getLogger("ignore");
	private static final Logger DEBUG_LOGGER = Logger.getLogger("debug");
	private static final Logger INFO_LOGGER = Logger.getLogger("info");

	/**
	 * ????? ?????????
	 * 
	 * @param message
	 * @param exception
	 **/
	public static void ignore(String message, Exception exception) {
		if (exception == null) {
			IGNORE_LOGGER.log(IGNORE_INFO_LEVEL, message);
		} else {
			IGNORE_LOGGER.log(IGNORE_INFO_LEVEL, message, exception);
		}
	}

	/**
	 * ????? ?????????
	 * 
	 * @param message
	 * @param exception
	 **/
	public static void ignore(String message) {
		ignore(message, null);
	}

	/**
	 * ??????? ??????
	 * 
	 * @param message
	 * @param exception
	 **/
	public static void debug(String message, Exception exception) {
		if (exception == null) {
			DEBUG_LOGGER.log(DEBUG_INFO_LEVEL, message);
		} else {
			DEBUG_LOGGER.log(DEBUG_INFO_LEVEL, message, exception);
		}
	}

	/**
	 * ??????? ??????
	 * 
	 * @param message
	 * @param exception
	 **/
	public static void debug(String message) {
		debug(message, null);
	}

	/**
	 * ??? ????? ??????
	 * 
	 * @param message
	 * @param exception
	 **/
	public static void info(String message) {
		INFO_LOGGER.log(INFO_INFO_LEVEL, message);
	}
}
