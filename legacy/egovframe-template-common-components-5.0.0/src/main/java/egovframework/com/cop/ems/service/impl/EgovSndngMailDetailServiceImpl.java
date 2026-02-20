package egovframework.com.cop.ems.service.impl;

import java.io.File;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cop.ems.service.EgovSndngMailDetailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.utl.sim.service.EgovFileTool;
import jakarta.annotation.Resource;

/**
 * 諛쒖넚硫붿씪???곸꽭 議고쉶?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *
 *  </pre>
 */
@Service("sndngMailDetailService")
public class EgovSndngMailDetailServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailDetailService {

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	@Resource(name = "sndngMailDetailDAO")
	private SndngMailDetailDAO sndngMailDetailDAO;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService egovFileMngService;

	/**
	 * 諛쒖넚硫붿씪???곸꽭 議고쉶?쒕떎.
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 */
	@Override
	public SndngMailVO selectSndngMail(SndngMailVO vo) throws Exception {

		// 1. 諛쒖넚硫붿씪 ?뺣낫瑜?議고쉶?쒕떎.
		SndngMailVO resultMailVO = sndngMailDetailDAO.selectSndngMail(vo);

		return resultMailVO;
	}

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	@Override
	public void deleteSndngMail(SndngMailVO vo) throws Exception {

		// 1. 諛쒖넚硫붿씪????젣?쒕떎.
		sndngMailDetailDAO.deleteSndngMail(vo);

		// 2. 諛쒖넚?붿껌XML?뚯씪????젣?쒕떎.
		String xmlFile = vo.getMssageId() + ".xml";
		EgovFileTool.deleteFile(Globals.MAIL_REQUEST_PATH, xmlFile);
	}

	/**
	 * 泥⑤??뚯씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	@Override
	public void deleteAtchmnFile(SndngMailVO vo) throws Exception {

		// 1. 泥⑤??뚯씪 紐⑸줉????젣?쒕떎. (?댁궪??梨낆엫 ?쒓났)
		FileVO fileVO = new FileVO();
		fileVO.setAtchFileId(vo.getAtchFileId());
		egovFileMngService.deleteAllFileInf(fileVO);
	}
}
