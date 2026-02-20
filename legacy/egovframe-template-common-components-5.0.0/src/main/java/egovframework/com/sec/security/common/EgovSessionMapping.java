package egovframework.com.sec.security.common;

import java.sql.ResultSet;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.egovframe.rte.fdl.security.userdetails.EgovUserDetails;
import org.egovframe.rte.fdl.security.userdetails.jdbc.EgovUsersByUsernameMapping;

import egovframework.com.cmm.LoginVO;

/**
 * mapRow 寃곌낵瑜??ъ슜??EgovUserDetails Object ???뺤쓽?쒕떎.
 * 
 * @author ByungHun Woo
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    -------------    ----------------------
 *   2009.03.10  ByungHun Woo    理쒖큹 ?앹꽦
 *   2009.03.20  ?대Ц以          UPDATE
 *
 * </pre>
 */

public class EgovSessionMapping extends EgovUsersByUsernameMapping {
	
	/**
	 * ?ъ슜?먯젙蹂대? ?뚯씠釉붿뿉??議고쉶?섏뿬 EgovUsersByUsernameMapping ??留ㅽ븨?쒕떎.
	 * @param ds DataSource
	 * @param usersByUsernameQuery String
	 */
	public EgovSessionMapping(DataSource ds, String usersByUsernameQuery) {
        super(ds, usersByUsernameQuery);
    }

	/**
	 * mapRow Override
	 * @param rs ResultSet 寃곌낵
	 * @param rownum row num
	 * @return Object EgovUserDetails
	 * @exception SQLException
	 */
	@Override
    protected EgovUserDetails mapRow(ResultSet rs, int rownum) throws SQLException {
    	logger.debug("## EgovUsersByUsernameMapping mapRow ##");

        String strUserId    = rs.getString("user_id");
        String strPassWord  = rs.getString("password");
        boolean strEnabled  = rs.getBoolean("enabled");
        
        String strUserNm    = rs.getString("user_nm");
        String strUserSe    = rs.getString("user_se");
        String strUserEmail = rs.getString("user_email");
        String strOrgnztId  = rs.getString("orgnzt_id");
        String strUniqId    = rs.getString("esntl_id");
        /**2010.06.30 *?댁슜   *議곗쭅紐?異붽?  */
        String strOrgnztNm    = rs.getString("orgnzt_nm");

        

        // ?몄뀡 ??ぉ ?ㅼ젙
        LoginVO loginVO = new LoginVO();
        loginVO.setId(strUserId);
        loginVO.setPassword(strPassWord);
        loginVO.setName(strUserNm);
        loginVO.setUserSe(strUserSe);
        loginVO.setEmail(strUserEmail);
        loginVO.setOrgnztId(strOrgnztId);
        loginVO.setUniqId(strUniqId);
        /**2010.06.30 *?댁슜   *議곗쭅紐?異붽?  */
        loginVO.setOrgnztNm(strOrgnztNm);
        
        return new EgovUserDetails(strUserId, strPassWord, strEnabled, loginVO);
    }
}
