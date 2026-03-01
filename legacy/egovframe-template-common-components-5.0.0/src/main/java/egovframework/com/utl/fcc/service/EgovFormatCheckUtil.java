package egovframework.com.utl.fcc.service;

/**
 *
 * ?щ㎎?좏슚?깆껜???????Util ?대옒??
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?ㅼ꽦濡?
 * @since 2009.06.23
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.23  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class EgovFormatCheckUtil {

    /**
     * <pxxx - xxx- xxxx ?뺤떇???꾪솕踰덊샇 ?? 以묎컙, ??臾몄옄??3媛??낅젰 諛쏆븘 ?좎슂???꾪솕踰덊샇?뺤떇?몄? 寃??</p>
     *
     *
     * @param   ?꾪솕踰덊샇 臾몄옄?? 3媛?)
     * @return  ?좏슚???꾪솕踰덊샇 ?뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatTell(String tell1, String tell2, String tell3) {

	 String[] check = {"02", "031", "032", "033", "041", "042", "043", "051", "052", "053", "054", "055", "061",
				 "062", "063", "070", "080", "0505"};	//議댁옱?섎뒗 援?쾲 ?곗씠??
	 String temp = tell1 + tell2 + tell3;

	 for(int i=0; i < temp.length(); i++){
    		if (temp.charAt(i) < '0' || temp.charAt(i) > '9') {
				return false;
			}
	 }	//?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤

	 for(int i = 0; i < check.length; i++){
		 if(tell1.equals(check[i])) {
			break;
		}
		 if(i == check.length - 1) {
			return false;
		}
	 }	//援?쾲?낅젰???쒕?濡??섏뿀?붿?瑜??뺤씤

	 if(tell2.charAt(0) == '0') {
		return false;
	}

	 if(tell1.equals("02")){
		 if((tell2.length() != 3 && tell2.length() !=4) || (tell3.length() != 4))
		 {
			return false;	//?쒖슱吏??02)援?쾲 ?낅젰?뚯쓽 ?꾪솕 踰덊샇 ?뺤떇?좏슚??泥댄겕
		}
	 }else{
		 if((tell2.length() != 3) || (tell3.length() != 4)) {
			return false;
		}
	 }	//?쒖슱???쒖쇅??吏??援?쾲 ?낅젰?뚯쓽 ?꾪솕 踰덊샇 ?뺤떇?좏슚??泥댄겕

	 return true;
    }

    /**
     * <p>xxx - xxx- xxxx ?뺤떇???꾪솕踰덊샇 ?섎굹瑜??낅젰 諛쏆븘 ?좎슂???꾪솕踰덊샇?뺤떇?몄? 寃??</p>
     *
     *
     * @param   ?꾪솕踰덊샇 臾몄옄??(1媛?
     * @return  ?좏슚???꾪솕踰덊샇 ?뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatTell(String tellNumber) {

	 String temp1;
	 String temp2;
	 String temp3;
	 String tell = tellNumber;

	 tell = tell.replace("-", "");

	 if(tell.length() < 9 || tell.length() > 11  || tell.charAt(0) != '0')
	 {
		return false;	//?꾪솕踰덊샇 湲몄씠?????泥댄겕
	}

	 if(tell.charAt(1) =='2'){	//?쒖슱吏??(02)援?쾲??寃쎌슦?쇰븣
		 temp1 = tell.substring(0,2);
		 if(tell.length() == 9){
			 temp2 = tell.substring(2,5);
			 temp3 = tell.substring(5,9);
		 }else if(tell.length() == 10){
			 temp2 = tell.substring(2,6);
			 temp3 = tell.substring(6,10);
		 } else {
			return false;
		}
	 } else if(tell.substring(0,4).equals("0505")){ //?됱깮踰덊샇(0505)援?쾲??寃쎌슦?쇰븣
		 if(tell.length() != 11) {
			return false;
		}
		 temp1 = tell.substring(0,4);
		 temp2 = tell.substring(4,7);
		 temp3 = tell.substring(7,11);
	 } else {	// ?쒖슱吏??諛?"0505" 瑜??쒖쇅???쇰컲?곸씤 寃쎌슦?쇰븣
		 if(tell.length() != 10) {
			return false;
		}
		 temp1 = tell.substring(0,3);
		 temp2 = tell.substring(3,6);
		 temp3 = tell.substring(6,10);
	 }

	 return checkFormatTell(temp1, temp2, temp3);
    }

    /**
     * <p>xxx - xxx- xxxx ?뺤떇???대??곕쾲???? 以묎컙, ??臾몄옄??3媛??낅젰 諛쏆븘 ?좎슂???대??곕쾲?명삎?앹씤吏 寃??</p>
     *
     *
     * @param   ?대??곕쾲??臾몄옄??(3媛?
     * @return  ?좏슚???대??곕쾲???뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatCell(String cell1, String cell2, String cell3) {
	 String[] check = {"010", "011", "016", "017", "018", "019"}; //?좏슚???대???泥レ옄由?踰덊샇 ?곗씠??
	 String temp = cell1 + cell2 + cell3;

	 for(int i=0; i < temp.length(); i++){
    		if (temp.charAt(i) < '0' || temp.charAt(i) > '9') {
				return false;
			}
         }	//?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤

	 for(int i = 0; i < check.length; i++){
	     if(cell1.equals(check[i])) {
			break;
		}
	     if(i == check.length - 1) {
			return false;
		}
	 }	// ?대???泥レ옄由?踰덊샇?낅젰???좏슚??泥댄겕

	 if((cell2.charAt(0) == '0') || (cell2.length() != 3 && cell2.length() !=4) || (cell3.length() != 4)) {
		return false;
	}

	 return true;
    }

    /**
     * <p>XXXXXXXXXX ?뺤떇???대??곕쾲??臾몄옄??3媛??낅젰 諛쏆븘 ?좎슂???대??곕쾲?명삎?앹씤吏 寃??</p>
     *
     *
     * @param   ?대??곕쾲??臾몄옄??1媛?
     * @return  ?좏슚???대??곕쾲???뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatCell(String cellNumber) {

	 String temp1;
	 String temp2;
	 String temp3;

	 String cell = cellNumber;
	 cell = cell.replace("-", "");

	 if(cell.length() < 10 || cell.length() > 11  || cell.charAt(0) != '0') {
		return false;
	}

	 if(cell.length() == 10){	//?꾩껜 10?먮━ ?대???踰덊샇??寃쎌슦
		 temp1 = cell.substring(0,3);
		 temp2 = cell.substring(3,6);
		 temp3 = cell.substring(6,10);
	 }else{		//?꾩껜 11?먮━ ?대???踰덊샇??寃쎌슦
		 temp1 = cell.substring(0,3);
		 temp2 = cell.substring(3,7);
		 temp3 = cell.substring(7,11);
	 }

	 return checkFormatCell(temp1, temp2, temp3);
    }

    /**
     * <p> ?대찓?쇱쓽  ?? ??臾몄옄??2媛??낅젰 諛쏆븘 ?좎슂???대찓?쇳삎?앹씤吏 寃??</p>
     *
     *
     * @param   ?대찓??臾몄옄??(2媛?
     * @return  ?좏슚???대찓???뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatMail(String mail1, String mail2) {

	 int count = 0;

	 for(int i = 0; i < mail1.length(); i++){
		 if(mail1.charAt(i) <= 'z' && mail1.charAt(i) >= 'a') {
			continue;
		} else if(mail1.charAt(i) <= 'Z' && mail1.charAt(i) >= 'A') {
			continue;
		} else if(mail1.charAt(i) <= '9' && mail1.charAt(i) >= '0') {
			continue;
		} else if(mail1.charAt(i) == '-' && mail1.charAt(i) == '_') {
			continue;
		} else {
			return false;
		}
	 }	// ?좏슚??臾몄옄, ?レ옄?몄? 泥댄겕

	 for(int i = 0; i < mail2.length(); i++){
		 if(mail2.charAt(i) <= 'z' && mail2.charAt(i) >= 'a') {
			continue;
		} else if(mail2.charAt(i) == '.'){ count++;  continue;} else {
			return false;
		}
	 }	// 硫붿씪 二쇱냼???뺤떇 泥댄겕(xxx.xxx ?뺥깭)

	 if(count == 1) {
		return true;
	} else {
		return false;
	}

    }

    /**
     * <p> ?대찓?쇱쓽 ?꾩껜臾몄옄??1媛??낅젰 諛쏆븘 ?좎슂???대찓?쇳삎?앹씤吏 寃??</p>
     *
     *
     * @param   ?대찓??臾몄옄??(1媛?
     * @return  ?좏슚???대찓???뺤떇?몄? ?щ? (True/False)
     */
    public static boolean checkFormatMail(String mail) {

	 String[] temp = mail.split("@");	// '@' 瑜?湲곗젏?쇰줈 ?? ??臾몄옄??援щ텇

	 if(temp.length == 2) {
		return checkFormatMail(temp[0], temp[1]);
	} else {
		return false;
	}
    }

}
