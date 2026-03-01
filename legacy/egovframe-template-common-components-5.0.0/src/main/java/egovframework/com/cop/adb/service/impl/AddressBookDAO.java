package egovframework.com.cop.adb.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.adb.service.AddressBook;
import egovframework.com.cop.adb.service.AddressBookUser;
import egovframework.com.cop.adb.service.AddressBookUserVO;
import egovframework.com.cop.adb.service.AddressBookVO;


/**
 * @Class Name : AdressBookDAO.java
 * @Description : 二쇱냼濡앹쓣 愿由ы븯???쒕퉬?ㅻ? ?뺤쓽?섍린?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??         ?섏젙??        ?섏젙?댁슜
 *   -------        -------     -------------------
 *    2009.9.25.    ?ㅼ꽦濡?      理쒖큹 ?앹꽦
 *    2016.12.13    理쒕몢??      ?대옒?ㅻ챸 蹂寃?
 * @author 怨듯넻 而댄룷?뚰듃 媛쒕컻? ?ㅼ꽦濡?
 * @since 2009. 9. 25.
 * @version
 * @see
 *
 */
@Repository("AdressBookDAO")
public class AddressBookDAO extends EgovComAbstractDAO{
    
    /**
     * 二쇱뼱吏?議곌굔???곕Ⅸ 二쇱냼濡앸ぉ濡앹쓣 遺덈윭?⑤떎.
     * 
     * @param AddressBookVO
     * @return
     * @throws Exception
     */
	public List<AddressBookVO> selectAdressBookList(AddressBookVO adbkVO) throws Exception {
        return selectList("AdressBookDAO.selectAdressBookList", adbkVO);
    }
    
    /**
     * 二쇱뼱吏?議곌굔???곕씪 二쇱냼濡앹뿉 異붽????ъ슜?먮ぉ濡앹쓣 遺덈윭?⑤떎.
     * 
     * @param AddressBookUserVO
     * @return
     * @throws Exception
     */
    public List<AddressBookUserVO> selectManList(AddressBookUserVO adbkUserVO) throws Exception {
        return selectList("AdressBookDAO.selectManList", adbkUserVO);
    }
    
    /**
     * 二쇱뼱吏?議곌굔???곕씪 二쇱냼濡앹뿉 異붽???紐낇븿紐⑸줉??遺덈윭?⑤떎.
     * 
     * @param AddressBookUserVO
     * @return
     * @throws Exception
     */
    public List<AddressBookUserVO> selectCardList(AddressBookUserVO adbkUserVO) throws Exception {
        return selectList("AdressBookDAO.selectCardList", adbkUserVO);
    }
    
    /**
     * 二쇱뼱吏?議곌굔???곕씪 二쇱냼濡앹뿉 湲곕벑濡앸맂 援ъ꽦?먯쓽 紐⑸줉??遺덈윭?⑤떎.
     * 
     * @param AddressBookVO
     * @return
     * @throws Exception
     */
    public List<AddressBookUser> selectUserList(AddressBookVO adbkVO) throws Exception {
        return selectList("AdressBookDAO.selectUserList", adbkVO);
    }  

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 二쇱냼濡앹쓣 遺덈윭?⑤떎.
     * 
     * @param AddressBookVO
     * @return
     * @throws Exception
     */
    public AddressBookVO selectAdressBook(AddressBookVO adbkVO) throws Exception {
        return (AddressBookVO)selectOne("AdressBookDAO.selectAdressBook", adbkVO);
    }        
    
    /**
     * 二쇱냼濡??뺣낫瑜??깅줉?쒕떎.
     * 
     * @param AddressBook
     * @throws Exception
     */
    public void insertAdressBook(AddressBook addressBook) throws Exception {
        insert("AdressBookDAO.insertAdressBook", addressBook);
    }
    
    /**
     * 二쇱냼濡앹쓣 援ъ꽦?섎뒗 援ъ꽦?먯쓣 ?깅줉?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public void insertAdressBookUser(AddressBookUser addressBookUser) throws Exception {
        insert("AdressBookDAO.insertAdressBookUser", addressBookUser);
    }

    /**
     * 二쇱냼濡??뺣낫瑜??섏젙?쒕떎.
     * 
     * @param AddressBook
     * @throws Exception
     */
    public void updateAdressBook(AddressBook addressBook) throws Exception {
        update("AdressBookDAO.updateAdressBook", addressBook);
    }
    
    /**
     * 二쇱냼濡?援ъ꽦?먯쓣 ??젣?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public void deleteAdressBookUser(AddressBookUser adbkUser) throws Exception {
        delete("AdressBookDAO.deleteAdressBookUser", adbkUser);
    }    
    
    /**
     * 二쇱냼濡?紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public int selectAdressBookListCnt(AddressBookVO adbkVO) throws Exception {
        return (Integer)selectOne("AdressBookDAO.selectAdressBookListCnt", adbkVO);
    }
    
    /**
     * ?ъ슜??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public int selectManListCnt(AddressBookUserVO adbkUserVO) throws Exception {
        return (Integer)selectOne("AdressBookDAO.selectManListCnt", adbkUserVO);
    }
    
    /**
     * 紐낇븿 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public int selectCardListCnt(AddressBookUserVO adbkUserVO) throws Exception {
        return (Integer)selectOne("AdressBookDAO.selectCardListCnt", adbkUserVO);
    }
    
    /**
     * 二쇱냼濡앹쓣 援ъ꽦???ъ슜?먯쓽 ?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public AddressBookUser selectManUser(String id) throws Exception {
        return (AddressBookUser)selectOne("AdressBookDAO.selectManUser", id);
    }
    
    /**
     * 二쇱냼濡앹쓣 援ъ꽦??紐낇븿???뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param AddressBookUser
     * @throws Exception
     */
    public AddressBookUser selectCardUser(String id) throws Exception {
        return (AddressBookUser)selectOne("AdressBookDAO.selectCardUser", id);
    }

}
