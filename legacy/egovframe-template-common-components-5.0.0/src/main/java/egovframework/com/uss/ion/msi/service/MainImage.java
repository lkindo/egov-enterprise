/**
 * 媛쒖슂
 * - 硫붿씤?붾㈃?대?吏?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붿씤?붾㈃?대?吏???쇰젴踰덊샇, ?대?吏紐? 留곹겕URL, ?대?吏?ㅻ챸, 諛섏쁺?щ? ??ぉ??愿由ы븳??
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:57
 */

package egovframework.com.uss.ion.msi.service;

import egovframework.com.cmm.ComDefaultVO;

public class MainImage extends ComDefaultVO {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?대?吏 ID
	 */
	private String imageId;
	/**
	 * ?대?吏紐?
	 */	
	private String imageNm;
	/**
	 * 硫붿씤 ?대?吏
	 */	
	private String image;
	/**
	 * 硫붿씤 ?대?吏 ?뚯씪
	 */	
	private String imageFile;
	/**
	 * ?대?吏 ?ㅻ챸
	 */	
	private String imageDc;
	/**
	 * 諛섏쁺?щ?
	 */
	private String reflctAt;
	/**
	 * ?ъ슜??ID
	 */
	private String userId;
	/**
	 * ?깅줉?쇱옄
	 */
	private String regDate;
	/**
	 * ?뚯씪泥⑤??щ?
	 */
	private boolean isAtchFile;
	
	/**
	 * @return the imageId
	 */
	public String getImageId() {
		return imageId;
	}
	/**
	 * @param imageId the imageId to set
	 */
	public void setImageId(String imageId) {
		this.imageId = imageId;
	}
	/**
	 * @return the imageNm
	 */
	public String getImageNm() {
		return imageNm;
	}
	/**
	 * @param imageNm the imageNm to set
	 */
	public void setImageNm(String imageNm) {
		this.imageNm = imageNm;
	}
	/**
	 * @return the image
	 */
	public String getImage() {
		return image;
	}
	/**
	 * @param image the image to set
	 */
	public void setImage(String image) {
		this.image = image;
	}
	/**
	 * @return the imageFile
	 */
	public String getImageFile() {
		return imageFile;
	}
	/**
	 * @param imageFile the imageFile to set
	 */
	public void setImageFile(String imageFile) {
		this.imageFile = imageFile;
	}
	/**
	 * @return the imageDc
	 */
	public String getImageDc() {
		return imageDc;
	}
	/**
	 * @param imageDc the imageDc to set
	 */
	public void setImageDc(String imageDc) {
		this.imageDc = imageDc;
	}
	/**
	 * @return the reflctAt
	 */
	public String getReflctAt() {
		return reflctAt;
	}
	/**
	 * @param reflctAt the reflctAt to set
	 */
	public void setReflctAt(String reflctAt) {
		this.reflctAt = reflctAt;
	}
	/**
	 * @return the userId
	 */
	public String getUserId() {
		return userId;
	}
	/**
	 * @param userId the userId to set
	 */
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * @return the regDate
	 */
	public String getRegDate() {
		return regDate;
	}
	/**
	 * @param regDate the regDate to set
	 */
	public void setRegDate(String regDate) {
		this.regDate = regDate;
	}
	/**
	 * @return the isAtchFile
	 */
	public boolean isAtchFile() {
		return isAtchFile;
	}
	/**
	 * @param isAtchFile the isAtchFile to set
	 */
	public void setAtchFile(boolean isAtchFile) {
		this.isAtchFile = isAtchFile;
	}

	
}
