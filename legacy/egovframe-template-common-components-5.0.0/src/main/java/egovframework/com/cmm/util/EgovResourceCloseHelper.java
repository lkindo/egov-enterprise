package egovframework.com.cmm.util;

import java.io.Closeable;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Wrapper;

/**
 * Utility class to support to close resources
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
 *   2014.09.18  ?쒖??꾨젅?꾩썙?ъ꽱?? 理쒖큹 ?앹꽦
 *   2025.05.28  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
public class EgovResourceCloseHelper {
	/**
	 * Resource close 泥섎━.
	 * 
	 * @param resources
	 */
	public static void close(Closeable... resources) {
		for (Closeable resource : resources) { // NOPMD - CloseResource
			if (resource != null) {
				try {
					resource.close();
				} catch (IOException ignore) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
					EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
				}
			}
		}
	}

	/**
	 * JDBC 愿??resource 媛앹껜 close 泥섎━
	 * 
	 * @param objects
	 */
	public static void closeDBObjects(Wrapper... objects) {
		for (Object object : objects) {
			if (object != null) {
				if (object instanceof ResultSet) {
					try {
						((ResultSet) object).close();
					} catch (SQLException ignore) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
						EgovBasicLogger.ignore("Occurred SQLException to close resource is ingored!!");
					}
				} else if (object instanceof Statement) {
					try {
						((Statement) object).close();
					} catch (SQLException ignore) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
						EgovBasicLogger.ignore("Occurred SQLException to close resource is ingored!!");
					}
				} else if (object instanceof Connection) {
					try {
						((Connection) object).close();
					} catch (SQLException ignore) {
						EgovBasicLogger.ignore("Occurred SQLException to close resource is ingored!!");
					}
				} else {
					throw new IllegalArgumentException("Wrapper type is not found : " + object.toString());
				}
			}
		}
	}

	/**
	 * Socket 愿??resource 媛앹껜 close 泥섎━
	 * 
	 * @param objects
	 */
	public static void closeSocketObjects(Socket socket, ServerSocket server) {
		if (socket != null) {
			try {
				socket.shutdownOutput();
			} catch (IOException ignore) {
				EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
			}

			try {
				socket.close();
			} catch (IOException ignore) {
				EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
			}
		}

		if (server != null) {
			try {
				server.close();
			} catch (IOException ignore) {
				EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
			}
		}
	}

	/**
	 * Socket 愿??resource 媛앹껜 close 泥섎━
	 * 
	 * @param sockets
	 */
	public static void closeSockets(Socket... sockets) {
		for (Socket socket : sockets) { // NOPMD - CloseResource
			if (socket != null) {
				try {
					socket.shutdownOutput();
				} catch (IOException ignore) {
					EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
				}

				try {
					socket.close();
				} catch (IOException ignore) {
					EgovBasicLogger.ignore("Occurred IOException to close resource is ingored!!");
				}
			}
		}
	}
}