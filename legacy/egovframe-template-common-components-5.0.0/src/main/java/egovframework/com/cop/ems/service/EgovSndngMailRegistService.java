package egovframework.com.cop.ems.service;

/**
 * 諛쒖넚硫붿씪?깅줉, 諛쒖넚?붿껌XML?뚯씪 ?앹꽦?섎뒗 鍮꾩쫰?덉뒪 ?명꽣?섏씠???대옒??
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
public interface EgovSndngMailRegistService {

	/**
	 * 諛쒖넚??硫붿씪???깅줉?쒕떎
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	boolean insertSndngMail(SndngMailVO vo) throws Exception;

	/**
	 * 諛쒖넚??硫붿씪??XML?뚯씪濡?留뚮뱾????ν븳??
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	public boolean trnsmitXmlData(SndngMailVO vo) throws Exception;

	/**
	 * 諛쒖넚硫붿씪 諛쒖넚寃곌낵 XML?뚯씪???쎌뼱 諛쒖넚寃곌낵肄붾뱶???섏젙?쒕떎.
	 * @param xml String
	 * @return boolean
	 * @exception Exception
	 */
	public boolean recptnXmlData(String xml) throws Exception;
}
