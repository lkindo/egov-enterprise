package egovframework.com.cop.ems.service.impl;

import java.io.File;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cop.ems.service.AtchmnFileVO;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.EgovSndngMailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovXMLDoc;
import jakarta.annotation.Resource;
import noNamespace.SndngMailDocument;

/**
 * 諛쒖넚硫붿씪?깅줉, 諛쒖넚?붿껌XML?뚯씪 ?앹꽦?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
 *   2011.07.27  ?쒖???         硫붿씪 諛쒖넚?댁뿭 DB ??μ떆 泥⑤??뚯씪???놁쑝硫?NULL濡?蹂寃?
 *   2011.12.06  ?닿린??         硫붿씪 泥⑤??뚯씪??湲곕뒫 異붽?
 *   2015.02.02  ?쒖??꾨젅?꾩썙??    硫붿씪 泥⑤??뚯씪 ?ㅻ쪟 ?섏젙
 *   2025.06.03  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimplifyBooleanExpressions(遺???쒗쁽???⑥닚??
 *
 *      </pre>
 */
@Service("sndngMailRegistService")
public class EgovSndngMailRegistServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailRegistService {

	/** SndngMailRegistDAO */
	@Resource(name = "sndngMailRegistDAO")
	private SndngMailRegistDAO sndngMailRegistDAO;

	/** Message ID Generation */
	@Resource(name = "egovMailMsgIdGnrService")
	private EgovIdGnrService egovMailMsgIdGnrService;

	@Resource(name = "egovSndngMailService")
	private EgovSndngMailService egovSndngMailService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	/**
	 * 諛쒖넚??硫붿씪???깅줉?쒕떎
	 * 
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean insertSndngMail(SndngMailVO vo) throws Exception {
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String recptnPersons = EgovStringUtil.isNullToString(vo.getRecptnPerson()).replaceAll(" ", "");
		String[] recptnPersonList = recptnPersons.split(";");

		for (int j = 0; j < recptnPersonList.length; j++) {

			// 1-0.硫붿꽭吏ID瑜??앹꽦?쒕떎.
			String mssageId = egovMailMsgIdGnrService.getNextStringId();

			// 1-1.諛쒖넚硫붿씪 ?곗씠?곕? 留뚮뱺??
			SndngMailVO mailVO = new SndngMailVO();
			mailVO.setMssageId(mssageId);
			mailVO.setDsptchPerson(vo.getDsptchPerson());
			mailVO.setRecptnPerson(recptnPersonList[j]);
			mailVO.setSj(vo.getSj());
			// mailVO.setEmailCn(EgovStringUtil.checkHtmlView(vo.getEmailCn()));
			mailVO.setEmailCn(vo.getEmailCn());
			mailVO.setSndngResultCode("R"); // 諛쒖넚寃곌낵 ?붿껌

			if (vo.getAtchFileId() == null || vo.getAtchFileId().equals("")) {
				mailVO.setAtchFileId(null);
				mailVO.setFileStreCours(null);
				mailVO.setOrignlFileNm(null);
			} else {
				FileVO fileVO = new FileVO();
				fileVO.setAtchFileId(vo.getAtchFileId());
				fileVO.setFileSn("0");
				FileVO fvo = fileService.selectFileInf(fileVO);

				File uFile = new File(fvo.getFileStreCours(), fvo.getStreFileNm());

				mailVO.setAtchFileId(vo.getAtchFileId());
				mailVO.setFileStreCours(uFile.getPath());
				mailVO.setOrignlFileNm(vo.getOrignlFileNm());
			}

			// 1-3.諛쒖넚硫붿씪???깅줉?쒕떎.
			sndngMailRegistDAO.insertSndngMail(mailVO);

			// 1-4.硫붿씪??諛쒖넚?쒕떎.
			boolean sendingMailResult = egovSndngMailService.sndngMail(mailVO);

			if (!sendingMailResult) {
				mailVO.setSndngResultCode("F"); // 諛쒖넚寃곌낵 ?ㅽ뙣
				sndngMailRegistDAO.updateSndngMail(mailVO); // 諛쒖넚?곹깭瑜?DB???낅뜲?댄듃 ?쒕떎.
				return false;
			}

			// 1-5.諛쒖넚硫붿씪 ?붿껌XML ?뚯씪???앹꽦?쒕떎.
			trnsmitXmlData(mailVO);
		}
		return true;
	}

	/**
	 * 諛쒖넚??硫붿씪??XML?뚯씪濡?留뚮뱾????ν븳??
	 * 
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean trnsmitXmlData(SndngMailVO vo) throws Exception {

		// 1. 泥⑤??뚯씪 紐⑸줉 (?먰뙆?쇰챸, ??ν뙆?쇰챸)
		String orignlFileList = "";
		String streFileList = "";
		List<AtchmnFileVO> atchmnFileList = sndngMailRegistDAO.selectAtchmnFileList(vo);
		for (int i = 0; i < atchmnFileList.size(); i++) {
			AtchmnFileVO fileVO = atchmnFileList.get(i);
			String orignlFile = fileVO.getOrignlFileNm();
			String streFile = fileVO.getFileStreCours() + fileVO.getStreFileNm();
			orignlFileList += orignlFile + ";";
			streFileList += streFile + ";";
		}

		// 2. XML?곗씠?곕? 留뚮뱺??
		SndngMailDocument mailDoc;
		SndngMailDocument.SndngMail mailElement;
		mailDoc = SndngMailDocument.Factory.newInstance();
		mailElement = mailDoc.addNewSndngMail();
		mailElement.setMssageId(vo.getMssageId());
		mailElement.setDsptchPerson(vo.getDsptchPerson());
		mailElement.setRecptnPerson(vo.getRecptnPerson());
		mailElement.setSj(vo.getSj());
		mailElement.setEmailCn(vo.getEmailCn());
		mailElement.setSndngResultCode(vo.getSndngResultCode());
		mailElement.setOrignlFileList(orignlFileList);
		mailElement.setStreFileList(streFileList);

		// 2. XML?뚯씪濡???ν븳??
		String xmlFile = Globals.MAIL_REQUEST_PATH + vo.getMssageId() + ".xml";
		boolean result = EgovXMLDoc.getClassToXML(mailDoc, xmlFile);
		if (result) {
			recptnXmlData(xmlFile);
		}
		return result;
	}

	/**
	 * 諛쒖넚硫붿씪 諛쒖넚寃곌낵 XML?뚯씪???쎌뼱 諛쒖넚寃곌낵肄붾뱶???섏젙?쒕떎.
	 * 
	 * @param xml String
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean recptnXmlData(String xmlFile) throws Exception {

		// 1. XML?뚯씪?먯꽌 諛쒖넚寃곌낵肄붾뱶瑜?媛?몄삩??
		SndngMailDocument mailDoc = EgovXMLDoc.getXMLToClass(xmlFile);
		SndngMailDocument.SndngMail mailElement = mailDoc.getSndngMail();
		SndngMailVO sndngMailVO = new SndngMailVO();
		sndngMailVO.setMssageId(mailElement.getMssageId());
		sndngMailVO.setSndngResultCode("C"); // 諛쒖넚寃곌낵 ?꾨즺

		// 2. DB???낅뜲?댄듃 ?쒕떎.
		sndngMailRegistDAO.updateSndngMail(sndngMailVO);

		return true;
	}
}
