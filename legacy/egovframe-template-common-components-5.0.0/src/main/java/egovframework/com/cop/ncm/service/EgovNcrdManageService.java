package egovframework.com.cop.ncm.service;

import java.util.Map;


/**
 * 紐낇븿?뺣낫瑜?愿由ы븯湲??꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.3.28  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovNcrdManageService {

    /**
     * 紐낇븿 ?뺣낫瑜???젣?쒕떎.
     * 
     * @param nameCard
     * @throws Exception
     */

	public void deleteNcrdItem(NameCardVO namecardVO) throws Exception;
    /**
     * 紐낇븿 ?뺣낫 諛?紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     * 
     * @param nameCard
     * @throws Exception
     */
    public void insertNcrdItem(NameCard nameCard) throws Exception;

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     * 
     * @param ncrdUser
     * @throws Exception
     */
    public void insertNcrdUseInf(NameCardUser ncrdUser) throws Exception;

    /**
     * 紐낇븿 ?뺣낫??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param nameCard
     * @return
     * @throws Exception
     */
    public NameCardVO selectNcrdItem(NameCardVO ncrdVO) throws Exception;

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     * 
     * @param nameCard
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectNcrdItems(NameCardVO ncrdVO) throws Exception;

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param ncrdUser
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectNcrdUseInfs(NameCardUser ncrdUser) throws Exception;

    /**
     * 紐낇븿 ?뺣낫瑜??섏젙?쒕떎.
     * 
     * @param nameCard
     * @throws Exception
     */
    public void updateNcrdItem(NameCard nameCard) throws Exception;

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??섏젙?쒕떎.
     * 
     * @param ncrdUser
     * @throws Exception
     */
    public void updateNcrdUseInf(NameCardUser ncrdUser) throws Exception;

    /**
     * ??紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     * 
     * @param ncrdVO
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectMyNcrdItems(NameCardVO ncrdVO) throws Exception;
    
}
