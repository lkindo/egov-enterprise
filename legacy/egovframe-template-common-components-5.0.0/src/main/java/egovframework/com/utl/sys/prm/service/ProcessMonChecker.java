package egovframework.com.utl.sys.prm.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.FileSystemUtils;
import egovframework.com.cmm.service.Globals;

/**
 * <pre>
 * 媛쒖슂
 * - ?꾨줈?몄뒪 紐⑤땲?곕쭅???꾪븳 Check ?대옒??
 *
 * ?곸꽭?댁슜
 * - ?꾨줈?몄뒪???곹깭 寃곌낵瑜??쒓났?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.09.07
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.09.07  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2019.12.06  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.09.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.09.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
public class ProcessMonChecker {

	// Log
	//
                     static final Logger LOGGER = LoggerFactory.getLogger(ProcessMonChecker.class);

	/**
	 * <pre>
	 * Comment : ?꾨줈?몄뒪 ?뺣낫瑜??뺤씤?쒕떎. (
	 * </pre>
	 * 
	 * @param String processName
	 * @return List<String[]> ?꾨줈?몄뒪 ?뺣낫瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.01.12.)
	 * @see
	 */
	public static String getProcessId(String processNm) throws IOException {

		Process p = null;
		String procsSttus = null;
		int cnt = 0;

		try {
			if (Globals.OS_TYPE == null) {
				throw new RuntimeException("Globals.OS_TYPE property value is needed!!!");
			}
			// 2011.10.10 蹂댁븞?먭? ?꾩냽議곗튂 ??

			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				cnt = -1; // ?덈룄?곗쓽 寃쎌슦 ?뺤긽 ?꾨줈?몄뒪 ?쇰븣 ?먮쾲吏?以꾩뿉 寃곌낵瑜?由ы꽩?쒕떎.
				String execStr = "tasklist /fo table /nh /fi \"imagename eq " + processNm + "\"";
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				FileSystemUtils util = new FileSystemUtils();
				p = util.processOperate("EgovNetworkState", execStr);

			} else if ("UNIX".equals(Globals.OS_TYPE)) {
				String cmd = "/bin/csh" + "-c" + "ps -A | grep " + EgovWebUtil.removeOSCmdRisk(processNm);
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				FileSystemUtils util = new FileSystemUtils();
				p = util.processOperate("EgovNetworkState", cmd);
			}

			if (p == null) {
				return "02";
			}
			try (BufferedReader buf = new BufferedReader(new InputStreamReader(p.getInputStream()));) {
				while (buf.readLine() != null) {
					cnt++;
				}
			}
			if (cnt > 0) {
				procsSttus = "01";
			} else {
				procsSttus = "02";
			}

		} catch (IOException e) {
			procsSttus = "02";
		}

		return procsSttus;
	}

}
