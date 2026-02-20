package egovframework.com.cop.ems.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.ems.service.EgovSndngMailDetailService;
import egovframework.com.cop.ems.service.EgovSndngMailDtlsService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 諛쒖넚硫붿씪 ?댁뿭??議고쉶?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
@Service("sndngMailDtlsService")
public class EgovSndngMailDtlsServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailDtlsService {

	@Resource(name = "sndngMailDtlsDAO")
	private SndngMailDtlsDAO sndngMailDtlsDAO;

	@Resource(name = "sndngMailDetailService")
	private EgovSndngMailDetailService sndngMailDetailService;

	/**
	 * 諛쒖넚硫붿씪 紐⑸줉??議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<SndngMailVO> selectSndngMailList(ComDefaultVO vo) throws Exception {
		return sndngMailDtlsDAO.selectSndngMailList(vo);
	}

	/**
	 * 諛쒖넚硫붿씪 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception
	 */
	@Override
	public int selectSndngMailListTotCnt(ComDefaultVO vo) throws Exception {
		return sndngMailDtlsDAO.selectSndngMailListTotCnt(vo);
	}

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	@Override
	public void deleteSndngMailList(SndngMailVO vo) throws Exception {

		// 1. 諛쒖넚硫붿씪????젣?쒕떎.
		String[] sbuf = EgovStringUtil.split(vo.getMssageId(), ",");
		for (String element : sbuf) {
			SndngMailVO sndngMailVO = new SndngMailVO();
			sndngMailVO.setMssageId(element);
			sndngMailDetailService.deleteSndngMail(sndngMailVO);
		}

		// 2. 泥⑤??뚯씪????젣?쒕떎.
		if (vo.getAtchFileIdList() != null) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			String[] fbuf = EgovStringUtil.split(vo.getAtchFileIdList(), ",");
			for (String element : fbuf) {
				SndngMailVO sndngMailVO = new SndngMailVO();
				sndngMailVO.setAtchFileId(element);
				sndngMailDetailService.deleteAtchmnFile(sndngMailVO);
			}
		}
	}
}
