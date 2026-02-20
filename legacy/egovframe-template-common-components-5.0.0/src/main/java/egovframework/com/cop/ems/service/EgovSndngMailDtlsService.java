package egovframework.com.cop.ems.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛쒖넚硫붿씪 ?댁뿭??議고쉶?섎뒗 鍮꾩쫰?덉뒪 ?명꽣?섏씠???대옒??
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
public interface EgovSndngMailDtlsService {

	/**
	 * 諛쒖넚硫붿씪 紐⑸줉??議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	List<SndngMailVO> selectSndngMailList(ComDefaultVO vo) throws Exception;

	/**
	 * 諛쒖넚硫붿씪 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception
	 */
	int selectSndngMailListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	void deleteSndngMailList(SndngMailVO vo) throws Exception;
}
