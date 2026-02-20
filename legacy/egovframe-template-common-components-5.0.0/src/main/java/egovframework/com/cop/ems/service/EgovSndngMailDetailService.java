package egovframework.com.cop.ems.service;

/**
 * 諛쒖넚硫붿씪???곸꽭 議고쉶?섎뒗 鍮꾩쫰?덉뒪 ?명꽣?섏씠???대옒??
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
public interface EgovSndngMailDetailService {

	/**
	 * 諛쒖넚硫붿씪???곸꽭 議고쉶?쒕떎.
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 */
	SndngMailVO selectSndngMail(SndngMailVO vo) throws Exception;

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	void deleteSndngMail(SndngMailVO vo) throws Exception;

	/**
	 * 泥⑤??뚯씪????젣?쒕떎.
	 * @param vo SndngMailVO
	 * @exception
	 */
	void deleteAtchmnFile(SndngMailVO vo) throws Exception;
}
