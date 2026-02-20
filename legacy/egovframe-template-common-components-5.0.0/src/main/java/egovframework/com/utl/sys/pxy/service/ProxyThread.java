package egovframework.com.utl.sys.pxy.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.util.EgovResourceCloseHelper;
/**
 * ?꾨줉???ㅻ젅???대옒?ㅻ뒗 ?대씪?댁뼵?몄? ?쒕쾭 媛꾩쓽 ?듭떊??以묎퀎?⑸땲??
 */
public class ProxyThread implements Runnable {

	/** 濡쒓렇 異쒕젰???꾪븳 濡쒓굅 */
	private static final Logger LOGGER = LoggerFactory.getLogger(ProxyThread.class);

	/** ?대씪?댁뼵???뚯폆 */
	@SuppressWarnings("unused")
	private Socket client = null;

	/** ?대씪?댁뼵?몃줈遺?곗쓽 ?낅젰 ?ㅽ듃由?*/
	private InputStream streamFromClient = null;
	/** ?대씪?댁뼵?몃줈??異쒕젰 ?ㅽ듃由?*/
	@SuppressWarnings("unused")
	private OutputStream streamToClient = null;
	/** ?쒕쾭濡쒕??곗쓽 ?낅젰 ?ㅽ듃由?*/
	@SuppressWarnings("unused")
	private InputStream streamFromServer = null;
	/** ?쒕쾭濡쒖쓽 異쒕젰 ?ㅽ듃由?*/
	private OutputStream streamToServer = null;

	/** ?ㅻ젅??以묒? ?щ?瑜??쒖떆?섎뒗 ?뚮옒洹?*/
	private boolean isStop = false;

	/** ?붿껌 ?곗씠??踰꾪띁 */
	byte[] request = new byte[1024];
	/** ?묐떟 ?곗씠??踰꾪띁 */
	byte[] reply = new byte[4096];

	/**
	 * 二쇱뼱吏??대씪?댁뼵???뚯폆???ъ슜?섏뿬 ProxyThread 媛앹껜瑜??앹꽦?⑸땲??
	 *
	 * @param client ?대씪?댁뼵???뚯폆
	 */
	public ProxyThread(Socket client) {
		this.client = client;
	}

	/**
	 * ?ㅽ듃由?諛??대씪?댁뼵???뚯폆???ъ슜?섏뿬 ProxyThread 媛앹껜瑜??앹꽦?⑸땲??
	 *
	 * @param client ?대씪?댁뼵???뚯폆
	 * @param streamFromClient ?대씪?댁뼵?몃줈遺?곗쓽 ?낅젰 ?ㅽ듃由?
	 * @param streamToClient ?대씪?댁뼵?몃줈??異쒕젰 ?ㅽ듃由?
	 * @param streamFromServer ?쒕쾭濡쒕??곗쓽 ?낅젰 ?ㅽ듃由?
	 * @param streamToServer ?쒕쾭濡쒖쓽 異쒕젰 ?ㅽ듃由?
	 */
	public ProxyThread(Socket client, InputStream streamFromClient, OutputStream streamToClient, InputStream streamFromServer, OutputStream streamToServer) throws IOException {
		this.client = client;
		this.streamFromClient = streamFromClient;
		this.streamToClient = streamToClient;
		this.streamFromServer = streamFromServer;
		this.streamToServer = streamToServer;
	}

	/**
	 * ?ㅻ젅??以묒? ?щ?瑜??ㅼ젙?⑸땲??
	 *
	 * @param isStop ?ㅻ젅??以묒? ?щ?
	 */
	public void setIsStop(boolean isStop) {
		this.isStop = isStop;
	}

	/**
	 * ?ㅻ젅??以묒? ?щ?瑜?諛섑솚?⑸땲??
	 *
	 * @return ?ㅻ젅??以묒? ?щ?
	 */
	public boolean getIsStop() {
		return this.isStop;
	}

	/**
	 * ?꾨줉???ㅻ젅?쒖쓽 二??ㅽ뻾 硫붿꽌?쒖엯?덈떎.
	 * ?대씪?댁뼵?몄뿉???쒕쾭濡쒖쓽 ?곗씠???꾨떖??泥섎━?⑸땲??
	 */
	@Override
	public void run() {

		int bytesRead;
		String strReceive = "";

		try {
			if (streamFromClient != null) {
				while ((bytesRead = streamFromClient.read(request)) != -1) {

					strReceive = new String(request, 0, bytesRead);

					// 'stop' 臾몄옄?댁쓣 諛쏆쑝硫??ㅻ젅?쒕? 以묒??⑸땲??
					if (strReceive.indexOf("stop") > -1) {
						setIsStop(true);
						break;
					}

					// ?대씪?댁뼵?몃줈遺??諛쏆? ?곗씠?곕? ?쒕쾭濡??꾩넚?⑸땲??
					streamToServer.write(request, 0, bytesRead);
					streamToServer.flush();
				}
			}
		} catch (IOException e) {
			LOGGER.debug("Server IO Error", e);
		} finally {
			// ?먯썝???덉쟾?섍쾶 ?レ뒿?덈떎.
			EgovResourceCloseHelper.close(streamToServer);
		}
	}
}
