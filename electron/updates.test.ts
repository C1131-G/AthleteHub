import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { describeUpdateError } from "./ipc/update-error.cjs";

/**
 * The message this produces is rendered verbatim on the Settings page, so the
 * thing worth pinning is what it must never contain: electron-updater hands
 * back the entire HTTP failure, headers and `Set-Cookie` included.
 */
const GITHUB_404 = `404 "method: GET url: https://github.com/owner/repo/releases.atom\\n\\nPlease double check that your authentication token is correct.
Response: "content-security-policy": "default-src 'none'; img-src 'self' data:;", "content-type": "text/plain; charset=utf-8",
"set-cookie": "_gh_sess=OzjXXtna5vGSHjKWOfZmUKLdo7DWFBhOlkLcLizQVmyBDcWDYCUZ8mudclyjKtL0JldtWH0OyDRPpjRwZapd3eyeluX5OtHkmqbSUnQ; path=/; HttpOnly; secure; SameSite=Lax", "_octo=GH1.1.1183446671.1789102895;"`;

bunDescribe("describeUpdateError", () => {
  bunTest("reduces a GitHub 404 dump to one sentence", () => {
    bunExpect(describeUpdateError(new Error(GITHUB_404))).toBe(
      "No published release was found to update from."
    );
  });

  bunTest("never leaks headers, cookies or URLs from the raw failure", () => {
    const message = describeUpdateError(new Error(GITHUB_404));
    bunExpect(message).not.toContain("_gh_sess");
    bunExpect(message).not.toContain("set-cookie");
    bunExpect(message).not.toContain("https://");
    bunExpect(message.length).toBeLessThan(120);
  });

  bunTest("distinguishes an unreachable server from a missing release", () => {
    bunExpect(
      describeUpdateError(new Error("getaddrinfo ENOTFOUND github.com"))
    ).toBe("Could not reach the update server. Check your connection.");
  });

  bunTest("falls back to a generic sentence for anything unrecognised", () => {
    bunExpect(describeUpdateError(new Error("something odd"))).toBe(
      "Could not check for updates."
    );
    bunExpect(describeUpdateError()).toBe("Could not check for updates.");
  });
});
