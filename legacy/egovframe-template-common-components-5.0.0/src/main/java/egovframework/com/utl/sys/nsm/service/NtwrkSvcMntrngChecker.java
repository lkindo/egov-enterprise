package egovframework.com.utl.sys.nsm.service;

import java.io.IOException;
import java.net.Socket;

import javax.net.ssl.SSLSocketFactory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???꾪븳 Check ?대옒??
 *
 * ?곸꽭?댁슜
 * - ?뚯폆?쇰줈 ?ㅽ듃?뚰겕?쒕퉬?ㅼ뿉 ?묒냽?????대떦 寃곌낵瑜??쒓났?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2017-03-03   議곗꽦??     ?쒗걧?댁퐫??ES) - 遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-756]
 */

public class NtwrkSvcMntrngChecker {

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???섑뻾?쒕떎.
	 * @param String - ?ㅽ듃?뚰겕?쒖뒪??IP
	 * @param int - ?ㅽ듃?뚰겕?쒖뒪???ы듃
	 * @return  NtwrkSvcMntrngResult - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵
	 *
	 * @param sysIp
	 * @param sysPort
	 */

	private static final Logger LOGGER = LoggerFactory.getLogger(NtwrkSvcMntrngChecker.class);

	public static NtwrkSvcMntrngResult check(String sysIp, int sysPort) {

		Socket clientSocket = null;

		try {
			clientSocket = SSLSocketFactory.getDefault().createSocket(sysIp, sysPort);//2022.01. Unencrypted Socket 泥섎━
			return new NtwrkSvcMntrngResult(true, null);
		} catch (IOException e) {
			//log.error("?ㅽ듃?뚰겕?쒕퉬?ㅻえ?덊꽣留??먮윭 : " + e.getMessage());
			//log.debug(e.getMessage(), e);
			return new NtwrkSvcMntrngResult(false, e);
		} finally {
			if (clientSocket != null) {
				try {
					clientSocket.close();
				} catch (IOException e) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
					LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
					return new NtwrkSvcMntrngResult(false, e);

					// 2017-03-03   議곗꽦??     ?쒗걧?댁퐫??ES) - 遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-756]
				}
			}
		}

	}

}
