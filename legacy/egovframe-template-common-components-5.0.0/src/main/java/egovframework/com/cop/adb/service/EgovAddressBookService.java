package egovframework.com.cop.adb.service;

import java.util.Map;

/**
 * 二쇱냼濡앹젙蹂대? 愿由ы븯湲??꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻而댄룷?뚰듃? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.9.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2016.12.13 理쒕몢??         ?대옒?ㅻ챸 蹂寃?
 * </pre>
 */
public interface EgovAddressBookService {
    
  
    /**
     * 二쇱냼濡?紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookVO
     * @return  Map<String, Object>
     * @exception Exception
     */
    public Map<String, Object> selectAdressBookList(AddressBookVO addressBookVO) throws Exception;
    
    /**
     * 二쇱냼濡??뺣낫瑜?議고쉶?쒕떎.
     * @param AddressBookVO
     * @return  AdressBookVO
     * @exception Exception
     */
    public AddressBookVO selectAdressBook(AddressBookVO addressBookVO) throws Exception;
    
    /**
     * 二쇱냼濡??뺣낫瑜???젣?쒕떎.
     * @param AddressBook
     * @return 
     * @exception Exception
     */
    public void deleteAdressBook(AddressBook addressBook) throws Exception;
    
    /**
     * ?ъ슜??紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    public Map<String, Object> selectManList(AddressBookUserVO addressBookUserVO) throws Exception;
    
    /**
     * 紐낇븿 紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    public Map<String, Object> selectCardList(AddressBookUserVO addressBookUserVO) throws Exception;
    
    /**
     * 二쇱냼濡??뺣낫瑜??깅줉?쒕떎.
     * 
     * @param AddressBook
     * @throws Exception
     */
    public void insertAdressBook(AddressBookVO adbkVO) throws Exception;   
          
    /**
     * 二쇱냼濡??뺣낫瑜??섏젙?쒕떎.
     * @param AddressBookVO
     * @return 
     * @exception Exception
     */
    public void updateAdressBook(AddressBookVO addressBookVO) throws Exception;
    
    /**
     * 二쇱냼濡?援ъ꽦???뺣낫瑜?遺덈윭?⑤떎.
     * @param String
     * @return 
     * @exception Exception
     */
    public AddressBookUser selectAdbkUser(String id) throws Exception;

}