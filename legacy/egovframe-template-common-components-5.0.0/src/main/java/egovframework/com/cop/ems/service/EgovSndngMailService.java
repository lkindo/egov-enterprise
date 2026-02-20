package egovframework.com.cop.ems.service;

/**
 * 硫붿씪 ?붾（?섍낵 ?곕룞?댁꽌 ?댁슜?댁꽌 硫붿씪??蹂대궡???쒕퉬???대옒??
 * @since 2011.09.09
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011.09.09  ?쒖???      理쒖큹 ?묒꽦
 *
 *  </pre>
 */

public interface EgovSndngMailService {

	/**
	 * 硫붿씪??諛쒖넚?쒕떎
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	boolean sndngMail(SndngMailVO vo) throws Exception;
}
