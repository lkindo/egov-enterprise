package egovframework.com.cop.ems.web;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.PrintWriter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cop.ems.service.EgovSndngMailDetailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 諛쒖넚硫붿씪???곸꽭 議고쉶?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *   2011.10.10  ?닿린??         蹂댁븞?먭? ?꾩냽議곗튂(援먯감?묒냽 ?ㅽ겕由쏀듃 怨듦꺽 痍⑥빟??諛⑹?(?뚮씪誘명꽣 臾몄옄??援먯껜), HTTP ?묐떟遺꾪븷 諛⑹?)
 *   2017.03.03  議곗꽦??         ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2019.11.29  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 : HTTP?묐떟遺꾪븷(HTTP_Response_Splitting,CRLF)痍⑥빟??議곗튂
 *   2025.06.05  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
@Controller
public class EgovSndngMailDetailController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSndngMailDetailController.class);

	/** EgovSndngMailDetailService */
	@Resource(name = "sndngMailDetailService")
	private EgovSndngMailDetailService sndngMailDetailService;

	/**
	 * 諛쒖넚硫붿씪???곸꽭 議고쉶?쒕떎.
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/selectSndngMailDetail.do")
	public String selectSndngMail(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model)
			throws Exception {

		if (sndngMailVO == null || sndngMailVO.getMssageId() == null || sndngMailVO.getMssageId().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. 諛쒖넚硫붿씪???곸꽭 議고쉶?쒕떎.
		SndngMailVO resultMailVO = sndngMailDetailService.selectSndngMail(sndngMailVO);

		// 2. 寃곌낵 由ы꽩
		model.addAttribute("resultInfo", resultMailVO);
		if (!resultMailVO.getMssageId().equals("")) {
			// 諛쒖넚硫붿씪 ?곸꽭議고쉶 ?붾㈃ ?대룞
			return "egovframework/com/cop/ems/EgovMailDetail";
		} else {
			// ?ㅻ쪟 ?섏씠吏 ?대룞
			return "egovframework/com/cmm/egovError";
		}
	}

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/deleteSndngMail.do")
	public String deleteSndngMail(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model)
			throws Exception {

		if (sndngMailVO == null || sndngMailVO.getMssageId() == null || sndngMailVO.getMssageId().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. 諛쒖넚硫붿씪????젣?쒕떎.
		sndngMailDetailService.deleteSndngMail(sndngMailVO);

		// 2. 泥⑤??뚯씪????젣?쒕떎.
		sndngMailDetailService.deleteAtchmnFile(sndngMailVO);

		// 3. 諛쒖넚硫붿씪 紐⑸줉 ?섏씠吏 ?대룞
		return "redirect:/cop/ems/selectSndngMailList.do";
	}

	/**
	 * 諛쒖넚硫붿씪 ?댁슜議고쉶濡??뚯븘媛꾨떎.
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/backSndngMailDetail.do")
	public String backSndngMailDtls(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model)
			throws Exception {

		return "redirect:/cop/ems/selectSndngMailList.do";
	}

	/**
	 * XML?뺥깭??諛쒖넚?붿껌硫붿씪??議고쉶?쒕떎.
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/selectSndngMailXml.do")
	public void selectSndngMailXml(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, HttpServletResponse response,
			ModelMap model) throws Exception {

		// 硫붿씪 ?깅줉 ??湲곕낯 ?앹꽦 寃쎈줈濡?蹂寃?泥섎━ : 23.08.09
		// String xmlFile = Globals.MAIL_REQUEST_PATH + sndngMailVO.getMssageId() +
		// ".xml";

		String storePathString = EgovProperties.getProperty("Globals.fileStorePath");
		String xmlFile = storePathString + sndngMailVO.getMssageId() + ".xml";

		File uFile = new File(EgovWebUtil.filePathBlackList(xmlFile));
		int fSize = (int) uFile.length();

		if (fSize > 0) {
			String mimetype = "application/x-msdownload;charset=UTF-8";

			response.setContentType(mimetype);
			response.setHeader("Content-Disposition",
					"attachment; filename=\"" + EgovWebUtil.removeCRLF(uFile.getName()) + "\"");
			response.setContentLength(fSize);

			BufferedInputStream in = null;
			try {
				in = new BufferedInputStream(new FileInputStream(uFile));
				FileCopyUtils.copy(in, response.getOutputStream());
			} finally {
				if (in != null) {
					try {
						in.close();
						// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
					} catch (IOException ignore) {
						LOGGER.error("[" + ignore.getClass() + "] : Connection Close");
					}
				}
			}
			response.getOutputStream().flush();
			response.getOutputStream().close();
		} else {
			response.setContentType("application/x-msdownload");
			PrintWriter printwriter = response.getWriter(); // NOPMD - CloseResource
			printwriter.println("<html>");
			printwriter.println(
					"<br><br><br><h2>Could not get file name:<br>" + EgovWebUtil.clearXSSMinimum(xmlFile) + "</h2>");
			printwriter.println("<br><br><br><center><h3><a href='javascript: history.go(-1)'>Back</a></h3></center>");
			printwriter.println("<br><br><br>&copy; webAccess");
			printwriter.println("</html>");
			printwriter.flush();
			printwriter.close();
		}
	}
}
