
import java.security.MessageDigest;
import java.util.Base64;

public class SqlGenerator {
    public static void main(String[] args) throws Exception {
        printHash("webmaster", "1");
        printHash("TEST1", "1");
        printHash("USER", "1");
        printHash("ENTERPRISE", "1");
    }

    static void printHash(String id, String password) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(id.getBytes());
        byte[] hashValue = md.digest(password.getBytes());
        String encoded = Base64.getEncoder().encodeToString(hashValue);
        System.out.println(id + " : " + encoded);
    }
}
