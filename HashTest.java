
import java.security.MessageDigest;
import java.util.Base64;

public class HashTest {
    public static void main(String[] args) throws Exception {
        String id_webmaster = "webmaster";
        String id_test1 = "TEST1";
        String password = "rhdxhd12";

        String target_webmaster = "78gXjfDDMzepOP4QTiFMRFOT/msFgKkHIgGOU95PT94=";
        String target_test1 = "raHLBnHFcunwNzcDcfad4PhD11hHgXSUr7fc1Jk9uoQ=";

        System.out.println("Testing password: " + password);
        System.out.println("Target (webmaster): " + target_webmaster);
        System.out.println("Target (TEST1): " + target_test1);

        System.out.println("\n--- Testing against webmaster ---");
        runChecks(id_webmaster, password, target_webmaster);

        System.out.println("\n--- Testing against TEST1 ---");
        runChecks(id_test1, password, target_test1);
    }

    static void runChecks(String id, String password, String target) {
        check(id, password, target, "id + password", (i, p) -> {
            MessageDigest m = MessageDigest.getInstance("SHA-256");
            m.update(i.getBytes());
            return m.digest(p.getBytes());
        });

        check(id, password, target, "password + id", (i, p) -> {
            MessageDigest m = MessageDigest.getInstance("SHA-256");
            m.update(p.getBytes());
            return m.digest(i.getBytes());
        });

        check(id, password, target, "password only", (i, p) -> {
            MessageDigest m = MessageDigest.getInstance("SHA-256");
            return m.digest(p.getBytes());
        });
    }

    interface Hasher {
        byte[] hash(String id, String password) throws Exception;
    }

    static void check(String id, String password, String target, String name, Hasher hasher) {
        try {
            byte[] hash = hasher.hash(id, password);
            String encoded = Base64.getEncoder().encodeToString(hash);
            System.out.println(name + ": " + encoded);
            if (encoded.equals(target)) {
                System.out.println("MATCH FOUND! Pattern: " + name);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
